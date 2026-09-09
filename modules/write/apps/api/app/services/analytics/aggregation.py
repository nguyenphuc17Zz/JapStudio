"""Daily aggregation, telemetry persistence and retention (Phase 14).

- Persists the in-memory quality telemetry buffer into ``ai_quality_events``
  idempotently (unique ``event_key``), so provider/cost analytics work even
  across process restarts.
- Precomputes one row per (date, category, metric_key, dimension, value)
  in ``analytics_daily_metrics``.
- Enforces the retention window on events and daily metrics.
"""

import hashlib
import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.analytics import AnalyticsDailyMetric
from app.models.exercise import Exercise, ExerciseAttempt, WritingFeedback
from app.models.quality import AIQualityEvent
from app.quality.telemetry import telemetry
from app.repositories.analytics import (
    AnalyticsDailyMetricRepository,
    AnalyticsEventRepository,
)
from app.services.analytics.common import enum_value, exercise_usefulness
from app.services.analytics.events import AnalyticsEventService

logger = logging.getLogger("app.analytics.aggregation")


class AnalyticsAggregationService:
    """Idempotent daily aggregation pipeline."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()
        self._daily = AnalyticsDailyMetricRepository(session)
        self._events = AnalyticsEventRepository(session)

    async def run(self, days: int | None = None) -> dict:
        persisted = await self._persist_telemetry()
        days = days or self._settings.analytics_aggregation_days
        aggregated = await self._aggregate_days(days)
        swept_events = await AnalyticsEventService(self._events).sweep(
            self._settings.analytics_retention_days
        )
        cutoff = datetime.now(timezone.utc).date() - timedelta(
            days=self._settings.analytics_retention_days
        )
        swept_metrics = await self._daily.delete_older_than(cutoff)
        await self._session.commit()
        return {
            "aggregated": aggregated,
            "retained_days": self._settings.analytics_retention_days,
            "swept_events": swept_events,
            "swept_metrics": swept_metrics,
            "persisted_telemetry": persisted,
            "generated_at": datetime.now(timezone.utc),
        }

    # -- telemetry persistence ----------------------------------------------

    async def _persist_telemetry(self) -> int:
        saved = 0
        seen: set[str] = set()
        events = telemetry.events()
        # Batch check existing keys to avoid N queries
        pending: list[tuple[str, Any]] = []
        keys: list[str] = []
        for event in events:
            key = self._event_key(event)
            if key in seen:
                continue
            seen.add(key)
            pending.append((key, event))
            keys.append(key)
        existing: set[str] = set()
        if keys:
            # Chunk IN clause to avoid DB limit (500 per chunk)
            for i in range(0, len(keys), 500):
                chunk = keys[i : i + 500]
                result = await self._session.execute(select(AIQualityEvent.event_key).where(AIQualityEvent.event_key.in_(chunk)))
                existing.update(r[0] for r in result.all())
        for key, event in pending:
            if key in existing:
                continue
            self._session.add(
                AIQualityEvent(
                    task=event.task,
                    provider=event.provider,
                    model=event.model,
                    duration_ms=event.duration_ms,
                    success=event.success,
                    failure_class=event.failure_class,
                    retry_count=event.retry_count,
                    fallback_used=event.fallback_used,
                    token_usage=event.token_usage,
                    quality_status=event.quality_status,
                    result_hash=event.result_hash,
                    criticality=event.criticality,
                    estimated_cost=event.estimated_cost,
                    prompt_version=event.prompt_version,
                    created_at=event.created_at,
                    event_key=key,
                )
            )
            saved += 1
        return saved

    @staticmethod
    def _event_key(event) -> str:
        raw = (
            f"{event.created_at.isoformat()}:{event.task}:{event.provider}:"
            f"{event.model}:{event.result_hash}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    # -- daily aggregation --------------------------------------------------

    async def _aggregate_days(self, days: int) -> int:
        today = datetime.now(timezone.utc).date()
        start_day = today - timedelta(days=days)
        count = 0
        day = start_day
        while day <= today:
            day_start = datetime.combine(day, time.min, tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            count += await self._aggregate_day(day, day_start, day_end)
            day += timedelta(days=1)
        return count

    async def _aggregate_day(self, day: date, day_start: datetime, day_end: datetime) -> int:
        upserts = 0

        attempts = (
            await self._session.scalar(
                select(func.count())
                .select_from(ExerciseAttempt)
                .where(
                    ExerciseAttempt.created_at >= day_start,
                    ExerciseAttempt.created_at < day_end,
                )
            )
            or 0
        )
        upserts += await self._upsert(
            day, "activity", "attempts.count", None, None, float(attempts), attempts
        )

        evaluated_rows = await self._session.execute(
            select(WritingFeedback.overall_score)
            .join(ExerciseAttempt, ExerciseAttempt.id == WritingFeedback.attempt_id)
            .where(
                ExerciseAttempt.created_at >= day_start,
                ExerciseAttempt.created_at < day_end,
            )
        )
        scores = [row[0] for row in evaluated_rows.all()]
        upserts += await self._upsert(
            day, "activity", "evaluated.count", None, None, float(len(scores)), len(scores)
        )
        if scores:
            upserts += await self._upsert(
                day,
                "activity",
                "score.overall.average",
                None,
                None,
                round(sum(scores) / len(scores), 2),
                len(scores),
            )

        usefulness = await self._day_usefulness(day_start, day_end)
        for genre, metrics in usefulness.items():
            upserts += await self._upsert(
                day,
                "effectiveness",
                f"feature.scenario.{genre}.usefulness",
                "genre",
                genre,
                metrics["usefulness"],
                metrics["sample_count"],
            )

        calibration = await self._day_calibration(day_start, day_end)
        for (level, difficulty), metrics in calibration.items():
            upserts += await self._upsert(
                day,
                "calibration",
                f"difficulty.{level}.{difficulty}.avg_score",
                "difficulty",
                f"{level}.{difficulty}",
                metrics["avg_score"],
                metrics["attempts"],
            )
            upserts += await self._upsert(
                day,
                "calibration",
                f"difficulty.{level}.{difficulty}.completion_rate",
                "difficulty",
                f"{level}.{difficulty}",
                metrics["completion_rate"],
                metrics["attempts"],
            )

        costs = await self._day_cost(day_start, day_end)
        for provider, (cost, calls) in costs.items():
            upserts += await self._upsert(
                day,
                "cost",
                "cost.total.daily",
                "provider",
                provider,
                round(cost, 6),
                calls,
            )
        return upserts

    async def _upsert(
        self,
        day: date,
        category: str,
        metric_key: str,
        dimension: str | None,
        dimension_value: str | None,
        value: float,
        sample_count: int,
    ) -> int:
        if value is None:
            return 0
        metric = AnalyticsDailyMetric(
            metric_date=day,
            category=category,
            metric_key=metric_key,
            dimension=dimension,
            dimension_value=dimension_value,
            value=value,
            sample_count=sample_count,
        )
        await self._daily.upsert(metric)
        return 1

    async def _day_usefulness(self, day_start: datetime, day_end: datetime) -> dict[str, dict]:
        from app.models.writing import WritingScenario

        result = await self._session.execute(
            select(ExerciseAttempt, WritingFeedback, Exercise, WritingScenario)
            .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .join(Exercise, Exercise.id == ExerciseAttempt.exercise_id)
            .outerjoin(WritingScenario, WritingScenario.id == Exercise.scenario_id)
            .where(
                ExerciseAttempt.created_at >= day_start,
                ExerciseAttempt.created_at < day_end,
            )
            .order_by(ExerciseAttempt.exercise_id, ExerciseAttempt.attempt_number.asc())
        )
        per_exercise: dict[str, dict] = {}
        for attempt, feedback, exercise, scenario in result.all():
            genre = scenario.genre if scenario else "none"
            bucket = per_exercise.setdefault(
                exercise.id, {"genre": genre, "scores": [], "attempts": 0, "hints": 0}
            )
            bucket["attempts"] += 1
            bucket["hints"] += attempt.hints_revealed_count
            bucket["scores"].append(feedback.overall_score)

        groups: dict[str, dict] = {}
        for bucket in per_exercise.values():
            total = bucket["attempts"]
            scores = bucket["scores"]
            usefulness = exercise_usefulness(
                completion=1.0,
                improvement=(scores[-1] - scores[0]) / 100.0 if scores else 0.0,
                engagement=min(1.0, bucket["hints"] / (3.0 * total)),
                failure=sum(1 for s in scores if s < 40) / total,
                skip=0.0,
            )
            group = groups.setdefault(bucket["genre"], {"usefulness": [], "sample_count": 0})
            group["usefulness"].append(usefulness)
            group["sample_count"] += 1
        return {
            genre: {
                "usefulness": round(sum(g["usefulness"]) / len(g["usefulness"]), 2),
                "sample_count": g["sample_count"],
            }
            for genre, g in groups.items()
        }

    async def _day_calibration(self, day_start: datetime, day_end: datetime) -> dict:
        result = await self._session.execute(
            select(WritingFeedback.overall_score, Exercise)
            .join(ExerciseAttempt, ExerciseAttempt.id == WritingFeedback.attempt_id)
            .join(Exercise, Exercise.id == ExerciseAttempt.exercise_id)
            .where(
                ExerciseAttempt.created_at >= day_start,
                ExerciseAttempt.created_at < day_end,
            )
        )
        per_key: dict[tuple, dict] = {}
        for score, exercise in result.all():
            key = (enum_value(exercise.jlpt_level), exercise.difficulty)
            bucket = per_key.setdefault(key, {"scores": [], "attempts": 0})
            bucket["scores"].append(score)
            bucket["attempts"] += 1
        return {
            key: {
                "avg_score": round(sum(b["scores"]) / len(b["scores"]), 2),
                "completion_rate": round(b["attempts"] / b["attempts"], 2),
                "attempts": b["attempts"],
            }
            for key, b in per_key.items()
        }

    async def _day_cost(
        self, day_start: datetime, day_end: datetime
    ) -> dict[str, tuple[float, int]]:
        result = await self._session.execute(
            select(AIQualityEvent).where(
                AIQualityEvent.created_at >= day_start,
                AIQualityEvent.created_at < day_end,
            )
        )
        costs: dict[str, tuple[float, int]] = {}
        for event in result.scalars().all():
            provider = event.provider or "unknown"
            cost, calls = costs.get(provider, (0.0, 0))
            costs[provider] = (cost + (event.estimated_cost or 0.0), calls + 1)
        return costs
