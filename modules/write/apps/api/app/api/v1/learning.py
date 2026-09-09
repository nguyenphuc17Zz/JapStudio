"""Adaptive learning endpoints (Phase 6).

- GET/PUT /api/v1/learning/profile       -> profile + editable preferences
- POST /api/v1/learning/profile/refresh  -> force AI synthesis
- GET  /api/v1/learning/today            -> dashboard payload
- POST /api/v1/learning/next             -> build next recommendation (generates exercise)
- GET  /api/v1/learning/recommendation   -> open recommendation
- GET  /api/v1/learning/history          -> paginated recommendation history
- GET/POST /api/v1/learning/journey ...  -> curriculum journey engine (Phase 13)

All routes operate on the anonymous learner (user_id is NULL) until
authentication exists. Learner intelligence never blocks the writing flow.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.journey import router as journey_router
from app.core.config import Settings
from app.db.session import get_session
from app.repositories import (
    DiscourseEvaluationRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    LearnerMemoryRepository,
    LearnerProfileRepository,
    LearningRecommendationRepository,
    LearningSessionRepository,
    MistakePatternRepository,
)
from app.schemas.learning import (
    LearnerProfileResponse,
    LearnerProfileUpdate,
    LearningHistoryResponse,
    LearningNextRequest,
    LearningNextResponse,
    LearningRecommendationResponse,
    LearningTodayResponse,
)
from app.services.adaptive_learning_service import AdaptiveLearningService
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.learning_planner_service import LearningPlannerService
from app.services.memory_service import MemoryService
from app.services.mistake_clustering_service import MistakeClusteringService

router = APIRouter(tags=["learning"])

router.include_router(journey_router)

logger = logging.getLogger("app.learning")

DbSession = Annotated[AsyncSession, Depends(get_session)]

ANONYMOUS_USER_ID: str | None = None


def _build_profile_service(session: AsyncSession, settings: Settings) -> LearnerProfileService:
    return LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(
            ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
        ),
        ai_service=AIService(settings=settings),
        settings=settings,
    )


from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.services.writing_intelligence_service import WritingIntelligenceService


def _build_adaptive_service(session: AsyncSession, settings: Settings) -> AdaptiveLearningService:
    ai_service = AIService(settings=settings)
    writing_service = WritingIntelligenceService(
        weakness_repository=WritingWeaknessRepository(session),
        settings=settings,
        ai_service=ai_service,
    )
    return AdaptiveLearningService(
        profile_service=_build_profile_service(session, settings),
        planner=LearningPlannerService(ai_service, settings),
        mistake_service=MistakeClusteringService(
            MistakePatternRepository(session), ai_service, settings
        ),
        evidence_service=LearnerEvidenceService(
            ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
        ),
        recommendation_repository=LearningRecommendationRepository(session),
        session_repository=LearningSessionRepository(session),
        exercise_repository=ExerciseRepository(session),
        ai_service=ai_service,
        settings=settings,
        memory_service=MemoryService(
            repository=LearnerMemoryRepository(session),
            profile_repository=LearnerProfileRepository(session),
            ai_service=ai_service,
            settings=settings,
        ),
        writing_intelligence_service=writing_service,
    )



def _profile_response(profile: object) -> LearnerProfileResponse:
    state = profile.adaptive_state or {}
    return LearnerProfileResponse(
        id=profile.id,
        goal=profile.goal,
        goal_type=profile.goal_type,
        target_jlpt=profile.target_jlpt,
        daily_target=profile.daily_target,
        preferred_registers=profile.preferred_registers,
        preferred_topics=profile.preferred_topics,
        native_language=profile.native_language,
        target_level=profile.target_level,
        adaptive_state=profile.adaptive_state,
        evidence_count=state.get("evidence_count", 0),
        profile_version=profile.profile_version,
        streak_enabled=(profile.preferences or {}).get("streak_enabled", True),
        memory_enabled=(profile.preferences or {}).get("memory_enabled", True),
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/profile", response_model=LearnerProfileResponse)
async def get_profile(session: DbSession) -> LearnerProfileResponse:
    settings = await AIConfigService().get_effective_settings(session)
    profile = await _build_profile_service(session, settings).get_or_create(ANONYMOUS_USER_ID)
    return _profile_response(profile)


@router.put("/profile", response_model=LearnerProfileResponse)
async def update_profile(
    session: DbSession,
    payload: LearnerProfileUpdate,
) -> LearnerProfileResponse:
    settings = await AIConfigService().get_effective_settings(session)
    previous = await _build_profile_service(session, settings).get_or_create(ANONYMOUS_USER_ID)
    profile = await _build_profile_service(session, settings).update_preferences(
        ANONYMOUS_USER_ID, payload.model_dump()
    )
    if (
        settings.ai_curriculum_enabled
        and payload.goal_type is not None
        and payload.goal_type != previous.goal_type
    ):
        try:
            from app.services.curriculum_service import CurriculumService

            await CurriculumService(session, settings).create_journey(
                ANONYMOUS_USER_ID,
                goal_type=payload.goal_type,
                goal=profile.goal,
                force_regenerate=True,
            )
        except Exception:
            logger.exception(
                "journey regeneration after goal change failed (profile update is unaffected)"
            )
    return _profile_response(profile)


@router.post("/profile/refresh", response_model=LearnerProfileResponse)
async def refresh_profile(session: DbSession) -> LearnerProfileResponse:
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_profile_service(session, settings)
    await service.synthesize(ANONYMOUS_USER_ID)
    profile = await service.get_or_create(ANONYMOUS_USER_ID)
    return _profile_response(profile)


@router.get("/today", response_model=LearningTodayResponse)
async def get_today(session: DbSession) -> LearningTodayResponse:
    settings = await AIConfigService().get_effective_settings(session)
    payload = await _build_adaptive_service(session, settings).get_today(ANONYMOUS_USER_ID)
    return LearningTodayResponse(**payload)


@router.post("/next", response_model=LearningNextResponse)
async def next_recommendation(
    session: DbSession,
    payload: LearningNextRequest | None = None,
) -> LearningNextResponse:
    settings = await AIConfigService().get_effective_settings(session)
    if payload and payload.provider:
        settings.ai_default_provider = payload.provider
    if payload and payload.model:
        settings.ai_default_model = payload.model
    service = _build_adaptive_service(session, settings)
    objective_context = None
    if settings.ai_curriculum_enabled:
        try:
            from app.services.curriculum_service import CurriculumService

            objective_context = await CurriculumService(session, settings).get_objective_context(
                ANONYMOUS_USER_ID
            )
        except Exception:
            logger.exception("curriculum objective context failed (recommendation is unaffected)")
    recommendation = await service.recommend_next(
        ANONYMOUS_USER_ID, objective_context=objective_context
    )
    payload_dict = await service._recommendation_payload(recommendation)
    return LearningNextResponse(**payload_dict)


@router.get("/recommendation", response_model=LearningRecommendationResponse | None)
async def get_recommendation(session: DbSession) -> LearningRecommendationResponse | None:
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_adaptive_service(session, settings)
    recommendation = await service.get_recommendation(ANONYMOUS_USER_ID)
    if recommendation is None:
        return None
    payload = await service._recommendation_payload(recommendation)
    return LearningRecommendationResponse(**payload)


@router.get("/history", response_model=LearningHistoryResponse)
async def list_history(
    session: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> LearningHistoryResponse:
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_adaptive_service(session, settings)
    recommendations, total = await service.history(ANONYMOUS_USER_ID, skip=skip, limit=limit)
    items = [
        LearningRecommendationResponse(**await service._recommendation_payload(recommendation))
        for recommendation in recommendations
    ]
    return LearningHistoryResponse(items=items, total=total, skip=skip, limit=limit)
