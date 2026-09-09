"""Runtime product event capture and retention (Phase 14).

Only whitelisted, privacy-safe metadata is stored (``exercise_opened``).
"""

import logging
from datetime import datetime, timedelta, timezone

from app.models.analytics import AnalyticsEvent
from app.repositories.analytics import AnalyticsEventRepository

logger = logging.getLogger("app.analytics.events")


class AnalyticsEventService:
    """Records lightweight product events and enforces retention."""

    def __init__(self, repository: AnalyticsEventRepository) -> None:
        self._repository = repository

    async def record_exercise_opened(
        self, exercise_id: str, *, occurred_at: datetime | None = None
    ) -> None:
        """Best-effort instrumentation of an exercise being opened."""
        try:
            event = AnalyticsEvent(
                event_type="exercise_opened",
                user_id=None,
                entity_id=exercise_id,
                context={"event": "exercise_opened"},
                occurred_at=occurred_at or datetime.now(timezone.utc),
            )
            await self._repository.add(event)
        except Exception:
            logger.exception("analytics event recording failed (skipped)")

    async def count_opened(self, start: datetime, end: datetime) -> int:
        events = await self._repository.list_since("exercise_opened", start)

        def aware(value: datetime) -> datetime:
            return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

        return sum(1 for event in events if aware(event.occurred_at) <= end)

    async def sweep(self, retention_days: int, *, now: datetime | None = None) -> int:
        """Delete events older than the retention window; returns rows removed."""
        cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=retention_days)
        return await self._repository.delete_older_than(cutoff)
