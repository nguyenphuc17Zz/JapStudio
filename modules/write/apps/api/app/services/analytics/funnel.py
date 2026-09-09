"""Product funnel (Phase 14).

A deterministic conversion chain:
opened -> attempted -> evaluated -> discourse_submissions -> simulations
-> scenarios_created. Conversions are relative to the first stage.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.exercise import ExerciseAttempt, WritingFeedback
from app.models.simulation import SimulationSession
from app.models.vocabulary import VocabularyDiscovery
from app.models.writing import WritingScenario, WritingSubmission
from app.services.analytics.common import resolve_window, round2


class FunnelService:
    """Computes the product funnel for a window."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()

    async def compute(self, window: str) -> dict:
        resolved = resolve_window(window)
        from app.repositories.analytics import AnalyticsEventRepository
        from app.services.analytics.events import AnalyticsEventService

        events_repo = AnalyticsEventRepository(self._session)
        opened = await AnalyticsEventService(events_repo).count_opened(resolved.start, resolved.end)
        attempted = await self._count(ExerciseAttempt, resolved)
        evaluated = (
            await self._session.scalar(
                select(func.count())
                .select_from(ExerciseAttempt)
                .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
                .where(
                    ExerciseAttempt.created_at >= resolved.start,
                    ExerciseAttempt.created_at <= resolved.end,
                )
            )
            or 0
        )
        discourse_submissions = await self._count(WritingSubmission, resolved)
        simulations = await self._count(SimulationSession, resolved)
        scenarios = await self._count(WritingScenario, resolved)
        discoveries = await self._count(VocabularyDiscovery, resolved)

        stages: list[dict] = []
        first = opened
        for label, value in (
            ("opened", opened),
            ("attempted", attempted),
            ("evaluated", evaluated),
            ("discourse_submissions", discourse_submissions),
            ("simulations", simulations),
            ("scenarios_created", scenarios),
            ("discoveries", discoveries),
        ):
            stages.append(
                {
                    "stage": label,
                    "value": value,
                    "conversion": round2(value / first) if first else None,
                }
            )
        return {"window": window, "stages": stages}

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
