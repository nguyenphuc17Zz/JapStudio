"""Persistence for AI quality telemetry and benchmark runs (Phase 11)."""

from sqlalchemy import select

from app.models.quality import AIBenchmarkResult, AIBenchmarkRun, AIQualityEvent
from app.repositories.base import BaseRepository


class AIQualityEventRepository(BaseRepository[AIQualityEvent]):
    model = AIQualityEvent

    async def recent(self, *, limit: int = 100) -> list[AIQualityEvent]:
        result = await self._session.scalars(
            select(AIQualityEvent).order_by(AIQualityEvent.created_at.desc()).limit(limit)
        )
        return list(result.all())


class AIBenchmarkRunRepository(BaseRepository[AIBenchmarkRun]):
    model = AIBenchmarkRun

    async def recent(self, *, limit: int = 20) -> list[AIBenchmarkRun]:
        result = await self._session.scalars(
            select(AIBenchmarkRun).order_by(AIBenchmarkRun.created_at.desc()).limit(limit)
        )
        return list(result.all())

    async def results_for(self, run_id: str) -> list[AIBenchmarkResult]:
        result = await self._session.scalars(
            select(AIBenchmarkResult).where(AIBenchmarkResult.run_id == run_id)
        )
        return list(result.all())
