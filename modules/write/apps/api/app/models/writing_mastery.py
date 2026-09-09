"""Writing Mastery & Boss Assessment Persistence (Phase 23).

Entities for tracking unassisted Boss Writing Tasks, multi-dimensional submissions,
8-dimension evaluations, 3-tier native rewrites, and longitudinal performance comparisons.
"""

from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class BossWritingTask(UUIDMixin, TimestampMixin, Base):
    """Unseen real-world writing evaluation challenge without scaffolding or translation."""

    __tablename__ = "boss_writing_tasks"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    task_type: Mapped[str] = mapped_column(
        String(32), index=True, nullable=False
    )  # business_email | absence_message | complaint | explanation | progress_update | opinion_paragraph
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    situation_vi: Mapped[str] = mapped_column(Text, nullable=False)
    context_vi: Mapped[str] = mapped_column(Text, nullable=False)
    audience: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship: Mapped[str] = mapped_column(String(255), nullable=False)
    target_register: Mapped[str] = mapped_column(String(64), nullable=False)
    required_constraints: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    forbidden_patterns: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    target_word_count_min: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    target_word_count_max: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    target_weakness_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    adversarial_traps: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    jlpt_level: Mapped[str] = mapped_column(String(8), default="N3", nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    status: Mapped[str] = mapped_column(
        String(24), index=True, default="pending", nullable=False
    )  # pending | in_progress | completed | expired
    generation_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class BossWritingSubmission(UUIDMixin, TimestampMixin, Base):
    """Submitted unassisted Boss Writing attempt and detailed 8-dimension evaluation."""

    __tablename__ = "boss_writing_submissions"

    task_id: Mapped[str] = mapped_column(
        ForeignKey("boss_writing_tasks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    character_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(24), default="evaluated", nullable=False
    )  # evaluated | failed
    overall_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    verdict: Mapped[str] = mapped_column(
        String(32), default="PASS", nullable=False
    )  # PASS_WITH_DISTINCTION | PASS | NEEDS_RETRY | FAILED
    scores: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False
    )  # 8 dimension scores
    feedback_vi: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    critical_gaps: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    rewrites: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False
    )  # minimal_fix, natural_polish, business_mastery
    historical_comparison: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False
    )  # deltas vs baseline/previous boss tasks
    weakness_impacts: Mapped[list] = mapped_column(
        JSON, default=list, nullable=False
    )  # list of weaknesses updated or regressed
    regression_diagnoses: Mapped[list] = mapped_column(
        JSON, default=list, nullable=False
    )  # root cause analysis for any regressed patterns
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
