"""Writing Intelligence persistence (Phase 16).

Entities for tracking recurring writing weaknesses, mastery lifecycle,
and aggregated writing fingerprint dimensions across practice and submissions.
"""

from __future__ import annotations

from sqlalchemy import (
    JSON,
    Computed,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class WritingWeakness(UUIDMixin, TimestampMixin, Base):
    """Normalized recurring writing weakness with mastery and confidence tracking."""

    __tablename__ = "writing_weaknesses"
    __table_args__ = (UniqueConstraint("weakness_key", name="uq_writing_weakness_key"),)

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    category: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    subtype: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    examples: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    frequency: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    first_seen_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    severity: Mapped[str] = mapped_column(String(16), default="minor", nullable=False)
    recurrence_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    corrected_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    exposure_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    mastery_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    confidence: Mapped[str] = mapped_column(String(16), default="low", nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), index=True, default="new", nullable=False
    )  # new | recurring | persistent | improving | mastered | regressed
    lifecycle_state: Mapped[str] = mapped_column(
        String(24), index=True, default="new", nullable=False
    )  # new | observed | recurring | targeted | improving | stable | mastered | recurrent
    correct_count_by_context: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    incorrect_count_by_context: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    context_generalization_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    register_diversity_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_correct_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_incorrect_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    days_since_last_error: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    retest_due_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    retest_interval_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    retest_passed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mastery_evidence: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    mastery_history: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    mastery_narrative: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    narrative_generated_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    affected_registers: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    affected_contexts: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    affected_jlpt_levels: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    related_expressions: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    related_grammar_patterns: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    evidence_refs: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    weakness_key: Mapped[str] = mapped_column(
        String(300),
        Computed(
            "CONCAT(COALESCE(user_id,''),'#',category,'#',subtype)",
            persisted=False,
        ),
        nullable=False,
    )
