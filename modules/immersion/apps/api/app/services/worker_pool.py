import asyncio
import traceback
from datetime import datetime
from typing import Optional, Set
from sqlalchemy import select, and_

from app.core.logging import get_logger
from app.db import session as session_module
from app.models.source import ContentSource
from app.models.ingestion import IngestionJob
from app.services.ingestion_pipeline import IngestionPipelineService

logger = get_logger("services.worker_pool")


class IngestionWorkerPool:
    """Asynchronous worker pool processing queued ingestion jobs with concurrency control,
    crash recovery, and exponential backoff retry for transient failures.
    """

    MAX_CONCURRENT_WORKERS = 4
    POLL_INTERVAL_SECONDS = 3.0

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(IngestionWorkerPool, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._is_running = False
        self._loop_task: Optional[asyncio.Task] = None
        self._active_jobs: Set[int] = set()
        self._active_sources: Set[int] = set()
        self._initialized = True

    @classmethod
    def get_instance(cls) -> "IngestionWorkerPool":
        return cls()

    async def start(self) -> None:
        """Starts the worker pool loop and recovers any abandoned jobs."""
        if self._is_running:
            return
        self._is_running = True
        logger.info("Starting Ingestion Worker Pool...")
        await self.recover_abandoned_jobs()
        self._loop_task = asyncio.create_task(self._worker_loop())

    async def stop(self) -> None:
        """Gracefully halts the worker pool loop."""
        self._is_running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
        logger.info("Ingestion Worker Pool stopped.")

    async def recover_abandoned_jobs(self) -> None:
        """Finds any RUNNING jobs left incomplete from previous application crashes or restarts."""
        try:
            async with session_module.AsyncSessionLocal() as session:
                stmt = select(IngestionJob).where(IngestionJob.status == "RUNNING")
                res = await session.execute(stmt)
                abandoned = res.scalars().all()

                for job in abandoned:
                    logger.warning(f"Recovering abandoned job #{job.id} for source #{job.source_id}")
                    # Unlock source
                    source_stmt = select(ContentSource).where(ContentSource.id == job.source_id).limit(1)
                    res_src = await session.execute(source_stmt)
                    source = res_src.scalar_one_or_none()
                    if source:
                        source.is_syncing = False

                    if job.retry_count < job.max_retries:
                        job.status = "QUEUED"
                        job.retry_count += 1
                        job.error_summary = "Recovered from server restart"
                    else:
                        job.status = "FAILED"
                        job.error_summary = "Server process restarted while job was running"
                        job.finished_at = datetime.utcnow()

                await session.commit()
                if abandoned:
                    logger.info(f"Recovered {len(abandoned)} abandoned ingestion jobs.")
        except Exception as e:
            logger.error(f"Error recovering abandoned jobs: {str(e)}\n{traceback.format_exc()}")

    async def enqueue_job(
        self,
        source_id: int,
        job_type: str = "MANUAL"
    ) -> IngestionJob:
        """Creates and enqueues a new IngestionJob for immediate processing."""
        async with session_module.AsyncSessionLocal() as session:
            # Check job locking: Is a job already QUEUED or RUNNING for this source?
            lock_stmt = select(IngestionJob).where(
                and_(
                    IngestionJob.source_id == source_id,
                    IngestionJob.status.in_(["QUEUED", "RUNNING"])
                )
            ).limit(1)
            res_lock = await session.execute(lock_stmt)
            existing_job = res_lock.scalar_one_or_none()
            if existing_job:
                logger.info(f"Job #{existing_job.id} is already active for source #{source_id} (Skipping duplicate enqueue)")
                return existing_job

            new_job = IngestionJob(
                source_id=source_id,
                job_type=job_type,
                status="QUEUED"
            )
            session.add(new_job)
            await session.commit()
            await session.refresh(new_job)
            logger.info(f"Enqueued {job_type} ingestion job #{new_job.id} for source #{source_id}")
            return new_job

    async def _worker_loop(self) -> None:
        """Continuous loop polling for QUEUED jobs in priority order."""
        while self._is_running:
            try:
                # If pool capacity reached, wait
                if len(self._active_jobs) >= self.MAX_CONCURRENT_WORKERS:
                    await asyncio.sleep(1.0)
                    continue

                available_slots = self.MAX_CONCURRENT_WORKERS - len(self._active_jobs)
                candidate_jobs = await self._fetch_queued_jobs(limit=available_slots)

                for job_id, source_id in candidate_jobs:
                    # Enforce per-source job locking
                    if source_id in self._active_sources:
                        continue

                    self._active_jobs.add(job_id)
                    self._active_sources.add(source_id)
                    asyncio.create_task(self._execute_job_task(job_id, source_id))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker pool loop exception: {str(e)}\n{traceback.format_exc()}")

            await asyncio.sleep(self.POLL_INTERVAL_SECONDS)

    async def _fetch_queued_jobs(self, limit: int = 4):
        """Fetches eligible QUEUED job IDs joining priority from ContentSource."""
        results = []
        try:
            async with session_module.AsyncSessionLocal() as session:
                stmt = (
                    select(IngestionJob.id, IngestionJob.source_id)
                    .join(ContentSource, ContentSource.id == IngestionJob.source_id)
                    .where(
                        and_(
                            IngestionJob.status == "QUEUED",
                            ContentSource.enabled == True,
                            ContentSource.status == "active"
                        )
                    )
                    .order_by(ContentSource.priority.desc(), IngestionJob.created_at.asc())
                    .limit(limit * 2) # Sample candidates to allow filtering out active sources
                )
                res = await session.execute(stmt)
                rows = res.all()
                for row in rows:
                    if row[0] not in self._active_jobs and row[1] not in self._active_sources:
                        results.append((row[0], row[1]))
                        if len(results) >= limit:
                            break
        except Exception as e:
            logger.error(f"Error fetching queued jobs: {str(e)}")
        return results

    async def _execute_job_task(self, job_id: int, source_id: int) -> None:
        """Executes a single job within an isolated session and cleans up active sets."""
        try:
            async with session_module.AsyncSessionLocal() as session:
                job = await IngestionPipelineService.process_job(session, job_id)

                # Evaluate transient failure retry
                if job and job.status == "FAILED" and job.error_type == "transient":
                    if job.retry_count < job.max_retries:
                        backoff_sec = min(300, 10 * (2 ** job.retry_count))
                        logger.info(
                            f"Scheduling transient failure retry for job #{job.id} "
                            f"(Attempt {job.retry_count + 1}/{job.max_retries}) in {backoff_sec}s"
                        )
                        asyncio.create_task(self._schedule_retry(job.id, backoff_sec))

        except Exception as e:
            logger.error(f"Uncaught exception executing job #{job_id}: {str(e)}\n{traceback.format_exc()}")
        finally:
            self._active_jobs.discard(job_id)
            self._active_sources.discard(source_id)

    async def _schedule_retry(self, job_id: int, delay_seconds: float) -> None:
        await asyncio.sleep(delay_seconds)
        try:
            async with session_module.AsyncSessionLocal() as session:
                stmt = select(IngestionJob).where(IngestionJob.id == job_id).limit(1)
                res = await session.execute(stmt)
                job = res.scalar_one_or_none()
                if job and job.status == "FAILED":
                    job.status = "QUEUED"
                    job.retry_count += 1
                    await session.commit()
                    logger.info(f"Job #{job_id} requeued for retry attempt #{job.retry_count}.")
        except Exception as e:
            logger.error(f"Failed to requeue job #{job_id} for retry: {str(e)}")


worker_pool = IngestionWorkerPool.get_instance()
