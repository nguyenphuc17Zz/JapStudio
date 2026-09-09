from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.content import CanonicalContent
from app.models.source import ContentSource
from app.models.enrichment import (
    AIEnrichmentJob,
    ContentEnrichment,
    ContentSentence,
    ContentVocabulary,
    ContentExpression,
    ContentGrammar,
)
from app.schemas.enrichment import (
    AIEnrichmentJobResponse,
    AIEnrichmentJobListResponse,
    EnrichmentStatsResponse,
    ContentEnrichmentResponse,
    ContentSentenceResponse,
    ContentVocabularyResponse,
    ContentExpressionResponse,
    ContentGrammarResponse,
    EnrichmentDetailResponse,
    ReEnrichRequest,
    ProviderMetaResponse,
    AIModelMetaResponse,
    TestProviderRequest,
    TestProviderResponse,
    ConfigureProviderRequest,
    SelectModelRequest,
    SelectModelResponse,
)
from app.services.ai.provider_registry import ai_provider_registry
from app.services.enrichment_pipeline import EnrichmentPipelineService
from app.services.enrichment_worker import enrichment_worker_pool

router = APIRouter(prefix="/enrichment", tags=["AI Enrichment & Content Intelligence"])


class WorkerToggleRequest(BaseModel):
    enabled: bool


@router.get("/worker")
async def get_worker_status():
    """Returns the background enrichment worker kill-switch state."""
    return {
        "enabled": bool(settings.ENRICHMENT_WORKER_ENABLED),
        "worker_running": bool(getattr(enrichment_worker_pool, "_running", False)),
    }


@router.post("/worker")
async def set_worker_status(payload: WorkerToggleRequest):
    """Pauses/resumes the background enrichment worker.

    Pausing stops acquiring QUEUED jobs (in-flight jobs finish, nothing is
    deleted). Persisted to .env so it survives restarts.
    """
    settings.ENRICHMENT_WORKER_ENABLED = bool(payload.enabled)
    try:
        ai_provider_registry._persist_env_var(
            "ENRICHMENT_WORKER_ENABLED", "true" if payload.enabled else "false"
        )
    except Exception:
        pass
    return {
        "enabled": bool(settings.ENRICHMENT_WORKER_ENABLED),
        "message": "Đã BẬT hàng đợi AI." if payload.enabled else "Đã TẮT hàng đợi AI (job đang chạy sẽ xong nốt, job chờ giữ nguyên).",
    }


@router.get("/stats", response_model=EnrichmentStatsResponse)
async def get_enrichment_stats(db: AsyncSession = Depends(get_db)):
    """Returns aggregated pipeline telemetry: counts, today's tokens, and estimated cost."""
    # Group by status
    status_stmt = select(AIEnrichmentJob.status, func.count(AIEnrichmentJob.id)).group_by(AIEnrichmentJob.status)
    status_res = await db.execute(status_stmt)
    status_counts = dict(status_res.all())

    today_start = datetime.combine(date.today(), datetime.min.time())
    today_stmt = (
        select(
            func.sum(AIEnrichmentJob.input_tokens + AIEnrichmentJob.output_tokens),
            func.sum(AIEnrichmentJob.estimated_cost)
        )
        .where(AIEnrichmentJob.created_at >= today_start)
    )
    today_res = await db.execute(today_stmt)
    row = today_res.first()
    tokens_today = (row[0] or 0) if row else 0
    cost_today = float((row[1] or 0.0) if row else 0.0)

    return EnrichmentStatsResponse(
        queued=status_counts.get("QUEUED", 0),
        processing=status_counts.get("RUNNING", 0),
        success=status_counts.get("SUCCESS", 0),
        partial_success=status_counts.get("PARTIAL_SUCCESS", 0),
        failed=status_counts.get("FAILED", 0),
        tokens_today=tokens_today,
        estimated_cost_today_usd=round(cost_today, 4),
    )


