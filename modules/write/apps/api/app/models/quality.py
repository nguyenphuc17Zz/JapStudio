"""AI quality telemetry & benchmark persistence (Phase 11).

Only privacy-safe fields are stored: task, provider, model, duration,
statuses, token usage and fingerprints — never raw user writing or prompts.
"""

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class AIQualityEvent(UUIDMixin, TimestampMixin, Base):
    """One AI quality event (call or validation) for audit/diagnostics."""

    __tablename__ = "ai_quality_events"
    __table_args__ = ({"comment": "Privacy-safe AI quality telemetry"},)

    task: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    provider: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_key: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failure_class: Mapped[str | None] = mapped_column(String(64), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    token_usage: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    quality_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    result_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    criticality: Mapped[str | None] = mapped_column(String(16), nullable=True)
    estimated_cost: Mapped[float | None] = mapped_column(Float, nullable=True)


class AIBenchmarkRun(UUIDMixin, TimestampMixin, Base):
    """One benchmark execution against a provider/model."""

    __tablename__ = "ai_benchmark_runs"

    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="completed", nullable=False)
    aggregate: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class AIBenchmarkResult(UUIDMixin, TimestampMixin, Base):
    """Per-case outcome of a benchmark run."""

    __tablename__ = "ai_benchmark_results"

    run_id: Mapped[str] = mapped_column(
        ForeignKey("ai_benchmark_runs.id", ondelete="CASCADE"), index=True, nullable=False
    )
    case_id: Mapped[str] = mapped_column(String(64), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(200), nullable=False)
    schema_pass: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consistency_pass: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expected_properties_pass: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    semantic_accuracy: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    false_positive_grammar: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    naturalness_agreement: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    token_usage: Mapped[dict | None] = mapped_column(JSON, nullable=True)
