"""Gamification endpoints (Phase 7).

- GET  /api/v1/gamification/summary      -> level, XP, streaks, today's goal
- GET  /api/v1/gamification/xp/history   -> paginated XP event ledger
- GET  /api/v1/gamification/today        -> dashboard payload (mission + focus)
- GET  /api/v1/gamification/mission      -> today's active mission (lazy generate)
- POST /api/v1/gamification/mission/regenerate -> archive + replace mission
- GET  /api/v1/gamification/milestones   -> achieved milestones (read-only)

All routes operate on the anonymous learner (user_id is NULL) until
authentication exists. Gamification never breaks the writing flow.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.db.session import get_session
from app.repositories import (
    DailyGoalRepository,
    DailyMissionRepository,
    DiscourseEvaluationRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    LearnerMemoryRepository,
    LearnerProfileRepository,
    LearningRecommendationRepository,
    LearningSessionRepository,
    MilestoneRepository,
    MistakePatternRepository,
    UserStreakRepository,
    VocabularyDiscoveryRepository,
    XPEventRepository,
)
from app.schemas.gamification import (
    DailyMissionResponse,
    GamificationSummary,
    GamificationTodayResponse,
    MilestoneItem,
    MilestoneListResponse,
    XpHistoryResponse,
)
from app.services.adaptive_learning_service import AdaptiveLearningService
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.gamification_service import GamificationService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.learning_planner_service import LearningPlannerService
from app.services.memory_service import MemoryService
from app.services.mission_service import MissionService
from app.services.mistake_clustering_service import MistakeClusteringService

logger = logging.getLogger("app.gamification")

router = APIRouter(tags=["gamification"])

DbSession = Annotated[AsyncSession, Depends(get_session)]

ANONYMOUS_USER_ID: str | None = None


async def _active_objective_id(session: AsyncSession, settings: Settings) -> str | None:
    """Active curriculum objective id (isolated: gamification never breaks)."""
    if not settings.ai_curriculum_enabled:
        return None
    try:
        from app.services.curriculum_service import CurriculumService

        context = await CurriculumService(session, settings).get_objective_context(
            ANONYMOUS_USER_ID
        )
        return context["objective_id"] if context is not None else None
    except Exception:
        logger.exception("curriculum context failed (gamification is unaffected)")
        return None


def build_profile_service(session: AsyncSession, settings: Settings) -> LearnerProfileService:
    return LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(
            ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
        ),
        ai_service=AIService(settings=settings),
        settings=settings,
    )


def build_mission_service(session: AsyncSession, settings: Settings) -> MissionService:
    return MissionService(
        mission_repository=DailyMissionRepository(session),
        profile_service=build_profile_service(session, settings),
        ai_service=AIService(settings=settings),
        settings=settings,
    )


def build_gamification_service(session: AsyncSession, settings: Settings) -> GamificationService:
    return GamificationService(
        xp_repository=XPEventRepository(session),
        streak_repository=UserStreakRepository(session),
        goal_repository=DailyGoalRepository(session),
        milestone_repository=MilestoneRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        session_repository=LearningSessionRepository(session),
        missions=build_mission_service(session, settings),
        profile_service=build_profile_service(session, settings),
        ai_service=AIService(settings=settings),
        settings=settings,
    )


def build_adaptive_service(session: AsyncSession, settings: Settings) -> AdaptiveLearningService:
    ai_service = AIService(settings=settings)
    return AdaptiveLearningService(
        profile_service=build_profile_service(session, settings),
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
    )


@router.get("/summary", response_model=GamificationSummary)
async def get_summary(session: DbSession) -> GamificationSummary:
    settings = await AIConfigService().get_effective_settings(session)
    payload = await build_gamification_service(session, settings).summary(ANONYMOUS_USER_ID)
    return GamificationSummary(**payload)


@router.get("/xp/history", response_model=XpHistoryResponse)
async def get_xp_history(
    session: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> XpHistoryResponse:
    settings = await AIConfigService().get_effective_settings(session)
    items, total = await build_gamification_service(session, settings).xp_history(
        ANONYMOUS_USER_ID, skip=skip, limit=limit
    )
    return XpHistoryResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/today", response_model=GamificationTodayResponse)
async def get_today(session: DbSession) -> GamificationTodayResponse:
    settings = await AIConfigService().get_effective_settings(session)
    service = build_gamification_service(session, settings)
    adaptive = await build_adaptive_service(session, settings).get_today(ANONYMOUS_USER_ID)
    payload = await service.today_payload(ANONYMOUS_USER_ID, adaptive_payload=adaptive)
    return GamificationTodayResponse(**payload)


@router.get("/mission", response_model=DailyMissionResponse | None)
async def get_mission(session: DbSession) -> DailyMissionResponse | None:
    settings = await AIConfigService().get_effective_settings(session)
    objective_id = await _active_objective_id(session, settings)
    mission = await build_mission_service(session, settings).get_or_generate(
        ANONYMOUS_USER_ID, objective_id=objective_id
    )
    if mission is None:
        return None
    return DailyMissionResponse(
        **{
            "id": mission.id,
            "mission_type": mission.mission_type,
            "title": mission.title,
            "description": mission.description,
            "target_count": mission.target_count,
            "completed_count": mission.completed_count,
            "completed": mission.completed_at is not None,
            "focus_skills": mission.focus_skills,
            "topic": mission.topic,
            "register": mission.register,
            "difficulty": mission.difficulty,
            "reason": mission.reason,
            "status": mission.status,
            "provider": mission.provider,
            "model": mission.model,
            "prompt_version": mission.prompt_version,
            "created_at": mission.created_at,
        }
    )


@router.post("/mission/regenerate", response_model=DailyMissionResponse | None)
async def regenerate_mission(session: DbSession) -> DailyMissionResponse | None:
    settings = await AIConfigService().get_effective_settings(session)
    service = build_mission_service(session, settings)
    objective_id = await _active_objective_id(session, settings)
    mission = await service.regenerate(ANONYMOUS_USER_ID, objective_id=objective_id)
    if mission is None:
        return None
    return DailyMissionResponse(
        **{
            "id": mission.id,
            "mission_type": mission.mission_type,
            "title": mission.title,
            "description": mission.description,
            "target_count": mission.target_count,
            "completed_count": mission.completed_count,
            "completed": mission.completed_at is not None,
            "focus_skills": mission.focus_skills,
            "topic": mission.topic,
            "register": mission.register,
            "difficulty": mission.difficulty,
            "reason": mission.reason,
            "status": mission.status,
            "provider": mission.provider,
            "model": mission.model,
            "prompt_version": mission.prompt_version,
            "created_at": mission.created_at,
        }
    )


@router.get("/milestones", response_model=MilestoneListResponse)
async def get_milestones(session: DbSession) -> MilestoneListResponse:
    settings = await AIConfigService().get_effective_settings(session)
    items = await build_gamification_service(session, settings).milestones(ANONYMOUS_USER_ID)
    return MilestoneListResponse(items=[MilestoneItem(**item) for item in items])
