import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.source import ContentSource, SourceActivityLog
from app.connectors.registry import ConnectorRegistry
from app.schemas.connector import TestConnectionResult, SyncResultResponse
from app.schemas.activity_log import ActivityLogResponse
from app.services.fallback_service import FallbackService
from app.core.security import decrypt_value
from app.core.logging import get_logger

logger = get_logger("services.sync")


class SyncService:
    """Orchestrates connection tests, manual content sync, fallback execution, and activity logs."""

    @classmethod
    async def test_connection(cls, db: AsyncSession, source_id: int) -> TestConnectionResult:
        """Tests live connection to the source via its registered connector."""
        query = select(ContentSource).options(selectinload(ContentSource.credential)).where(ContentSource.id == source_id)
        result = await db.execute(query)
        source = result.scalars().first()

        if not source:
            raise ValueError(f"Content source {source_id} not found")

        connector_type = source.connector_type or source.source_type
        connector = ConnectorRegistry.get(connector_type)

        decrypted_secret = None
        if source.credential and source.credential.encrypted_secret:
            decrypted_secret = decrypt_value(source.credential.encrypted_secret)

        # Run connector test
        test_res = await connector.test_connection(source, decrypted_secret=decrypted_secret)

        request_id = str(uuid.uuid4())
        status_str = "SUCCESS" if test_res.success else "ERROR"

        # Update health status reflecting test
        if test_res.success:
            source.health_status = "HEALTHY" if test_res.response_time_ms < 2000 else "WARNING"
            source.last_error_message = None
        else:
            source.health_status = "ERROR"
            source.last_error_message = test_res.message

        # Create audit log with request_id
        log = SourceActivityLog(
            request_id=request_id,
            source_id=source.id,
            event_type="test_connection",
            connector_type=connector_type,
            status=status_str,
            status_code=test_res.status_code,
            duration_ms=test_res.response_time_ms,
            items_count=test_res.sample_items_count,
            message=test_res.message,
            metadata_json={
                "preview": test_res.sample_preview,
                "error": test_res.error_details,
            },
        )
        db.add(log)
        await db.commit()

        return test_res

    @classmethod
    async def sync_source(
        cls, db: AsyncSession, source_id: int, limit: int = 50
    ) -> SyncResultResponse:
        """Fetch-preview for a source (does NOT persist articles).

        IMPORTANT: This is only a connectivity/preview probe. It must NOT touch
        `last_sync_at` / `last_success_at` / `items_fetched_*` counters, otherwise
        the Scheduler thinks the source was freshly ingested and skips the real
        `IngestionPipeline` job (which is the only path that creates
        `canonical_contents` for the Immersion feed). Use
        `POST /sources/{id}/sync?background=true` to enqueue a real job.
        """
        query = select(ContentSource).options(selectinload(ContentSource.credential)).where(ContentSource.id == source_id)
        result = await db.execute(query)
        source = result.scalars().first()

        if not source:
            raise ValueError(f"Content source {source_id} not found")

        # Concurrency check
        if source.is_syncing:
            logger.warning(f"Sync already in progress for source {source.name} (id={source.id})")
            return SyncResultResponse(
                source_id=source.id,
                success=False,
                items_fetched=0,
                duration_ms=0,
                status="in_progress",
                message="Synchronization is already in progress for this source.",
                sample_titles=[],
            )

        # Set syncing lock
        source.is_syncing = True
        await db.commit()

        request_id = str(uuid.uuid4())
        connector_type = source.connector_type or source.source_type

        try:
            decrypted_secret = None
            if source.credential and source.credential.encrypted_secret:
                decrypted_secret = decrypt_value(source.credential.encrypted_secret)

            # Fetch via FallbackService (attempts primary connector, falls back down chain if needed)
            fetch_res = await FallbackService.execute_with_fallback(
                source, decrypted_secret=decrypted_secret, limit=limit
            )

            # NOTE: preview-only — do NOT update last_sync_at / last_success_at
            # so the Scheduler still sees this source as due for real ingestion.
            # Only record duration for diagnostics.
            source.last_sync_duration_ms = fetch_res.response_time_ms

            sample_titles = [item.title for item in fetch_res.items[:5]]

            if fetch_res.success:
                source.consecutive_failure_count = 0
                source.last_error_message = None
                source.health_status = "HEALTHY"

                items_cnt = len(fetch_res.items)

                warning_msgs = [w.message for w in fetch_res.warnings]
                status_str = "WARNING" if warning_msgs else "SUCCESS"
                summary_msg = f"Preview fetched {items_cnt} items (not persisted — run Ingestion to save to feed)"
                if warning_msgs:
                    summary_msg += f" (with {len(warning_msgs)} warnings: {'; '.join(warning_msgs[:2])})"

                log = SourceActivityLog(
                    request_id=request_id,
                    source_id=source.id,
                    event_type="manual_sync",
                    connector_type=connector_type,
                    status=status_str,
                    status_code=fetch_res.status_code,
                    duration_ms=fetch_res.response_time_ms,
                    items_count=items_cnt,
                    message=summary_msg,
                    metadata_json={
                        "preview_only": True,
                        "persisted": False,
                        "hint": "Use POST /sources/{id}/sync?background=true to persist articles",
                        "sample_titles": sample_titles,
                        "warnings": [w.model_dump() for w in fetch_res.warnings],
                        "pagination": fetch_res.pagination_metadata,
                    },
                )
                db.add(log)
                await db.commit()

                return SyncResultResponse(
                    source_id=source.id,
                    request_id=request_id,
                    success=True,
                    items_fetched=items_cnt,
                    duration_ms=fetch_res.response_time_ms,
                    status=status_str,
                    message=summary_msg,
                    sample_titles=sample_titles,
                )
            else:
                source.consecutive_failure_count = (source.consecutive_failure_count or 0) + 1
                source.last_error_message = fetch_res.error_message
                source.health_status = "ERROR" if source.consecutive_failure_count >= 3 else "WARNING"

                log = SourceActivityLog(
                    request_id=request_id,
                    source_id=source.id,
                    event_type="sync_failed",
                    connector_type=connector_type,
                    status="ERROR",
                    status_code=fetch_res.status_code,
                    duration_ms=fetch_res.response_time_ms,
                    items_count=0,
                    message=fetch_res.error_message,
                    metadata_json={"consecutive_failures": source.consecutive_failure_count},
                )
                db.add(log)
                await db.commit()

                return SyncResultResponse(
                    source_id=source.id,
                    request_id=request_id,
                    success=False,
                    items_fetched=0,
                    duration_ms=fetch_res.response_time_ms,
                    status="failure",
                    message=fetch_res.error_message or "Sync failed.",
                    sample_titles=[],
                )

        finally:
            # Release concurrency lock unconditionally
            source.is_syncing = False
            await db.commit()

    @classmethod
    async def get_logs_for_source(
        cls, db: AsyncSession, source_id: int, limit: int = 50
    ) -> List[ActivityLogResponse]:
        """Retrieves history logs for a specific source."""
        query = (
            select(SourceActivityLog)
            .where(SourceActivityLog.source_id == source_id)
            .order_by(SourceActivityLog.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        logs = result.scalars().all()
        return [ActivityLogResponse.model_validate(log) for log in logs]
