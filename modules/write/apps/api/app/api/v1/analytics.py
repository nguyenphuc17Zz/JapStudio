"""Product intelligence & learning analytics endpoints (Phase 14).

- GET    /api/v1/analytics/learner-summary  -> learner skill outcomes (NOT gated)
- GET    /api/v1/analytics/summary           -> activity summary
- GET    /api/v1/analytics/learning-outcomes -> skill outcomes per window
- GET    /api/v1/analytics/features          -> feature effectiveness
- GET    /api/v1/analytics/ai                -> AI quality telemetry
- GET    /api/v1/analytics/cost              -> AI cost analytics
- GET    /api/v1/analytics/calibration       -> difficulty calibration
- GET    /api/v1/analytics/funnel            -> product funnel
- GET    /api/v1/analytics/recommendations   -> optimization recommendations
- POST   /api/v1/analytics/recommendations/{id}/decision -> human decision
- POST   /api/v1/analytics/analyze           -> advisory AI product analysis
- POST   /api/v1/analytics/recommendations/draft -> single draft
- POST   /api/v1/analytics/experiments       -> create experiment
- GET    /api/v1/analytics/experiments       -> list experiments
- GET    /api/v1/analytics/experiments/{id}/metrics -> control vs variant
- POST   /api/v1/analytics/experiments/{id}/assign  -> deterministic arm
- POST   /api/v1/analytics/experiments/{id}/analyze -> advisory analysis
- POST   /api/v1/analytics/aggregate         -> daily aggregation + retention

All endpoints except ``learner-summary`` require ``AI_ANALYTICS_ENABLED=true``
(default) and return 404 in production. The AI never executes anything — it
only produces advisory recommendations awaiting human approval.
"""

