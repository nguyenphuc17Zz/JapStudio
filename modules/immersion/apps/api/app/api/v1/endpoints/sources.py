from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.source import (
    SourceCreate,
    SourceUpdate,
    SourceResponse,
    SourceStats,
    BulkActionRequest,
    BulkActionResult,
)
from app.schemas.connector import (
    TestConnectionResult,
    SyncResultResponse,
    HealthCheckResult,
    AutoDetectResponse,
)
from app.schemas.activity_log import ActivityLogResponse
from app.services.source_service import SourceService
from app.services.sync_service import SyncService
from app.services.health_service import HealthService
from app.services.detector_service import AutoDetectService

from sqlalchemy import select, desc
from app.models.ingestion import IngestionJob
from app.schemas.ingestion import IngestionJobResponse
from app.services.worker_pool import worker_pool

router = APIRouter()


class AutoDetectRequest(BaseModel):
    url: str
    headers: Optional[Dict[str, str]] = None


class CapabilitiesUpdateRequest(BaseModel):
    capabilities: Dict[str, str]


@router.post("/detect", response_model=AutoDetectResponse)
async def detect_source(payload: AutoDetectRequest):
    """Automatically analyzes a URL to detect connector type, feeds, and capabilities."""
    try:
        return await AutoDetectService.detect_from_url(payload.url, headers=payload.headers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Auto-detection failed: {str(e)}",
        )


@router.get("", response_model=List[SourceResponse])
async def list_sources(
    category: Optional[str] = Query(None, description="Filter by category"),
    source_type: Optional[str] = Query(None, description="Filter by source_type: NEWS, SOCIAL, BLOG, FORUM, WEB"),
    connector_type: Optional[str] = Query(None, description="Filter by connector_type: RSS, ATOM, REST_API, SITEMAP, WEB, REDDIT, X, THREADS"),
    learning_role: Optional[str] = Query(None, description="Filter by learning role: FORMAL, CASUAL, TECHNICAL, NEWS, CULTURE"),
    status: Optional[str] = Query(None, description="Filter by status: active, paused, error"),
    health_status: Optional[str] = Query(None, description="Filter by health: HEALTHY, WARNING, ERROR, UNKNOWN"),
    search: Optional[str] = Query(None, description="Text search in name or description"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves all content sources matching filters."""
    return await SourceService.get_all(
        db,
        category=category,
        source_type=source_type,
        connector_type=connector_type,
        learning_role=learning_role,
        status=status,
        health_status=health_status,
        search=search,
    )


@router.post("", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def create_source(payload: SourceCreate, db: AsyncSession = Depends(get_db)):
    """Creates a new Japanese content source."""
    try:
        return await SourceService.create_source(db, payload)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))


@router.get("/stats", response_model=SourceStats)
async def get_source_stats(db: AsyncSession = Depends(get_db)):
    """Aggregated statistics on managed sources, types, roles, and health."""
    return await SourceService.get_stats(db)


@router.post("/bulk", response_model=BulkActionResult)
async def bulk_action(payload: BulkActionRequest, db: AsyncSession = Depends(get_db)):
    """Applies bulk actions (activate, pause, delete) on multiple sources."""
    return await SourceService.execute_bulk_action(db, payload)


@router.get("/export")
async def export_sources(db: AsyncSession = Depends(get_db)):
    """Exports all sources as JSON configuration for backup and migration."""
    return await SourceService.export_sources_json(db)


@router.post("/import")
async def import_sources(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """Imports sources from previously exported JSON."""
    imported_count, errors = await SourceService.import_sources_json(db, payload)
    return {
        "imported_count": imported_count,
        "errors": errors,
        "message": f"Successfully imported {imported_count} sources.",
    }


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(source_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieves single content source details."""
    source = await SourceService.get_dto_by_id(db, source_id)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Source {source_id} not found")
    return source


@router.put("/{source_id}", response_model=SourceResponse)
async def update_source(source_id: int, payload: SourceUpdate, db: AsyncSession = Depends(get_db)):
    """Updates configuration, settings, or credentials for a content source."""
    source = await SourceService.update_source(db, source_id, payload)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Source {source_id} not found")
    return source


@router.post("/{source_id}/capabilities", response_model=SourceResponse)
async def update_source_capabilities(
    source_id: int, payload: CapabilitiesUpdateRequest, db: AsyncSession = Depends(get_db)
):
    """Updates capability matrix states for a content source."""
    source = await SourceService.update_capabilities(db, source_id, payload.capabilities)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Source {source_id} not found")
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(source_id: int, db: AsyncSession = Depends(get_db)):
    """Permanently deletes a content source and its logs."""
    deleted = await SourceService.delete_source(db, source_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Source {source_id} not found")


@router.post("/{source_id}/test", response_model=TestConnectionResult)
async def test_connection(source_id: int, db: AsyncSession = Depends(get_db)):
    """Pings endpoint and tests connector diagnostics."""
    try:
        return await SyncService.test_connection(db, source_id)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))


@router.post("/{source_id}/sync", response_model=SyncResultResponse)
async def sync_source(
    source_id: int,
    background: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Triggers on-demand synchronization for a source.
    - background=False (default): fetch-preview ONLY, does NOT persist articles
      and does NOT touch last_sync_at (see SyncService.sync_source).
    - background=True: enqueues a real IngestionPipeline job that persists
      canonical_contents for the Immersion feed. Returns job_id for polling
      via GET /ingestion/jobs/{job_id}.
    """
    if background:
        from app.models.source import ContentSource

        src_stmt = select(ContentSource).where(ContentSource.id == source_id).limit(1)
        src_res = await db.execute(src_stmt)
        if not src_res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Source {source_id} not found")
        job = await worker_pool.enqueue_job(source_id, job_type="MANUAL")
        # worker_pool returns the existing active job when one is already queued/running
        return SyncResultResponse(
            source_id=source_id,
            job_id=job.id,
            request_id=f"job_{job.id}",
            success=True,
            items_fetched=0,
            duration_ms=0.0,
            status=job.status,
            message=(
                f"Ingestion job #{job.id} enqueued successfully. "
                f"Poll GET /ingestion/jobs/{job.id} until SUCCESS, then check Immersion feed."
                if job.status == "QUEUED"
                else f"Job #{job.id} is already {job.status} for this source (deduplicated)."
            ),
        )
    try:
        return await SyncService.sync_source(db, source_id)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))


@router.get("/{source_id}/ingestion-history", response_model=List[IngestionJobResponse])
async def get_source_ingestion_history(
    source_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves recent ingestion jobs executed for a specific source."""
    stmt = (
        select(IngestionJob)
        .where(IngestionJob.source_id == source_id)
        .order_by(desc(IngestionJob.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    jobs = res.scalars().all()
    return [IngestionJobResponse.model_validate(j) for j in jobs]


@router.get("/{source_id}/logs", response_model=List[ActivityLogResponse])
async def get_source_logs(
    source_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves activity audit history for a source."""
    return await SyncService.get_logs_for_source(db, source_id, limit=limit)


@router.get("/{source_id}/health", response_model=HealthCheckResult)
async def check_source_health(source_id: int, db: AsyncSession = Depends(get_db)):
    """Runs a health check probe on a single source."""
    try:
        return await HealthService.check_source_health(db, source_id)
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