@router.get("/jobs", response_model=AIEnrichmentJobListResponse)
async def list_enrichment_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    model_provider: Optional[str] = Query(None),
    model_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Lists enrichment jobs with optional filters, pagination, and joined content metadata."""
    query = select(AIEnrichmentJob).options(
        selectinload(AIEnrichmentJob.content).selectinload(CanonicalContent.source)
    )
    count_query = select(func.count(AIEnrichmentJob.id))

    filters = []
    if status_filter:
        filters.append(AIEnrichmentJob.status == status_filter.upper())
    if model_provider:
        filters.append(AIEnrichmentJob.model_provider == model_provider.lower())
    if model_name:
        filters.append(AIEnrichmentJob.model_name == model_name)

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * limit
    jobs_res = await db.execute(query.order_by(desc(AIEnrichmentJob.created_at)).offset(offset).limit(limit))
    jobs = jobs_res.scalars().all()

    items = []
    for j in jobs:
        c_title = j.content.title if j.content else None
        s_name = j.content.source.name if (j.content and j.content.source) else None
        items.append(
            AIEnrichmentJobResponse(
                id=j.id,
                content_id=j.content_id,
                content_title=c_title,
                source_name=s_name,
                job_type=j.job_type,
                status=j.status,
                attempt_count=j.attempt_count,
                max_attempts=j.max_attempts,
                started_at=j.started_at,
                finished_at=j.finished_at,
                model_provider=j.model_provider,
                model_name=j.model_name,
                prompt_version=j.prompt_version,
                input_tokens=j.input_tokens,
                output_tokens=j.output_tokens,
                estimated_cost=j.estimated_cost,
                latency_ms=j.latency_ms,
                error_type=j.error_type,
                error_message=j.error_message,
                stage_status_json=j.stage_status_json or {},
                created_at=j.created_at,
                updated_at=j.updated_at,
            )
        )

    return AIEnrichmentJobListResponse(items=items, total=total, page=page, limit=limit)


@router.get("/jobs/{job_id}", response_model=AIEnrichmentJobResponse)
async def get_job_detail(job_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches details of a specific enrichment job."""
    stmt = (
        select(AIEnrichmentJob)
        .where(AIEnrichmentJob.id == job_id)
        .options(selectinload(AIEnrichmentJob.content).selectinload(CanonicalContent.source))
    )
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="AI enrichment job not found")

    return AIEnrichmentJobResponse(
        id=job.id,
        content_id=job.content_id,
        content_title=job.content.title if job.content else None,
        source_name=job.content.source.name if (job.content and job.content.source) else None,
        job_type=job.job_type,
        status=job.status,
        attempt_count=job.attempt_count,
        max_attempts=job.max_attempts,
        started_at=job.started_at,
        finished_at=job.finished_at,
        model_provider=job.model_provider,
        model_name=job.model_name,
        prompt_version=job.prompt_version,
        input_tokens=job.input_tokens,
        output_tokens=job.output_tokens,
        estimated_cost=job.estimated_cost,
        latency_ms=job.latency_ms,
        error_type=job.error_type,
        error_message=job.error_message,
        stage_status_json=job.stage_status_json or {},
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.post("/jobs/{job_id}/retry", response_model=AIEnrichmentJobResponse)
async def retry_job(job_id: int, db: AsyncSession = Depends(get_db)):
    """Retries a failed or partial enrichment job by re-queuing it."""
    stmt = select(AIEnrichmentJob).where(AIEnrichmentJob.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="AI enrichment job not found")

    job.status = "QUEUED"
    job.error_message = None
    job.error_type = None
    await db.commit()
    await db.refresh(job)

    return AIEnrichmentJobResponse.model_validate(job)


@router.get("/providers", response_model=List[ProviderMetaResponse])
async def list_providers(include_mock: Optional[bool] = Query(None)):
    """Lists available AI providers (Gemini, Groq, Ollama) with their configuration and key status."""
    return ai_provider_registry.list_providers_meta(include_mock=include_mock)


@router.post("/providers/{name}/test", response_model=TestProviderResponse)
async def test_provider_connection(name: str, payload: Optional[TestProviderRequest] = None):
    """Tests connection to the specified AI provider with an optional key."""
    api_key = payload.api_key if payload else None
    success, message, models = await ai_provider_registry.test_provider_connection(name, api_key)
    return TestProviderResponse(
        success=success,
        message=message,
        models=[
            AIModelMetaResponse(
                id=m.id,
                name=m.name,
                provider=m.provider,
                description=m.description,
                context_window=m.context_window,
                is_active=m.is_active,
            )
            for m in models
        ]
    )


@router.post("/providers/{name}/configure", response_model=TestProviderResponse)
async def configure_provider(name: str, payload: ConfigureProviderRequest):
    """Configures and saves an API key for the provider after verifying connectivity."""
    clean_key = payload.api_key.strip()
    if not clean_key:
        raise HTTPException(status_code=400, detail="API key cannot be empty")

    success, message, models = await ai_provider_registry.test_provider_connection(name, clean_key)
    if not success:
        return TestProviderResponse(
            success=False,
            message=f"Kiểm tra thất bại. Không thể lưu cấu hình: {message}",
            models=[]
        )

    ai_provider_registry.update_provider_key(name, clean_key)
    return TestProviderResponse(
        success=True,
        message=f"Lưu và kích hoạt {name.upper()} thành công! {message}",
        models=[
            AIModelMetaResponse(
                id=m.id,
                name=m.name,
                provider=m.provider,
                description=m.description,
                context_window=m.context_window,
                is_active=m.is_active,
            )
            for m in models
        ]
    )


@router.get("/models", response_model=List[AIModelMetaResponse])
async def list_models(provider: Optional[str] = Query(None)):
    """Dynamically queries the provider's actual API to list supported models."""
    models = await ai_provider_registry.list_models(provider)
    from app.core.config import settings

    return [
        AIModelMetaResponse(
            id=m.id,
            name=m.name,
            provider=m.provider,
            description=m.description,
            context_window=m.context_window,
            is_active=(m.id == settings.DEFAULT_AI_MODEL and m.provider.lower() == settings.DEFAULT_AI_PROVIDER.lower()),
        )
        for m in models
    ]


@router.post("/models/select", response_model=SelectModelResponse)
async def select_active_model(payload: SelectModelRequest):
    """Sets a specific model as the active default model for enrichment.

    Validates the id against the provider's live model list first so a
    typo'd or retired model can never be persisted     (it would break every AI
    feature with an opaque 400 from the provider).
    """
    p_name = payload.provider.strip().lower()
    m_id = payload.model_id.strip()

    if not p_name or not m_id:
        raise HTTPException(status_code=400, detail="Provider and model_id cannot be empty")

    if p_name not in ("gemini", "groq", "ollama", "mock"):
        raise HTTPException(status_code=400, detail=f"Provider '{p_name}' không tồn tại trong hệ thống.")

    try:
        live_models = await ai_provider_registry.list_models(p_name)
    except Exception:
        live_models = []
    live_ids = [m.id for m in (live_models or [])]
    if live_ids and m_id not in live_ids:
        suggestions = [i for i in live_ids if m_id.split("/")[-1][:8].lower() in i.lower()]
        hint = f" Gợi ý gần đúng: {', '.join(suggestions[:3])}." if suggestions else ""
        raise HTTPException(
            status_code=400,
            detail=f"Model '{m_id}' không tồn tại trên {p_name.upper()} (danh sách live có {len(live_ids)} models).{hint} Hãy chọn model trong danh sách.",
        )

    ai_provider_registry.set_active_model(p_name, m_id)

    return SelectModelResponse(
        success=True,
        message=f"Đã đặt '{m_id}' ({p_name.upper()}) làm Model chính cho AI Pipeline.",
        provider=p_name,
        model_id=m_id,
    )




@router.get("/content/{content_id}", response_model=EnrichmentDetailResponse)
async def get_content_enrichment(content_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieves full structured learning intelligence for a content item."""
    db.expire_all()
    stmt = (
        select(CanonicalContent)
        .where(CanonicalContent.id == content_id)
        .execution_options(populate_existing=True)
        .options(
            selectinload(CanonicalContent.source),
            selectinload(CanonicalContent.enrichment),
            selectinload(CanonicalContent.sentences),
            selectinload(CanonicalContent.vocabularies),
            selectinload(CanonicalContent.expressions),
            selectinload(CanonicalContent.grammars),
            selectinload(CanonicalContent.enrichment_jobs),
        )
    )
    res = await db.execute(stmt)
    content = res.scalars().first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Latest job
    latest_job_obj = None
    if content.enrichment_jobs:
        sorted_jobs = sorted(content.enrichment_jobs, key=lambda j: j.created_at, reverse=True)
        latest_job_obj = sorted_jobs[0]

    enrichment_resp = (
        ContentEnrichmentResponse.model_validate(content.enrichment) if content.enrichment else None
    )

    return EnrichmentDetailResponse(
        content_id=content.id,
        title=content.title,
        canonical_url=content.canonical_url,
        source_id=content.source_id,
        source_name=content.source.name if content.source else "Unknown",
        enrichment_status=content.enrichment_status,
        enrichment=enrichment_resp,
        sentences=[ContentSentenceResponse.model_validate(s) for s in sorted(content.sentences, key=lambda x: x.sentence_index)],
        vocabularies=[ContentVocabularyResponse.model_validate(v) for v in sorted(content.vocabularies, key=lambda x: x.learning_priority, reverse=True)],
        expressions=[ContentExpressionResponse.model_validate(e) for e in sorted(content.expressions, key=lambda x: x.learning_priority, reverse=True)],
        grammars=[ContentGrammarResponse.model_validate(g) for g in content.grammars],
        latest_job=AIEnrichmentJobResponse.model_validate(latest_job_obj) if latest_job_obj else None,
    )


@router.post("/content/{content_id}/re-enrich", response_model=EnrichmentDetailResponse)
async def re_enrich_content(
    content_id: int,
    req: ReEnrichRequest,
    background: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Triggers re-enrichment for a content item. Synchronous by default, or background queue if background=true."""
    stmt = select(CanonicalContent).where(CanonicalContent.id == content_id)
    res = await db.execute(stmt)
    content = res.scalars().first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    if background:
        await enrichment_worker_pool.enqueue(
            db=db,
            content_id=content_id,
            task=req.task,
            model_provider=req.model_provider,
            model_name=req.model_name,
            force=req.force
        )
        return await get_content_enrichment(content_id=content_id, db=db)

    # Run synchronously
    await EnrichmentPipelineService.enrich_content(
        db=db,
        content_id=content_id,
        task=req.task,
        model_provider=req.model_provider,
        model_name=req.model_name,
        force=req.force
    )

    return await get_content_enrichment(content_id=content_id, db=db)
