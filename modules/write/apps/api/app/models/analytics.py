"""Product intelligence & learning analytics entities (Phase 14).

These tables hold the *measurement* layer of the product:

- ``analytics_events``: lightweight runtime product events (e.g. an exercise
  being opened). Only whitelisted metadata is stored — never raw learner
  answers, AI prompts, memory content or coach conversations.
- ``analytics_daily_metrics``: precomputed, idempotent daily aggregates (one
  row per (date, category, key, dimension, value)) so dashboards never query
  hundreds of raw rows per load.
- ``optimization_recommendations``: AI or manual product suggestions. They
  are advisory only — nothing in the system reads them to change behavior;
  a human must move them through pending -> accepted/rejected -> implemented.
- ``experiments`` / ``experiment_assignments``: a lightweight A/B foundation
  (control vs variant allocation) for future experimentation.

All ``user_id`` columns are nullable until authentication exists (same
convention as the rest of the schema); NULL rows represent the single
anonymous learner.
"""

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class AnalyticsEvent(UUIDMixin, TimestampMixin, Base):
    """One lightweight product event (privacy-safe metadata only)."""

    __tablename__ = "analytics_events"

    event_type: Mapped[str] = mapped_column(String(48), index=True, nullable=False)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    context: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )


class AnalyticsDailyMetric(UUIDMixin, TimestampMixin, Base):
    """One precomputed daily aggregate (idempotently upserted)."""

    __tablename__ = "analytics_daily_metrics"
    __table_args__ = (
        UniqueConstraint(
            "metric_date",
            "category",
            "metric_key",
            "dimension",
            "dimension_value",
            name="uq_analytics_daily_metric",
        ),
    )

    metric_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    metric_key: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dimension: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    dimension_value: Mapped[str | None] = mapped_column(String(128), nullable=True)
    value: Mapped[float] = mapped_column(nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)


class OptimizationRecommendation(UUIDMixin, TimestampMixin, Base):
    """One product optimization suggestion awaiting human approval.

    ``inference_type`` is ``observation`` or ``comparison`` — never causal
    (Phase 14 does not report fake causality). ``evidence`` holds the metric
    ids the recommendation actually references.
    """

    __tablename__ = "optimization_recommendations"

    area: Mapped[str] = mapped_column(String(64), nullable=False)
    priority: Mapped[str] = mapped_column(String(16), nullable=False)
    finding: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    confidence: Mapped[str] = mapped_column(String(16), nullable=False)
    inference_type: Mapped[str] = mapped_column(String(16), default="observation", nullable=False)
    source: Mapped[str] = mapped_column(String(64), default="manual", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True, nullable=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    metric_snapshot_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(64), nullable=True)


class Experiment(UUIDMixin, TimestampMixin, Base):
    """One lightweight A/B experiment (foundation only — no auto-wiring)."""

    __tablename__ = "experiments"

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    target: Mapped[str] = mapped_column(String(64), nullable=False)
    control: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    variant: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    allocation: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", index=True, nullable=False)
    metrics: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)


class ExperimentAssignment(UUIDMixin, TimestampMixin, Base):
    """One learner's deterministic arm assignment for an experiment."""

    __tablename__ = "experiment_assignments"
    __table_args__ = (
        UniqueConstraint("experiment_id", "user_id", name="uq_experiment_assignment"),
    )

    experiment_id: Mapped[str] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    arm: Mapped[str] = mapped_column(String(16), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
