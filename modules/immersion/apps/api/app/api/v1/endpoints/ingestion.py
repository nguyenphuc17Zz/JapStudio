from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, desc, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.source import ContentSource
from app.models.content import CanonicalContent
from app.models.ingestion import IngestionJob, IngestionItemLog
from app.schemas.ingestion import (
    IngestionJobResponse,
    IngestionJobDetailResponse,
    IngestionJobListResponse,
    IngestionStatsResponse,
    ItemLogResponse,
)
from app.schemas.content import (
    ContentResponse,
    ContentListResponse,
)
from app.services.worker_pool import worker_pool

router = APIRouter(prefix="/ingestion", tags=["Content Ingestion"])


@router.get("/stats", response_model=IngestionStatsResponse)
async def get_ingestion_stats(session: AsyncSession = Depends(get_db)):
    """Computes real-time ingestion KPIs for today's pipeline throughput."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Aggregated metrics for jobs created today
    stmt = select(
        func.count(IngestionJob.id).label("total_jobs"),
        func.sum(case((IngestionJob.status == "SUCCESS", 1), else_=0)).label("success_jobs"),
        func.sum(case((IngestionJob.status == "FAILED", 1), else_=0)).label("failed_jobs"),
        func.sum(case((IngestionJob.status == "PARTIAL_SUCCESS", 1), else_=0)).label("partial_jobs"),
        func.sum(case((IngestionJob.status == "RUNNING", 1), else_=0)).label("running_jobs"),
        func.sum(case((IngestionJob.status == "QUEUED", 1), else_=0)).label("queued_jobs"),
        func.sum(IngestionJob.items_fetched).label("total_fetched"),
        func.sum(IngestionJob.items_created).label("total_created"),
        func.sum(IngestionJob.items_updated).label("total_updated"),
        func.sum(IngestionJob.items_duplicate).label("total_duplicate"),
        func.sum(IngestionJob.items_rejected).label("total_rejected"),
        func.avg(IngestionJob.duration_ms).label("avg_duration")
    ).where(IngestionJob.created_at >= today_start)

    res = await session.execute(stmt)
    row = res.one_or_none()

    if not row:
        return IngestionStatsResponse()

    return IngestionStatsResponse(
        jobs_today=row.total_jobs or 0,
        successful_jobs=row.success_jobs or 0,
        failed_jobs=row.failed_jobs or 0,
        partial_jobs=row.partial_jobs or 0,
        running_jobs=row.running_jobs or 0,
        queued_jobs=row.queued_jobs or 0,
        items_fetched=row.total_fetched or 0,
        items_created=row.total_created or 0,
        items_updated=row.total_updated or 0,
        items_duplicate=row.total_duplicate or 0,
        items_rejected=row.total_rejected or 0,
        avg_duration_ms=round(float(row.avg_duration or 0.0), 1)
    )


@router.get("/jobs", response_model=IngestionJobListResponse)
async def list_ingestion_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    source_id: Optional[int] = Query(None),
    connector_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db)
):
    """Lists ingestion jobs with filtering by status, source, and pagination."""
    query = select(IngestionJob).join(ContentSource, ContentSource.id == IngestionJob.source_id)

    filters = []
    if status_filter and status_filter != "all":
        filters.append(IngestionJob.status == status_filter.upper())
    if source_id:
        filters.append(IngestionJob.source_id == source_id)
    if connector_type and connector_type != "all":
        filters.append(ContentSource.connector_type == connector_type.upper())

    if filters:
        query = query.where(and_(*filters))

    # Total count query
    count_stmt = select(func.count()).select_from(query.subquery())
    total_res = await session.execute(count_stmt)
    total = total_res.scalar_one()

    # Pagination
    offset = (page - 1) * page_size
    query = (
        query
        .order_by(desc(IngestionJob.created_at))
        .offset(offset)
        .limit(page_size)
        .options(selectinload(IngestionJob.source))
    )

    res = await session.execute(query)
    jobs = res.scalars().all()

    items = []
    for j in jobs:
        item = IngestionJobResponse.model_validate(j)
        if j.source:
            item.source_name = j.source.name
            item.connector_type = j.source.connector_type
        items.append(item)

    return IngestionJobListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + len(items)) < total
    )


@router.get("/jobs/{job_id}", response_model=IngestionJobDetailResponse)
async def get_job_detail(
    job_id: int,
    session: AsyncSession = Depends(get_db)
):
    """Retrieves full details of an ingestion job including item-level audit logs."""
    stmt = (
        select(IngestionJob)
        .where(IngestionJob.id == job_id)
        .options(
            selectinload(IngestionJob.source),
            selectinload(IngestionJob.item_logs)
        )
        .limit(1)
    )
    res = await session.execute(stmt)
    job = res.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingestion job #{job_id} not found"
        )

    response = IngestionJobDetailResponse.model_validate(job)
    if job.source:
        response.source_name = job.source.name
        response.connector_type = job.source.connector_type

    response.item_logs = [ItemLogResponse.model_validate(log) for log in job.item_logs]
    return response


@router.post("/jobs/{job_id}/retry", response_model=IngestionJobResponse)
async def retry_failed_job(
    job_id: int,
    session: AsyncSession = Depends(get_db)
):
    """Manually retries a failed or cancelled ingestion job."""
    stmt = select(IngestionJob).where(IngestionJob.id == job_id).limit(1)
    res = await session.execute(stmt)
    job = res.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingestion job #{job_id} not found"
        )

    if job.status == "RUNNING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is currently running."
        )

    job.status = "QUEUED"
    job.retry_count += 1
    job.error_summary = None
    job.error_type = None
    await session.commit()
    await session.refresh(job)

    return IngestionJobResponse.model_validate(job)


@router.post("/jobs/{job_id}/cancel", response_model=IngestionJobResponse)
async def cancel_job(
    job_id: int,
    session: AsyncSession = Depends(get_db)
):
    """Cancels a job if it is currently in QUEUED status."""
    stmt = select(IngestionJob).where(IngestionJob.id == job_id).limit(1)
    res = await session.execute(stmt)
    job = res.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingestion job #{job_id} not found"
        )

    if job.status != "QUEUED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job in status '{job.status}'"
        )

    job.status = "CANCELLED"
    job.finished_at = datetime.utcnow()
    await session.commit()
    await session.refresh(job)

    return IngestionJobResponse.model_validate(job)


@router.get("/contents", response_model=ContentListResponse)
async def list_canonical_contents(
    source_id: Optional[int] = Query(None),
    language: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db)
):
    """Browses normalized canonical content records persisted by Ingestion Engine."""
    query = select(CanonicalContent).join(ContentSource, ContentSource.id == CanonicalContent.source_id)

    filters = []
    if source_id:
        filters.append(CanonicalContent.source_id == source_id)
    if language and language != "all":
        filters.append(CanonicalContent.language == language)
    if status_filter and status_filter != "all":
        filters.append(CanonicalContent.status == status_filter.upper())
    if search:
        search_pattern = f"%{search.strip()}%"
        filters.append(
            func.or_(
                CanonicalContent.title.ilike(search_pattern),
                CanonicalContent.canonical_url.ilike(search_pattern)
            )
        )

    if filters:
        query = query.where(and_(*filters))

    count_stmt = select(func.count()).select_from(query.subquery())
    total_res = await session.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    query = (
        query
        .order_by(desc(CanonicalContent.created_at))
        .offset(offset)
        .limit(page_size)
        .options(selectinload(CanonicalContent.source))
    )

    res = await session.execute(query)
    contents = res.scalars().all()

    items = []
    for c in contents:
        item = ContentResponse.model_validate(c)
        if c.source:
            item.source_name = c.source.name
        items.append(item)

    return ContentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + len(items)) < total
    )
