"""Interactive simulation endpoints (Phase 10).

- POST /api/v1/simulations                  -> create a session (AI plan + hidden exercise)
- GET  /api/v1/simulations                  -> session history
- GET  /api/v1/simulations/{id}             -> session state
- POST /api/v1/simulations/{id}/turns       -> submit a user turn
- GET  /api/v1/simulations/{id}/summary     -> session summary (generated once)
- POST /api/v1/simulations/{id}/coach       -> coaching Q&A
- POST /api/v1/simulations/{id}/turns/{turn_id}/explain -> turn explanation

Simulation sessions reuse the Phase 4/5 evaluation pipeline on a hidden
exercise; every failure is isolated so the conversation never breaks.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.gamification import build_gamification_service, build_profile_service
from app.core.config import Settings
from app.core.errors import AppError, NotFoundError
from app.db.session import get_session
from app.repositories import (
    ChallengeAttemptRepository,
    ChallengeRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    LearnerMemoryRepository,
    LearnerProfileRepository,
    SimulationEvaluationRepository,
    SimulationSessionRepository,
    SimulationTurnRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
    WritingScenarioRepository,
)
from app.schemas.simulation import (
    SimulationCoachRequest,
    SimulationCoachResponse,
    SimulationCreateRequest,
    SimulationExplainResponse,
    SimulationHistoryResponse,
    SimulationSessionResponse,
    SimulationSummaryResponse,
    SimulationTurnRequest,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.challenge_service import ChallengeService
from app.services.evaluation_service import EvaluationService
from app.services.memory_service import MemoryService
from app.services.simulation_service import SimulationService
from app.services.vocabulary_service import VocabularyService

logger = logging.getLogger("app.simulations")

router = APIRouter(tags=["simulations"])

DbSession = Annotated[AsyncSession, Depends(get_session)]

ANONYMOUS_USER_ID: str | None = None


def build_simulation_service(session: AsyncSession, settings: Settings) -> SimulationService:
    ai_service = AIService(settings=settings)
    return SimulationService(
        evaluation_service=EvaluationService(
            ai_service=ai_service,
            attempt_repository=ExerciseAttemptRepository(session),
            feedback_repository=WritingFeedbackRepository(session),
            settings=settings,
        ),
        ai_service=ai_service,
        scenario_repository=WritingScenarioRepository(session),
        session_repository=SimulationSessionRepository(session),
        turn_repository=SimulationTurnRepository(session),
        evaluation_repository=SimulationEvaluationRepository(session),
        exercise_repository=ExerciseRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        vocabulary_service=VocabularyService(
            ai_service=ai_service,
            entry_repository=VocabularyEntryRepository(session),
            user_repository=UserVocabularyRepository(session),
            discovery_repository=VocabularyDiscoveryRepository(session),
            attempt_repository=ExerciseAttemptRepository(session),
            feedback_repository=WritingFeedbackRepository(session),
            exercise_repository=ExerciseRepository(session),
            settings=settings,
        ),
        gamification_service=build_gamification_service(session, settings),
        memory_service=MemoryService(
            repository=LearnerMemoryRepository(session),
            profile_repository=LearnerProfileRepository(session),
            ai_service=ai_service,
            settings=settings,
        ),
        challenge_service=ChallengeService(
            challenge_repository=ChallengeRepository(session),
            challenge_attempt_repository=ChallengeAttemptRepository(session),
            exercise_repository=ExerciseRepository(session),
            attempt_repository=ExerciseAttemptRepository(session),
            feedback_repository=WritingFeedbackRepository(session),
            vocabulary_repository=UserVocabularyRepository(session),
            profile_service=build_profile_service(session, settings),
            gamification=build_gamification_service(session, settings),
            ai_service=ai_service,
            settings=settings,
        ),
        settings=settings,
    )


def _feature_gate(settings: Settings) -> None:
    if not settings.ai_simulation_enabled:
        raise AppError(
            "Tính năng hội thoại mô phỏng hiện đang tắt trong cấu hình máy chủ.",
            status_code=400,
            code="feature_disabled",
        )


def _session_not_found(session_id: str) -> NotFoundError:
    return NotFoundError(f"Session mô phỏng '{session_id}' không tồn tại")


@router.post("", response_model=SimulationSessionResponse, status_code=201)
async def create_session(
    session: DbSession,
    payload: SimulationCreateRequest,
) -> SimulationSessionResponse:
    settings = await AIConfigService().get_effective_settings(session)
    _feature_gate(settings)
    objective_id = None
    objective_context = ""
    if settings.ai_curriculum_enabled:
        try:
            from app.services.curriculum_service import CurriculumService

            context = await CurriculumService(session, settings).get_objective_context(
                ANONYMOUS_USER_ID
            )
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
            logger.exception("curriculum context failed (simulation is unaffected)")
    return await build_simulation_service(session, settings).create(
        ANONYMOUS_USER_ID,
        payload.scenario_id,
        payload.mode,
        objective_id=objective_id,
        objective_context=objective_context,
        provider=payload.provider,
        model=payload.model,
    )


@router.get("", response_model=SimulationHistoryResponse)
async def list_sessions(
    session: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=50),
) -> SimulationHistoryResponse:
    settings = await AIConfigService().get_effective_settings(session)
    return await build_simulation_service(session, settings).list(
        ANONYMOUS_USER_ID, skip=skip, limit=limit
    )


@router.get("/{session_id}", response_model=SimulationSessionResponse)
async def get_session(
    session: DbSession,
    session_id: str,
) -> SimulationSessionResponse:
    settings = await AIConfigService().get_effective_settings(session)
    result = await build_simulation_service(session, settings).get(ANONYMOUS_USER_ID, session_id)
    if result is None:
        raise _session_not_found(session_id)
    return result


@router.post("/{session_id}/turns", response_model=SimulationSessionResponse)
async def submit_turn(
    session: DbSession,
    session_id: str,
    payload: SimulationTurnRequest,
) -> SimulationSessionResponse:
    settings = await AIConfigService().get_effective_settings(session)
    return await build_simulation_service(session, settings).submit_turn(
        ANONYMOUS_USER_ID,
        session_id,
        payload.text,
        end_early=payload.end_early,
        provider=payload.provider,
        model=payload.model,
    )


@router.get("/{session_id}/summary", response_model=SimulationSummaryResponse)
async def get_summary(
    session: DbSession,
    session_id: str,
) -> SimulationSummaryResponse:
    settings = await AIConfigService().get_effective_settings(session)
    result = await build_simulation_service(session, settings).summary(
        ANONYMOUS_USER_ID, session_id
    )
    if result is None:
        raise _session_not_found(session_id)
    return result


@router.post("/{session_id}/coach", response_model=SimulationCoachResponse)
async def ask_coach(
    session: DbSession,
    session_id: str,
    payload: SimulationCoachRequest,
) -> SimulationCoachResponse:
    settings = await AIConfigService().get_effective_settings(session)
    return await build_simulation_service(session, settings).coach(
        ANONYMOUS_USER_ID,
        session_id,
        payload.question,
        provider=payload.provider,
        model=payload.model,
    )


@router.post("/{session_id}/turns/{turn_id}/explain", response_model=SimulationExplainResponse)
async def explain_turn(
    session: DbSession,
    session_id: str,
    turn_id: str,
) -> SimulationExplainResponse:
    settings = await AIConfigService().get_effective_settings(session)
    return await build_simulation_service(session, settings).explain_turn(
        ANONYMOUS_USER_ID, session_id, turn_id
    )
