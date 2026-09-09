"""Activity summary & retention stats (Phase 14)."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.curriculum import ObjectiveProgress
from app.models.exercise import ExerciseAttempt, WritingFeedback
from app.models.learner_profile import LearningRecommendation
from app.models.memory import LearnerMemory
from app.models.simulation import SimulationSession
from app.models.vocabulary import VocabularyDiscovery
from app.models.writing import WritingScenario, WritingSubmission
from app.services.analytics.common import resolve_window


class AnalyticsSummaryService:
    """Aggregate product activity for a window."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()

    async def compute(self, window: str) -> dict:
        resolved = resolve_window(window)
        active_days = await self._session.scalar(
            select(func.count(func.distinct(func.date(ExerciseAttempt.created_at)))).where(
                ExerciseAttempt.created_at >= resolved.start,
                ExerciseAttempt.created_at <= resolved.end,
            )
        )
        return {
            "window": window,
            "active_days": active_days or 0,
            "total_attempts": await self._count(ExerciseAttempt, resolved),
            "completed_exercises": await self._completed_exercises(resolved),
            "evaluation_attempts": await self._count(WritingFeedback, resolved),
            "discourse_submissions": await self._count(WritingSubmission, resolved),
            "simulation_sessions": await self._count(SimulationSession, resolved),
            "discoveries": await self._count(VocabularyDiscovery, resolved),
            "scenarios_created": await self._count(WritingScenario, resolved),
            "recommendations_completed": await self._recommendations_completed(resolved),
            "memories_created": await self._count(LearnerMemory, resolved),
            "objectives_completed": await self._objectives_completed(resolved),
        }

    async def _count(self, model, resolved) -> int:
        return (
            await self._session.scalar(
                select(func.count())
                .select_from(model)
                .where(
                    model.created_at >= resolved.start,
                    model.created_at <= resolved.end,
                )
            )
            or 0
        )

    async def _completed_exercises(self, resolved) -> int:
        return (
            await self._session.scalar(
                select(func.count(func.distinct(ExerciseAttempt.exercise_id))).where(
                    ExerciseAttempt.created_at >= resolved.start,
                    ExerciseAttempt.created_at <= resolved.end,
                )
            )
            or 0
        )

    async def _recommendations_completed(self, resolved) -> int:
        return (
            await self._session.scalar(
                select(func.count())
                .select_from(LearningRecommendation)
                .where(
                    LearningRecommendation.status == "completed",
                    LearningRecommendation.created_at >= resolved.start,
                    LearningRecommendation.created_at <= resolved.end,
                )
            )
            or 0
        )

    async def _objectives_completed(self, resolved) -> int:
        return (
            await self._session.scalar(
                select(func.count())
                .select_from(ObjectiveProgress)
                .where(
                    ObjectiveProgress.completed_at.is_not(None),
                    ObjectiveProgress.completed_at >= resolved.start,
                    ObjectiveProgress.completed_at <= resolved.end,
                )
            )
            or 0
        )
