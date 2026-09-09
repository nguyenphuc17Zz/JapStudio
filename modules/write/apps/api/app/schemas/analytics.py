"""API contracts for product intelligence & learning analytics (Phase 14)."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class AnalyticsMetricPoint(BaseModel):
    metric_key: str
    value: float | None = None
    sample_count: int = 0
    dimension: str | None = None
    dimension_value: str | None = None


class SkillOutcomeSchema(BaseModel):
    skill: str
    current: float | None = None
    baseline: float | None = None
    delta: float | None = None
    trend: str | None = None
    evidence_count: int = 0
    insufficient_evidence: bool = False
    note: str | None = None


class SummaryResponse(BaseModel):
    window: str
    active_days: int
    total_attempts: int
    completed_exercises: int
    evaluation_attempts: int
    discourse_submissions: int
    simulation_sessions: int
    discoveries: int
    scenarios_created: int
    recommendations_completed: int
    memories_created: int
    objectives_completed: int


class LearnerSummaryResponse(BaseModel):
    window: str
    skills: list[SkillOutcomeSchema]
    generated_at: datetime


class LearningOutcomesResponse(BaseModel):
    window: str
    skills: list[SkillOutcomeSchema]


class FeatureEffectivenessSchema(BaseModel):
    metric_key: str
    label: str
    value: float | None = None
    sample_count: int = 0
    trend: str | None = None
    insufficient_evidence: bool = False


class FeaturesResponse(BaseModel):
    window: str
    scenario_effectiveness: list[FeatureEffectivenessSchema]
    simulation_effectiveness: list[FeatureEffectivenessSchema]
    curriculum_effectiveness: list[FeatureEffectivenessSchema]
    recommendation_effectiveness: FeatureEffectivenessSchema | None = None
    difficulty_effectiveness: list[FeatureEffectivenessSchema]
    vocabulary_effectiveness: list[FeatureEffectivenessSchema]
    memory_effectiveness: list[FeatureEffectivenessSchema]


class AITelemetrySchema(BaseModel):
    task: str
    provider: str
    model: str | None = None
    calls: int
    success_rate: float | None = None
    quality_pass_rate: float | None = None
    avg_latency_ms: float | None = None
    fallback_rate: float | None = None
    estimated_cost_usd: float = 0.0
    prompt_version: str | None = None


class AICostSchema(BaseModel):
    metric_key: str
    label: str
    value: float | None = None
    dimension: str | None = None
    dimension_value: str | None = None
    sample_count: int = 0


class AIAnalyticsResponse(BaseModel):
    window: str
    overview: list[AICostSchema]
    by_task: list[AITelemetrySchema]
    by_provider: list[AITelemetrySchema]
    prompt_regressions: list[AITelemetrySchema]
    cost_by_provider: list[AICostSchema]
    cost_by_task: list[AICostSchema]


class CalibrationSchema(BaseModel):
    difficulty: int
    level: str | None = None
    exercise_type: str | None = None
    avg_score: float | None = None
    completion_rate: float | None = None
    attempt_count: int
    verdict: str
    note: str | None = None


class CalibrationResponse(BaseModel):
    window: str
    items: list[CalibrationSchema]


class FunnelStageSchema(BaseModel):
    stage: str
    value: int
    conversion: float | None = None


class FunnelResponse(BaseModel):
    window: str
    stages: list[FunnelStageSchema]


class RecommendationDecisionRequest(BaseModel):
    decision: str = Field(pattern=r"^(accept|reject|implement)$")
    note: str | None = Field(default=None, max_length=1000)


class RecommendationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    area: str
    priority: str
    finding: str
    recommended_action: str
    evidence: list[str]
    confidence: str
    inference_type: str
    source: str
    status: str
    created_at: datetime
    decided_at: datetime | None = None
    decision_note: str | None = None


class RecommendationsResponse(BaseModel):
    total: int
    items: list[RecommendationSchema]


class AnalyzeRequest(BaseModel):
    window: str = Field(default="30d", pattern=r"^(7d|14d|30d|90d|all_time)$")
    provider: str | None = None
    model: str | None = None


class AnalyzeResponse(BaseModel):
    recommendations: list[RecommendationSchema]
    insights: list[dict] = Field(default_factory=list)


class ExperimentCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    target: str = Field(min_length=1, max_length=64)
    control: dict = Field(default_factory=dict)
    variant: dict = Field(default_factory=dict)
    allocation: int = Field(default=50, ge=1, le=99)
    metrics: list[str] = Field(default_factory=list)


class ExperimentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    target: str
    control: dict
    variant: dict
    allocation: int
    status: str
    metrics: list[str]
    created_at: datetime


class ExperimentAssignRequest(BaseModel):
    user_id: str | None = None


class ExperimentAssignResponse(BaseModel):
    experiment_id: str
    arm: str
    assigned_at: datetime


class ExperimentMetricComparisonSchema(BaseModel):
    metric: str
    control_value: float | None = None
    variant_value: float | None = None
    delta: float | None = None
    sample_count: int = 0
    insufficient_evidence: bool = False


class ExperimentMetricsResponse(BaseModel):
    experiment_id: str
    comparisons: list[ExperimentMetricComparisonSchema]


class AggregateRequest(BaseModel):
    days: int | None = Field(default=None, ge=1, le=365)


class AggregateResponse(BaseModel):
    aggregated: int
    retained_days: int
    swept_events: int
    persisted_telemetry: int
    generated_at: datetime


class DailyMetricSchema(BaseModel):
    metric_date: date
    category: str
    metric_key: str
    value: float
    sample_count: int
    dimension: str | None = None
    dimension_value: str | None = None


class DailyMetricsResponse(BaseModel):
    items: list[DailyMetricSchema]