import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.models.analytics import Experiment
from app.repositories.analytics import (
    ExperimentRepository,
    OptimizationRecommendationRepository,
)
from app.schemas.analytics import (
    AggregateRequest,
    AggregateResponse,
    AIAnalyticsResponse,
    AICostSchema,
    AITelemetrySchema,
    AnalyzeRequest,
    AnalyzeResponse,
    CalibrationResponse,
    DailyMetricsResponse,
    ExperimentAssignRequest,
    ExperimentAssignResponse,
    ExperimentCreateRequest,
    ExperimentMetricsResponse,
    ExperimentSchema,
    FeaturesResponse,
    FunnelResponse,
    LearnerSummaryResponse,
    LearningOutcomesResponse,
    RecommendationDecisionRequest,
    RecommendationSchema,
    RecommendationsResponse,
    SkillOutcomeSchema,
    SummaryResponse,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.analytics.aggregation import AnalyticsAggregationService
from app.services.analytics.analysis import AnalyticsAnalysisService
from app.services.analytics.calibration import DifficultyCalibrationService
from app.services.analytics.effectiveness import FeatureEffectivenessService
from app.services.analytics.experiments import ExperimentService
from app.services.analytics.funnel import FunnelService
from app.services.analytics.outcomes import LearningOutcomesService
from app.services.analytics.provider_cost import ProviderCostService
from app.services.analytics.retention import AnalyticsSummaryService

logger = logging.getLogger("app.analytics.api")

router = APIRouter(tags=["analytics"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _require_analytics() -> None:
    settings = get_settings()
    if not settings.ai_analytics_enabled or settings.app_env == "production":
        raise HTTPException(status_code=404, detail="Not found")


async def _effective_settings(session: AsyncSession) -> Settings:
    return await AIConfigService().get_effective_settings(session)


def _skill_schema(item: dict) -> SkillOutcomeSchema:
    return SkillOutcomeSchema(
        skill=item["skill"],
        current=item["current"],
        baseline=item["baseline"],
        delta=item["delta"],
        trend=item["trend"],
        evidence_count=item["evidence_count"],
        insufficient_evidence=item["insufficient_evidence"],
        note="Dữ liệu chưa đủ để so sánh nửa đầu/nửa sau cửa sổ."
        if item["insufficient_evidence"]
        else None,
    )


@router.get("/learner-summary", response_model=LearnerSummaryResponse)
async def learner_summary(
    session: DbSession,
    window: str = Query(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> LearnerSummaryResponse:
    settings = await _effective_settings(session)
    outcomes = await LearningOutcomesService(session, settings).compute(
        window, min_evidence=settings.analytics_learner_min_evidence
    )
    return LearnerSummaryResponse(
        window=window,
        skills=[_skill_schema(item) for item in outcomes],
        generated_at=datetime.now(timezone.utc),
    )


@router.get("/summary", response_model=SummaryResponse)
async def summary(
    session: DbSession,
    window: str = Query(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> SummaryResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    return SummaryResponse(**await AnalyticsSummaryService(session, settings).compute(window))


@router.get("/learning-outcomes", response_model=LearningOutcomesResponse)
async def learning_outcomes(
    session: DbSession,
    window: str = Query(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> LearningOutcomesResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    outcomes = await LearningOutcomesService(session, settings).compute(window)
    return LearningOutcomesResponse(
        window=window, skills=[_skill_schema(item) for item in outcomes]
    )


@router.get("/features", response_model=FeaturesResponse)
async def features(
    session: DbSession,
    window: str = Query(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> FeaturesResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    data = await FeatureEffectivenessService(session, settings).compute(window)
    return FeaturesResponse(
        window=window,
        scenario_effectiveness=data["scenario_effectiveness"],
        simulation_effectiveness=data["simulation_effectiveness"],
        curriculum_effectiveness=data["curriculum_effectiveness"],
        recommendation_effectiveness=data["recommendation_effectiveness"],
        difficulty_effectiveness=data["difficulty_effectiveness"],
        vocabulary_effectiveness=data["vocabulary_effectiveness"],
        memory_effectiveness=data["memory_effectiveness"],
    )


@router.get("/ai", response_model=AIAnalyticsResponse)
async def ai_analytics(
    session: DbSession,
    window: str = Query(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> AIAnalyticsResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    data = await ProviderCostService(session, settings).compute(window)
    return AIAnalyticsResponse(
        window=window,
        overview=data["overview"],
        by_task=[AITelemetrySchema(**row) for row in data["by_task"]],
        by_provider=[AITelemetrySchema(**row) for row in data["by_provider"]],
        prompt_regressions=data["prompt_regressions"],
        cost_by_provider=[AICostSchema(**row) for row in data["cost_by_provider"]],
        cost_by_task=[AICostSchema(**row) for row in data["cost_by_task"]],
    )


@router.get("/cost", response_model=AIAnalyticsResponse)
async def ai_cost(
    session: DbSession,
    window: str = Query(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> AIAnalyticsResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    data = await ProviderCostService(session, settings).compute(window)
    return AIAnalyticsResponse(
        window=window,
        overview=data["overview"],
        by_task=[AITelemetrySchema(**row) for row in data["by_task"]],
        by_provider=[AITelemetrySchema(**row) for row in data["by_provider"]],
        prompt_regressions=data["prompt_regressions"],
        cost_by_provider=[AICostSchema(**row) for row in data["cost_by_provider"]],
        cost_by_task=[AICostSchema(**row) for row in data["cost_by_task"]],
    )


@router.get("/calibration", response_model=CalibrationResponse)
async def calibration(
    session: DbSession,
    window: str = Query(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> CalibrationResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    items = await DifficultyCalibrationService(session, settings).compute(window)
    return CalibrationResponse(window=window, items=items)


@router.get("/funnel", response_model=FunnelResponse)
async def funnel(
    session: DbSession,
    window: str = Query(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> FunnelResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    data = await FunnelService(session, settings).compute(window)
    return FunnelResponse(window=window, stages=data["stages"])


@router.get("/recommendations", response_model=RecommendationsResponse)
async def recommendations(
    session: DbSession,
    status: str | None = Query(default=None, pattern=r"^(pending|accepted|rejected|implemented)$"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> RecommendationsResponse:
    _require_analytics()
    repository = OptimizationRecommendationRepository(session)
    items, total = await repository.list_by_status(status, skip=skip, limit=limit)
    return RecommendationsResponse(
        total=total,
        items=[RecommendationSchema.model_validate(item) for item in items],
    )


@router.post("/recommendations/{recommendation_id}/decision", response_model=RecommendationSchema)
async def recommendation_decision(
    session: DbSession,
    recommendation_id: str,
    payload: RecommendationDecisionRequest,
) -> RecommendationSchema:
    _require_analytics()
    repository = OptimizationRecommendationRepository(session)
    recommendation = await repository.get(recommendation_id)
    if recommendation is None:
        raise NotFoundError(f"Recommendation '{recommendation_id}' not found")
    if recommendation.status != "pending":
        raise HTTPException(status_code=409, detail="Only pending recommendations can be decided")
    recommendation.status = {
        "accept": "accepted",
        "reject": "rejected",
        "implement": "implemented",
    }[payload.decision]
    recommendation.decided_at = datetime.now(timezone.utc)
    recommendation.decision_note = payload.note
    saved = await repository.update(recommendation)
    return RecommendationSchema.model_validate(saved)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    session: DbSession,
    payload: AnalyzeRequest,
) -> AnalyzeResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    service = AnalyticsAnalysisService(session, AIService(settings=settings), settings=settings)
    result = await service.product_analysis(
        payload.window,
        provider=payload.provider,
        model=payload.model,
    )
    if not result["recommendations"]:
        rejected_msg = "; ".join(result.get("rejected", []))
        detail = (
            rejected_msg
            if rejected_msg
            else "Chưa có đủ dữ liệu bài tập trong giai đoạn này để AI đưa ra khuyến nghị."
        )
        raise HTTPException(
            status_code=422,
            detail=detail,
        )
    return AnalyzeResponse(
        recommendations=[
            RecommendationSchema.model_validate(item) for item in result["recommendations"]
        ],
        insights=result["insights"],
    )


@router.post("/recommendations/draft", response_model=RecommendationSchema)
async def draft_recommendation(
    session: DbSession,
    payload: dict,
) -> RecommendationSchema:
    _require_analytics()
    area = str(payload.get("area", "")).strip()
    finding = str(payload.get("finding", "")).strip()
    if not area or not finding:
        raise HTTPException(status_code=422, detail="area and finding are required")
    settings = await _effective_settings(session)
    service = AnalyticsAnalysisService(session, AIService(settings=settings), settings=settings)
    result = await service.draft_recommendation(area=area, finding=finding)
    if result["draft"] is None:
        raise HTTPException(
            status_code=422, detail="; ".join(result.get("rejected", [])) or "Draft rejected"
        )
    return RecommendationSchema.model_validate(result["draft"])


@router.post("/experiments", response_model=ExperimentSchema, status_code=201)
async def create_experiment(
    session: DbSession,
    payload: ExperimentCreateRequest,
) -> ExperimentSchema:
    _require_analytics()
    repository = ExperimentRepository(session)
    if await repository.get_by_name(payload.name) is not None:
        raise HTTPException(status_code=409, detail="Experiment name already exists")
    experiment = Experiment(
        name=payload.name,
        description=payload.description,
        target=payload.target,
        control=payload.control,
        variant=payload.variant,
        allocation=payload.allocation,
        metrics=payload.metrics,
        status="draft",
    )
    saved = await repository.add(experiment)
    return ExperimentSchema.model_validate(saved)


@router.get("/experiments", response_model=list[ExperimentSchema])
async def list_experiments(
    session: DbSession,
    status: str | None = Query(default=None, pattern=r"^(draft|active|completed|archived)$"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[ExperimentSchema]:
    _require_analytics()
    items, _ = await ExperimentRepository(session).list_by_status(status, skip=skip, limit=limit)
    return [ExperimentSchema.model_validate(item) for item in items]


@router.get("/experiments/{experiment_id}/metrics", response_model=ExperimentMetricsResponse)
async def experiment_metrics(
    session: DbSession,
    experiment_id: str,
    window: str = Query(default="all_time", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> ExperimentMetricsResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    experiment = await ExperimentRepository(session).get(experiment_id)
    if experiment is None:
        raise NotFoundError(f"Experiment '{experiment_id}' not found")
    comparisons = await ExperimentService(session, settings).metrics(experiment, window)
    return ExperimentMetricsResponse(experiment_id=experiment_id, comparisons=comparisons)


@router.post("/experiments/{experiment_id}/assign", response_model=ExperimentAssignResponse)
async def assign_experiment(
    session: DbSession,
    experiment_id: str,
    payload: ExperimentAssignRequest,
) -> ExperimentAssignResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    experiment = await ExperimentRepository(session).get(experiment_id)
    if experiment is None:
        raise NotFoundError(f"Experiment '{experiment_id}' not found")
    assignment = await ExperimentService(session, settings).assign(experiment, payload.user_id)
    return ExperimentAssignResponse(
        experiment_id=experiment_id,
        arm=assignment.arm,
        assigned_at=assignment.assigned_at,
    )


@router.post("/experiments/{experiment_id}/analyze")
async def analyze_experiment(
    session: DbSession,
    experiment_id: str,
    window: str = Query(default="all_time", pattern=r"^(7d|14d|30d|90d|all_time)$"),
) -> dict:
    _require_analytics()
    settings = await _effective_settings(session)
    experiment = await ExperimentRepository(session).get(experiment_id)
    if experiment is None:
        raise NotFoundError(f"Experiment '{experiment_id}' not found")
    service = ExperimentService(session, settings)
    comparisons = await service.metrics(experiment, window)
    analysis = AnalyticsAnalysisService(session, AIService(settings=settings), settings=settings)
    result = await analysis.analyze_experiment(experiment, comparisons)
    if result["analysis"] is None:
        raise HTTPException(
            status_code=422, detail="; ".join(result.get("rejected", [])) or "Analysis rejected"
        )
    return result["analysis"]


@router.post("/aggregate", response_model=AggregateResponse)
async def aggregate(
    session: DbSession,
    payload: AggregateRequest,
) -> AggregateResponse:
    _require_analytics()
    settings = await _effective_settings(session)
    result = await AnalyticsAggregationService(session, settings).run(payload.days)
    return AggregateResponse(**result)


@router.get("/daily-metrics", response_model=DailyMetricsResponse)
async def daily_metrics(
    session: DbSession,
    category: str | None = Query(default=None, max_length=32),
) -> DailyMetricsResponse:
    _require_analytics()
    await _effective_settings(session)
    from app.repositories.analytics import AnalyticsDailyMetricRepository
    from app.schemas.analytics import DailyMetricSchema

    items = await AnalyticsDailyMetricRepository(session).in_range(category=category)
    return DailyMetricsResponse(items=[DailyMetricSchema.model_validate(item) for item in items])
