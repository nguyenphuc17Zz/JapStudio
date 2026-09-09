"""Pydantic contracts for the AI quality layer (Phase 11)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class QualityResolutionResult(BaseModel):
    """Output of the ``quality_resolution:v1`` resolver stage.

    The resolver decides between primary and verifier outputs; it receives
    only the original task, both outputs and the deterministic check results,
    and must never invent information absent from those inputs.
    """

    final_decision: str = Field(pattern=r"^(accept|reject|revise)$")
    confidence: str = Field(pattern=r"^(high|medium|low)$")
    corrected_result: dict[str, Any] | None = None
    reason: str = Field(min_length=1, max_length=1000)


class QualityMetadata(BaseModel):
    """Compact quality metadata attached to important AI results."""

    quality_status: str
    confidence: str
    verification_used: bool = False
    verification_provider: str | None = None
    quality_version: str
    fingerprint: str | None = None
    violations: list[str] = Field(default_factory=list, max_length=10)
    reason: str | None = Field(default=None, max_length=1000)


class TaskHealthSchema(BaseModel):
    calls: int
    success_rate: float | None = None
    avg_latency_ms: float | None = None
    fallback_rate: float | None = None
    quality_pass_rate: float | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0


class TelemetryResponse(BaseModel):
    total_events: int
    overall: TaskHealthSchema
    tasks: dict[str, TaskHealthSchema]
    providers: dict[str, TaskHealthSchema]
    recent_failures: list[dict[str, Any]] = Field(default_factory=list, max_length=20)


class QualityStatusResponse(BaseModel):
    enabled: bool
    tasks: list[str]
    criticality: dict[str, str]
    thresholds: dict[str, Any]


class BenchmarkRunRequest(BaseModel):
    provider: str | None = None
    model: str | None = None
    categories: list[str] | None = None
    limit: int | None = Field(default=None, ge=1, le=200)


class BenchmarkCaseResultSchema(BaseModel):
    case_id: str
    category: str
    schema_pass: bool
    consistency_pass: bool
    expected_properties_pass: bool
    semantic_accuracy: bool | None = None
    false_positive_grammar: bool | None = None
    naturalness_agreement: bool | None = None
    latency_ms: int = 0
    token_usage: dict[str, int] | None = None


class BenchmarkResultSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    case_id: str
    provider: str
    model: str
    schema_pass: bool
    consistency_pass: bool
    expected_properties_pass: bool
    semantic_accuracy: bool | None = None
    false_positive_grammar: bool | None = None
    naturalness_agreement: bool | None = None
    latency_ms: int = 0
    token_usage: dict[str, int] | None = None
    created_at: datetime


class BenchmarkRunSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    model: str
    status: str
    aggregate: dict[str, Any] | None = None
    created_at: datetime
