"""AI quality diagnostics endpoints (Phase 11).

- GET  /api/v1/ai/quality/status       -> registry summary (tasks, criticality)
- GET  /api/v1/ai/quality/telemetry     -> privacy-safe in-memory aggregates
- GET  /api/v1/ai/quality/prompts       -> prompt registry (versions)
- POST /api/v1/ai/benchmark/run         -> run golden dataset (dev only)
- GET  /api/v1/ai/benchmark/{run_id}    -> persisted run + per-case results

All endpoints require ``AI_QUALITY_DIAGNOSTICS_ENABLED=true`` (default) and
return 404 in production. No endpoint ever returns raw learner content.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session
from app.models.quality import AIBenchmarkResult, AIBenchmarkRun
from app.prompts.registry import create_prompt_registry
from app.quality.benchmark import BenchmarkExecutor, filter_cases, load_golden_cases
from app.quality.service import create_quality_service
from app.quality.telemetry import telemetry
from app.repositories.quality import AIBenchmarkRunRepository
from app.schemas.quality import (
    BenchmarkResultSchema,
    BenchmarkRunRequest,
    BenchmarkRunSchema,
    QualityStatusResponse,
    TelemetryResponse,
)

logger = logging.getLogger("app.quality.api")

router = APIRouter(tags=["ai-quality"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _require_diagnostics() -> None:
    settings = get_settings()
    if not settings.ai_quality_diagnostics_enabled or settings.app_env == "production":
        raise HTTPException(status_code=404, detail="Not found")


@router.get("/quality/status", response_model=QualityStatusResponse)
async def quality_status() -> QualityStatusResponse:
    _require_diagnostics()
    service = create_quality_service()
    registry = service.registry
    return QualityStatusResponse(
        enabled=True,
        tasks=registry.tasks(),
        criticality={task: registry.criticality(task).value for task in registry.tasks()},
        thresholds={
            "min_confidence": service.settings.ai_quality_min_confidence,
            "max_provider_disagreement": service.settings.ai_quality_max_provider_disagreement,
            "max_retries": service.settings.ai_quality_max_retries,
            "verification_enabled": service.settings.ai_quality_verification_enabled,
            "escalation_enabled": service.settings.ai_quality_escalation_enabled,
        },
    )


@router.get("/quality/telemetry", response_model=TelemetryResponse)
async def quality_telemetry() -> TelemetryResponse:
    _require_diagnostics()
    return telemetry.snapshot()


@router.get("/quality/prompts")
async def quality_prompts() -> list[dict]:
    _require_diagnostics()
    return create_prompt_registry().to_public_dict()


@router.post("/benchmark/run", response_model=BenchmarkRunSchema)
async def run_benchmark(
    payload: BenchmarkRunRequest,
    session: DbSession,
) -> BenchmarkRunSchema:
    _require_diagnostics()
    service = create_quality_service()
    settings = get_settings()

    cases = load_golden_cases()
    selected = filter_cases(cases, categories=payload.categories, limit=payload.limit)
    if not selected:
        raise HTTPException(status_code=404, detail="No golden cases matched")

    provider = payload.provider or settings.ai_default_provider
    model = payload.model or ""

    executor = BenchmarkExecutor(service)
    aggregate = await executor.run(selected, provider=provider, model=model)

    run_repo = AIBenchmarkRunRepository(session)
    run = AIBenchmarkRun(
        provider=provider,
        model=model,
        status="completed",
        aggregate=aggregate,
    )
    saved = await run_repo.add(run)
    for case in aggregate.get("results", []):
        session.add(
            AIBenchmarkResult(
                run_id=saved.id,
                case_id=case.get("case_id", "unknown"),
                provider=provider,
                model=model,
                schema_pass=bool(case.get("schema_pass")),
                consistency_pass=bool(case.get("consistency_pass")),
                expected_properties_pass=bool(case.get("expected_properties_pass")),
                semantic_accuracy=case.get("semantic_accuracy"),
                false_positive_grammar=case.get("false_positive_grammar"),
                naturalness_agreement=case.get("naturalness_agreement"),
                latency_ms=case.get("latency_ms", 0),
                token_usage=case.get("token_usage"),
            )
        )
    await session.commit()
    return BenchmarkRunSchema.model_validate(saved)


@router.get("/benchmark/{run_id}", response_model=BenchmarkRunSchema)
async def get_benchmark(
    run_id: str,
    session: DbSession,
) -> BenchmarkRunSchema:
    _require_diagnostics()
    run_repo = AIBenchmarkRunRepository(session)
    run = await run_repo.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Benchmark run not found")
    return BenchmarkRunSchema.model_validate(run)


@router.get("/benchmark/{run_id}/results", response_model=list[BenchmarkResultSchema])
async def get_benchmark_results(
    run_id: str,
    session: DbSession,
) -> list[BenchmarkResultSchema]:
    _require_diagnostics()
    run_repo = AIBenchmarkRunRepository(session)
    run = await run_repo.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Benchmark run not found")
    results = await run_repo.results_for(run_id)
    return [BenchmarkResultSchema.model_validate(item) for item in results]
