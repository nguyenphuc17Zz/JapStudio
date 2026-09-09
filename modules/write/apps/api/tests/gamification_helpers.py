"""Shared builders for Phase 7 gamification service tests.

Follows the pattern of test_learning_planner.py: services are built with a
ScriptedAIProvider so each test controls exactly what the AI returns.
"""

from app.core.config import Settings
from app.providers.ai.router import AIRouter
from app.repositories import (
    DailyGoalRepository,
    DailyMissionRepository,
    ExerciseAttemptRepository,
    LearnerProfileRepository,
    LearningSessionRepository,
    MilestoneRepository,
    UserStreakRepository,
    VocabularyDiscoveryRepository,
    XPEventRepository,
)
from app.services.ai_service import AIService
from app.services.gamification_service import GamificationService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.mission_service import MissionService
from sqlalchemy.ext.asyncio import AsyncSession

from scripted_provider import ScriptedAIProvider


def _ai_service(provider: ScriptedAIProvider | None, settings: Settings | None) -> AIService:
    router = AIRouter(
        providers={"fake": lambda: provider or ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    return AIService(ai_router=router, settings=settings)


def build_profile_service(
    session: AsyncSession,
    provider: ScriptedAIProvider | None = None,
    settings: Settings | None = None,
) -> LearnerProfileService:
    return LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(ExerciseAttemptRepository(session), settings),
        ai_service=_ai_service(provider, settings),
        settings=settings,
    )


def build_mission_service(
    session: AsyncSession,
    provider: ScriptedAIProvider | None = None,
    settings: Settings | None = None,
) -> MissionService:
    return MissionService(
        mission_repository=DailyMissionRepository(session),
        profile_service=build_profile_service(session, provider, settings),
        ai_service=_ai_service(provider, settings),
        settings=settings,
    )


def build_gamification_service(
    session: AsyncSession,
    provider: ScriptedAIProvider | None = None,
    settings: Settings | None = None,
) -> GamificationService:
    ai = _ai_service(provider, settings)
    return GamificationService(
        xp_repository=XPEventRepository(session),
        streak_repository=UserStreakRepository(session),
        goal_repository=DailyGoalRepository(session),
        milestone_repository=MilestoneRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        session_repository=LearningSessionRepository(session),
        missions=build_mission_service(session, provider, settings),
        profile_service=build_profile_service(session, provider, settings),
        ai_service=ai,
        settings=settings,
    )
