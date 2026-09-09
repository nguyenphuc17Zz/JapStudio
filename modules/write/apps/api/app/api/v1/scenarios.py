"""Writing-scenario endpoints (Phase 9) & Real-World Writing Missions (Phase 20).

- POST /api/v1/scenarios/generate                 -> persist a new scenario (AI)
- GET  /api/v1/scenarios/{scenario_id}            -> persisted scenario (no AI)
- POST /api/v1/scenarios/{scenario_id}/exercise   -> build the linked Exercise
- GET  /api/v1/scenarios/recent                   -> recently completed scenarios
- GET  /api/v1/scenarios/mission-taxonomy         -> categories, actions, modes, 10 dimensions
- POST /api/v1/scenarios/mission/generate         -> generate real-world writing mission
- POST /api/v1/scenarios/mission/evaluate         -> 10-dimensional mission evaluation
- POST /api/v1/scenarios/{scenario_id}/transition-simulation -> transition mission to interactive simulation
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError, NotFoundError
from app.db.session import get_session
from app.models import WritingScenario
from app.repositories import (
    ExerciseRepository,
    LearnerMemoryRepository,
    LearnerProfileRepository,
    SimulationSessionRepository,
    SimulationTurnRepository,
    WritingScenarioRepository,
)
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.schemas.exercise import ExerciseSchema
from app.schemas.real_world_mission import (
    MissionEvaluationRequest,
    MissionEvaluationResponse,
    MissionTaxonomyResponse,
    RealWorldMissionGenerateRequest,
    RealWorldMissionResponse,
    TransitionToSimulationRequest,
    TransitionToSimulationResponse,
)
from app.schemas.writing_scenario import (
    ScenarioGenerateRequest,
    ScenarioHistoryItem,
    ScenarioHistoryResponse,
    WritingScenarioResponse,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.exercise_generation_service import ExerciseGenerationService
from app.services.memory_service import MemoryService
from app.services.real_world_mission_service import RealWorldMissionService
from app.services.scenario_service import ScenarioService

logger = logging.getLogger("app.scenarios")

router = APIRouter(tags=["scenarios"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_ai_service(settings: Settings) -> AIService:
    return AIService(settings=settings)


def _build_scenario_service(session: AsyncSession, settings: Settings) -> ScenarioService:
    return ScenarioService(
        ai_service=_build_ai_service(settings),
        scenario_repository=WritingScenarioRepository(session),
        settings=settings,
    )


def _build_mission_service(session: AsyncSession, settings: Settings) -> RealWorldMissionService:
    return RealWorldMissionService(
        ai_service=_build_ai_service(settings),
        scenario_repository=WritingScenarioRepository(session),
        weakness_repository=WritingWeaknessRepository(session),
        profile_repository=LearnerProfileRepository(session),
        memory_repository=LearnerMemoryRepository(session),
        session_repository=SimulationSessionRepository(session),
        turn_repository=SimulationTurnRepository(session),
        settings=settings,
    )


def _build_exercise_generation_service(
    session: AsyncSession, settings: Settings
) -> ExerciseGenerationService:
    return ExerciseGenerationService(
        ai_service=_build_ai_service(settings),
        repository=ExerciseRepository(session),
        settings=settings,
    )


async def _get_scenario(session: AsyncSession, scenario_id: str) -> WritingScenario:
    scenario = await WritingScenarioRepository(session).get_for_user(None, scenario_id)
    if scenario is None:
        raise NotFoundError(f"Writing scenario '{scenario_id}' not found")
    return scenario


def _scenario_response(scenario: WritingScenario) -> WritingScenarioResponse:
    return WritingScenarioResponse(
        id=scenario.id,
        genre=scenario.genre,
        medium=scenario.medium,
        audience=scenario.audience,
        relationship=scenario.relationship,
        purpose=scenario.purpose,
        register=scenario.register,
        tone=scenario.tone,
        target_length=scenario.target_length,
        jlpt_level=scenario.jlpt_level,
        situation_vi=scenario.situation_vi,
        context_vi=scenario.context_vi,
        required_points=list(scenario.required_points or []),
        optional_points=list(scenario.optional_points or []),
        forbidden_patterns=list(scenario.forbidden_patterns or []),
        difficulty=scenario.difficulty,
        difficulty_metadata=dict(scenario.difficulty_metadata or {}),
        generation_metadata=scenario.generation_metadata,
        created_at=scenario.created_at,
    )


# -- Real-World Writing Mission Endpoints (Phase 20) -------------------------

@router.get("/mission-taxonomy", response_model=MissionTaxonomyResponse)
async def get_mission_taxonomy(
    session: DbSession,
) -> MissionTaxonomyResponse:
    """Returns the comprehensive real-world categories, actions, prompt modes, and 10 dimensions."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_mission_service(session, settings)
    return service.get_taxonomy()


@router.post("/mission/generate", response_model=RealWorldMissionResponse, status_code=201)
async def generate_real_world_mission(
    session: DbSession,
    payload: RealWorldMissionGenerateRequest | None = None,
) -> RealWorldMissionResponse:
    """Generates a practical writing mission grounded in learner level, goals and active weaknesses."""
    settings = await AIConfigService().get_effective_settings(session)
    if not settings.ai_scenario_enabled:
        raise AppError(
            "Tính năng viết theo tình huống hiện đang tắt trong cấu hình máy chủ.",
            status_code=400,
            code="feature_disabled",
        )
    service = _build_mission_service(session, settings)
    req = payload or RealWorldMissionGenerateRequest()
    return await service.generate_mission(None, req)


