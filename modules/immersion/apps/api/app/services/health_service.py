import uuid
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.source import ContentSource, SourceActivityLog
from app.connectors.registry import ConnectorRegistry
from app.schemas.connector import HealthCheckResult
from app.core.security import decrypt_value
from app.core.logging import get_logger

logger = get_logger("services.health")


class HealthService:
    """Monitors endpoint reachability and connector health statuses."""

    @classmethod
    async def check_source_health(cls, db: AsyncSession, source_id: int) -> HealthCheckResult:
        """Executes a health check for an individual source."""
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

        health_res = await connector.health_check(source, decrypted_secret=decrypted_secret)

        # Normalize health status to model enum
        status_raw = health_res.status.upper()
        if status_raw in ("HEALTHY", "WARNING", "ERROR", "UNKNOWN"):
            source.health_status = status_raw
        elif status_raw in ("DEGRADED",):
            source.health_status = "WARNING"
        elif status_raw in ("DOWN", "FAILURE"):
            source.health_status = "ERROR"
        else:
            source.health_status = "UNKNOWN"

        if source.health_status == "ERROR":
            source.last_error_message = health_res.message
        elif source.health_status == "HEALTHY":
            source.last_error_message = None

        log = SourceActivityLog(
            request_id=str(uuid.uuid4()),
            source_id=source.id,
            event_type="health_check",
            connector_type=connector_type,
            status="SUCCESS" if source.health_status in ("HEALTHY", "WARNING") else "ERROR",
            status_code=health_res.status_code,
            duration_ms=health_res.response_time_ms,
            items_count=0,
            message=health_res.message,
            metadata_json={"health_status": source.health_status, "raw_status": health_res.status},
        )
        db.add(log)
        await db.commit()

        return health_res

    @classmethod
    async def check_all_sources(cls, db: AsyncSession) -> Dict[str, Any]:
        """Runs health checks on all active sources."""
        result = await db.execute(select(ContentSource.id).where(ContentSource.status == "active"))
        source_ids = result.scalars().all()

        healthy = 0
        warning = 0
        error = 0

        for sid in source_ids:
            try:
                res = await cls.check_source_health(db, sid)
                st = res.status.upper()
                if st in ("HEALTHY", "UP"):
                    healthy += 1
                elif st in ("WARNING", "DEGRADED"):
                    warning += 1
                else:
                    error += 1
            except Exception as e:
                logger.error(f"Health check failed for source {sid}: {e}")
                error += 1

        return {
            "total_checked": len(source_ids),
            "healthy": healthy,
            "warning": warning,
            "error": error,
            "checked_at": datetime.utcnow().isoformat(),
        }
