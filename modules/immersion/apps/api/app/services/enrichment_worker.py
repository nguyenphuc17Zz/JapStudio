import asyncio
import logging
from datetime import datetime, date
from typing import Optional, Dict, Any
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.enrichment import AIEnrichmentJob
from app.models.content import CanonicalContent
from app.services.enrichment_pipeline import EnrichmentPipelineService

logger = logging.getLogger(__name__)


class EnrichmentWorkerPool:
    """Background async worker pool for processing AI enrichment jobs."""

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._semaphore = asyncio.Semaphore(settings.MAX_ENRICHMENT_CONCURRENCY)

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        await self.recover_stale_jobs()
        self._task = asyncio.create_task(self._worker_loop())
        logger.info("EnrichmentWorkerPool started")

    async def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("EnrichmentWorkerPool stopped")

    async def recover_stale_jobs(self) -> None:
        """Resets jobs stuck in RUNNING from previous crash/restart to QUEUED."""
        try:
            async with AsyncSessionLocal() as db:
                stmt = (
                    update(AIEnrichmentJob)
                    .where(AIEnrichmentJob.status == "RUNNING")
                    .values(status="QUEUED", error_message="Recovered from server restart")
                )
                res = await db.execute(stmt)
                await db.commit()
                if res.rowcount > 0:
                    logger.warning(f"Recovered {res.rowcount} stale AI enrichment jobs back to QUEUED")
        except Exception as e:
            logger.error(f"Failed to recover stale enrichment jobs: {e}")

    async def enqueue(
        self,
        db: AsyncSession,
        content_id: int,
        task: str = "ALL",
        model_provider: Optional[str] = None,
        model_name: Optional[str] = None,
        force: bool = False
    ) -> AIEnrichmentJob:
        """Enqueues an AI enrichment job if not already queued.

        Provider/model resolution honors Settings AT EXECUTION TIME: when the
        caller passes no explicit override, an empty-string sentinel is stored
        (columns are NOT NULL) and the worker resolves current settings when
        the job runs. Explicit overrides are preserved verbatim.
        """
        # Check if active job already exists
        stmt = (
            select(AIEnrichmentJob)
            .where(
                and_(
                    AIEnrichmentJob.content_id == content_id,
                    AIEnrichmentJob.status.in_(["QUEUED", "RUNNING"])
                )
            )
        )
        res = await db.execute(stmt)
        existing = res.scalars().first()
        if existing and not force:
            return existing

        provider_name = (model_provider or "").strip().lower()
        m_name = (model_name or "").strip()

        job = AIEnrichmentJob(
            content_id=content_id,
            job_type=f"ENRICH_{task.upper()}",
            status="QUEUED",
            model_provider=provider_name,
            model_name=m_name,
            stage_status_json={"enqueued": "QUEUED"}
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    async def _worker_loop(self) -> None:
        """Continuously pulls and executes QUEUED jobs (unless paused)."""
        while self._running:
            try:
                if not settings.ENRICHMENT_WORKER_ENABLED:
                    await asyncio.sleep(5.0)
                    continue
                job_id = await self._acquire_next_job()
                if job_id:
                    # Process with concurrency limit
                    asyncio.create_task(self._process_job_safe(job_id))
                else:
                    await asyncio.sleep(2.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in enrichment worker loop: {e}")
                await asyncio.sleep(3.0)

    async def _acquire_next_job(self) -> Optional[int]:
        """Atomically finds and locks the next QUEUED job."""
        async with AsyncSessionLocal() as db:
            # Check daily cost budget
            today_start = datetime.combine(date.today(), datetime.min.time())
            cost_stmt = (
                select(func.sum(AIEnrichmentJob.estimated_cost))
                .where(AIEnrichmentJob.created_at >= today_start)
            )
            cost_res = await db.execute(cost_stmt)
            today_cost = cost_res.scalar() or 0.0
            if today_cost >= settings.AI_DAILY_BUDGET_USD:
                logger.warning(f"Daily AI budget reached (${today_cost:.2f} >= ${settings.AI_DAILY_BUDGET_USD:.2f}). Pausing enrichment.")
                await asyncio.sleep(10.0)
                return None

            stmt = (
                select(AIEnrichmentJob.id)
                .where(AIEnrichmentJob.status == "QUEUED")
                .order_by(AIEnrichmentJob.created_at.asc())
                .limit(1)
            )
            res = await db.execute(stmt)
            return res.scalar_one_or_none()

    async def _process_job_safe(self, job_id: int) -> None:
        async with self._semaphore:
            async with AsyncSessionLocal() as db:
                stmt = select(AIEnrichmentJob).where(AIEnrichmentJob.id == job_id)
                res = await db.execute(stmt)
                job = res.scalars().first()
                if not job or job.status != "QUEUED":
                    return

                job.status = "RUNNING"
                job.started_at = datetime.utcnow()
                job.attempt_count += 1
                await db.commit()

                content_id = job.content_id
                provider_name = job.model_provider
                model_name = job.model_name
                task = job.job_type.replace("ENRICH_", "")

            # Execute pipeline
            try:
                async with AsyncSessionLocal() as db:
                    await EnrichmentPipelineService.enrich_content(
                        db=db,
                        content_id=content_id,
                        task=task,
                        model_provider=provider_name,
                        model_name=model_name,
                        force=False
                    )
            except Exception as e:
                logger.error(f"Background enrichment job {job_id} encountered error: {e}")


# Global singleton instance
enrichment_worker_pool = EnrichmentWorkerPool()
