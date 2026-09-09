import asyncio
import traceback
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select, and_, delete

from app.core.logging import get_logger
from app.db import session as session_module
from app.models.source import ContentSource
from app.models.ingestion import RawIngestionItem, IngestionItemLog, IngestionJob
from app.services.worker_pool import worker_pool

logger = get_logger("services.scheduler")


class IngestionScheduler:
    """Orchestrates scheduled polling based on source intervals and priority,
    as well as 7-day retention cleanup for raw payloads and item logs.
    """

    POLL_INTERVAL_SECONDS = 30.0
    CLEANUP_INTERVAL_HOURS = 6.0
    RETENTION_DAYS = 7

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(IngestionScheduler, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._is_running = False
        self._scheduler_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        self._initialized = True

    @classmethod
    def get_instance(cls) -> "IngestionScheduler":
        return cls()

    async def start(self) -> None:
        """Starts scheduler polling loop and retention cleanup loop."""
        if self._is_running:
            return
        self._is_running = True
        logger.info("Starting Ingestion Scheduler & Retention Routine...")
        self._scheduler_task = asyncio.create_task(self._schedule_loop())
        self._cleanup_task = asyncio.create_task(self._retention_cleanup_loop())

    async def stop(self) -> None:
        """Halts the scheduler and cleanup loops gracefully."""
        self._is_running = False
        if self._scheduler_task and not self._scheduler_task.done():
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.debug(f"Scheduler task cancellation notice: {e}")
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.debug(f"Cleanup task cancellation notice: {e}")
        logger.info("Ingestion Scheduler stopped.")

    async def _schedule_loop(self) -> None:
        """Checks for active sources due for sync and enqueues SCHEDULED jobs."""
        while self._is_running:
            try:
                await self._check_due_sources()
            except asyncio.CancelledError:
                break
            except Exception as e:
                if not self._is_running:
                    break
                logger.error(f"Error in scheduler check loop: {str(e)}\n{traceback.format_exc()}")

            try:
                await asyncio.sleep(self.POLL_INTERVAL_SECONDS)
            except asyncio.CancelledError:
                break

    async def _check_due_sources(self) -> None:
        now = datetime.utcnow()
        async with session_module.AsyncSessionLocal() as session:
            stmt = select(ContentSource).where(
                and_(
                    ContentSource.status == "active",
                    ContentSource.enabled == True
                )
            ).order_by(ContentSource.priority.desc())

            res = await session.execute(stmt)
            sources = res.scalars().all()

            for source in sources:
                interval_minutes = max(5, source.sync_interval_minutes or 60)
                is_due = False

                if not source.last_sync_at:
                    is_due = True
                else:
                    elapsed = now - source.last_sync_at
                    if elapsed >= timedelta(minutes=interval_minutes):
                        is_due = True

                if is_due:
                    # Enqueue scheduled ingestion job
                    await worker_pool.enqueue_job(source.id, job_type="SCHEDULED")

    async def _retention_cleanup_loop(self) -> None:
        """Periodically purges raw payloads and item logs older than 7 days to preserve SQLite DB."""
        while self._is_running:
            try:
                await self.prune_old_records()
            except asyncio.CancelledError:
                break
            except Exception as e:
                if not self._is_running:
                    break
                logger.error(f"Error in retention cleanup loop: {str(e)}\n{traceback.format_exc()}")

            try:
                await asyncio.sleep(self.CLEANUP_INTERVAL_HOURS * 3600)
            except asyncio.CancelledError:
                break

    async def prune_old_records(self) -> None:
        cutoff = datetime.utcnow() - timedelta(days=self.RETENTION_DAYS)
        logger.info(f"Running retention pruning for records older than {cutoff.isoformat()} (7 days)...")

        try:
            async with session_module.AsyncSessionLocal() as session:
                # 1. Prune Raw Ingestion Items
                stmt_raw = delete(RawIngestionItem).where(RawIngestionItem.created_at < cutoff)
                res_raw = await session.execute(stmt_raw)

                # 2. Prune Item Logs
                stmt_logs = delete(IngestionItemLog).where(IngestionItemLog.created_at < cutoff)
                res_logs = await session.execute(stmt_logs)

                # 3. Prune old completed jobs older than 30 days
                job_cutoff = datetime.utcnow() - timedelta(days=30)
                stmt_jobs = delete(IngestionJob).where(
                    and_(
                        IngestionJob.status.in_(["SUCCESS", "CANCELLED"]),
                        IngestionJob.created_at < job_cutoff
                    )
                )
                res_jobs = await session.execute(stmt_jobs)

                await session.commit()
                logger.info(
                    f"Retention pruning complete: Deleted {res_raw.rowcount} raw items, "
                    f"{res_logs.rowcount} item logs, {res_jobs.rowcount} old jobs."
                )
        except Exception as e:
            logger.error(f"Retention pruning failed: {str(e)}")


scheduler = IngestionScheduler.get_instance()
