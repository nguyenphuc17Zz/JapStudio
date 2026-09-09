"""Persistence for product intelligence & learning analytics (Phase 14)."""

from datetime import date, datetime

from sqlalchemy import delete, func, select

from app.models.analytics import (
    AnalyticsDailyMetric,
    AnalyticsEvent,
    Experiment,
    ExperimentAssignment,
    OptimizationRecommendation,
)
from app.repositories.base import BaseRepository


class AnalyticsEventRepository(BaseRepository[AnalyticsEvent]):
    model = AnalyticsEvent

    async def list_since(
        self, event_type: str, since: datetime, *, limit: int = 5000
    ) -> list[AnalyticsEvent]:
        result = await self._session.scalars(
            select(AnalyticsEvent)
            .where(AnalyticsEvent.event_type == event_type, AnalyticsEvent.occurred_at >= since)
            .order_by(AnalyticsEvent.occurred_at.asc())
            .limit(limit)
        )
        return list(result.all())

    async def delete_older_than(self, before: datetime) -> int:
        """Retention sweep; returns the number of removed rows."""
        result = await self._session.execute(
            delete(AnalyticsEvent).where(AnalyticsEvent.occurred_at < before)
        )
        return result.rowcount or 0


class AnalyticsDailyMetricRepository(BaseRepository[AnalyticsDailyMetric]):
    model = AnalyticsDailyMetric

    async def upsert(self, metric: AnalyticsDailyMetric) -> None:
        existing = await self._session.scalar(
            select(AnalyticsDailyMetric).where(
                AnalyticsDailyMetric.metric_date == metric.metric_date,
                AnalyticsDailyMetric.category == metric.category,
                AnalyticsDailyMetric.metric_key == metric.metric_key,
                AnalyticsDailyMetric.dimension == metric.dimension,
                AnalyticsDailyMetric.dimension_value == metric.dimension_value,
            )
        )
        if existing is not None:
            existing.value = metric.value
            existing.sample_count = metric.sample_count
            existing.metadata_json = metric.metadata_json
            return
        self._session.add(metric)

    async def in_range(
        self,
        category: str | None = None,
        metric_keys: list[str] | None = None,
        start: date | None = None,
        end: date | None = None,
    ) -> list[AnalyticsDailyMetric]:
        conditions = []
        if category is not None:
            conditions.append(AnalyticsDailyMetric.category == category)
        if metric_keys:
            conditions.append(AnalyticsDailyMetric.metric_key.in_(metric_keys))
        if start is not None:
            conditions.append(AnalyticsDailyMetric.metric_date >= start)
        if end is not None:
            conditions.append(AnalyticsDailyMetric.metric_date <= end)
        result = await self._session.scalars(
            select(AnalyticsDailyMetric)
            .where(*conditions)
            .order_by(AnalyticsDailyMetric.metric_date.asc(), AnalyticsDailyMetric.metric_key.asc())
        )
        return list(result.all())

    async def delete_older_than(self, before: date) -> int:
        result = await self._session.execute(
            delete(AnalyticsDailyMetric).where(AnalyticsDailyMetric.metric_date < before)
        )
        return result.rowcount or 0

    async def distinct_categories(self) -> list[str]:
        result = await self._session.scalars(
            select(AnalyticsDailyMetric.category).distinct().order_by(AnalyticsDailyMetric.category)
        )
        return list(result.all())


class OptimizationRecommendationRepository(BaseRepository[OptimizationRecommendation]):
    model = OptimizationRecommendation

    async def list_by_status(
        self, status: str | None = None, *, skip: int = 0, limit: int = 50
    ) -> tuple[list[OptimizationRecommendation], int]:
        conditions = []
        if status is not None:
            conditions.append(OptimizationRecommendation.status == status)
        total = (
            await self._session.scalar(
                select(func.count()).select_from(OptimizationRecommendation).where(*conditions)
            )
        ) or 0
        result = await self._session.scalars(
            select(OptimizationRecommendation)
            .where(*conditions)
            .order_by(OptimizationRecommendation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), total


class ExperimentRepository(BaseRepository[Experiment]):
    model = Experiment

    async def get_by_name(self, name: str) -> Experiment | None:
        return await self._session.scalar(
            select(Experiment).where(Experiment.name == name).limit(1)
        )

    async def list_by_status(
        self, status: str | None = None, *, skip: int = 0, limit: int = 50
    ) -> tuple[list[Experiment], int]:
        conditions = []
        if status is not None:
            conditions.append(Experiment.status == status)
        total = (
            await self._session.scalar(
                select(func.count()).select_from(Experiment).where(*conditions)
            )
        ) or 0
        result = await self._session.scalars(
            select(Experiment)
            .where(*conditions)
            .order_by(Experiment.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), total


class ExperimentAssignmentRepository(BaseRepository[ExperimentAssignment]):
    model = ExperimentAssignment

    async def get_for_user(
        self, experiment_id: str, user_id: str | None
    ) -> ExperimentAssignment | None:
        return await self._session.scalar(
            select(ExperimentAssignment).where(
                ExperimentAssignment.experiment_id == experiment_id,
                ExperimentAssignment.user_id.is_(None)
                if user_id is None
                else ExperimentAssignment.user_id == user_id,
            )
        )

    async def list_for_experiment(self, experiment_id: str) -> list[ExperimentAssignment]:
        result = await self._session.scalars(
            select(ExperimentAssignment)
            .where(ExperimentAssignment.experiment_id == experiment_id)
            .order_by(ExperimentAssignment.assigned_at.asc())
        )
        return list(result.all())