@router.post("/mission/evaluate", response_model=MissionEvaluationResponse)
async def evaluate_real_world_mission(
    session: DbSession,
    payload: MissionEvaluationRequest,
) -> MissionEvaluationResponse:
    """Evaluates a learner's Japanese response across 10 communicative & linguistic dimensions."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_mission_service(session, settings)
    return await service.evaluate_mission(None, payload)


@router.post("/{scenario_id}/transition-simulation", response_model=TransitionToSimulationResponse)
async def transition_mission_to_simulation(
    session: DbSession,
    scenario_id: str,
    payload: TransitionToSimulationRequest | None = None,
) -> TransitionToSimulationResponse:
    """Seamlessly transitions a mission into an interactive multi-turn simulation session."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_mission_service(session, settings)
    req = payload or TransitionToSimulationRequest(scenario_id=scenario_id)
    req.scenario_id = scenario_id
    return await service.transition_to_simulation(None, req)


# -- Scenario Studio Classic Endpoints (Phase 9) ------------------------------

@router.post("/generate", response_model=WritingScenarioResponse, status_code=201)
async def generate_scenario(
    session: DbSession,
    payload: ScenarioGenerateRequest | None = None,
) -> WritingScenarioResponse:
    settings = await AIConfigService().get_effective_settings(session)
    if not settings.ai_scenario_enabled:
        raise AppError(
            "Tính năng viết theo tình huống hiện đang tắt trong cấu hình máy chủ.",
            status_code=400,
            code="feature_disabled",
        )
    memory_service = MemoryService(
        repository=LearnerMemoryRepository(session),
        profile_repository=LearnerProfileRepository(session),
        ai_service=_build_ai_service(settings),
        settings=settings,
    )
    memory_block = await memory_service.context_builder().memory_block(None, "scenario")
    objective_id = None
    objective_context = ""
    if settings.ai_curriculum_enabled:
        try:
            from app.services.curriculum_service import CurriculumService

            context = await CurriculumService(session, settings).get_objective_context(None)
            if context is not None:
                objective_id = context["objective_id"]
                objective_context = (
                    f"Active curriculum objective: {context['objective_title']}\n"
                    f"Milestone: {context['milestone_title']}\n"
                    f"Target competencies: "
                    + ", ".join(context["competency_labels_vi"].values())
                    + "\nSuggested exercise modes: "
                    + ", ".join(context["suggested_modes"])
                )
        except Exception:
            logger.exception("curriculum context failed (scenario is unaffected)")
    scenario = await _build_scenario_service(session, settings).generate(
        None,
        payload,
        memory_block=memory_block,
        objective_id=objective_id,
        objective_context=objective_context,
    )
    return _scenario_response(scenario)


@router.get("/recent", response_model=ScenarioHistoryResponse)
async def recent_scenarios(
    session: DbSession,
    limit: int = Query(default=10, ge=1, le=50),
) -> ScenarioHistoryResponse:
    rows = await WritingScenarioRepository(session).list_recent_completed_for_user(None, limit)
    per_scenario: dict[str, ScenarioHistoryItem] = {}
    for scenario, attempt, _feedback in rows:
        item = per_scenario.get(scenario.id)
        if item is None:
            per_scenario[scenario.id] = ScenarioHistoryItem(
                scenario_id=scenario.id,
                genre=scenario.genre,
                medium=scenario.medium,
                audience=scenario.audience,
                purpose=scenario.purpose,
                register=scenario.register,
                attempt_count=0,
                last_attempt_at=attempt.created_at,
            )
        item = per_scenario[scenario.id]
        item.attempt_count += 1
        if attempt.created_at > item.last_attempt_at:
            item.last_attempt_at = attempt.created_at
    items = list(per_scenario.values())
    return ScenarioHistoryResponse(items=items, total=len(items))


@router.get("/{scenario_id}", response_model=WritingScenarioResponse)
async def get_scenario(
    session: DbSession,
    scenario_id: str,
) -> WritingScenarioResponse:
    scenario = await _get_scenario(session, scenario_id)
    return _scenario_response(scenario)


@router.post("/{scenario_id}/exercise", response_model=ExerciseSchema, status_code=201)
async def create_scenario_exercise(
    session: DbSession,
    scenario_id: str,
) -> ExerciseSchema:
    settings = await AIConfigService().get_effective_settings(session)
    if not settings.ai_scenario_enabled:
        raise AppError(
            "Tính năng viết theo tình huống hiện đang tắt trong cấu hình máy chủ.",
            status_code=400,
            code="feature_disabled",
        )
    scenario = await _get_scenario(session, scenario_id)
    service = _build_exercise_generation_service(session, settings)
    exercise = await service.generate_for_scenario(scenario)
    await session.commit()
    logger.info("scenario_exercise created scenario_id=%s exercise_id=%s", scenario.id, exercise.id)
    return ExerciseSchema.model_validate(exercise, from_attributes=True)
