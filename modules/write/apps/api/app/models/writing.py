"""Long-form writing entities (Phase 8): submissions, revisions,
discourse evaluations and their issues.

A submission is a chain of immutable revisions (Draft 1, Draft 2, ...).
Each revision links to exactly one ExerciseAttempt so the Phase 4-7 hooks
(vocabulary / adaptive / gamification) run unchanged. ``user_id`` columns
are nullable until authentication exists (same convention as the rest of
the schema); NULL rows represent the single anonymous learner.
"""

from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class WritingSubmission(UUIDMixin, TimestampMixin, Base):
    """One long-form writing task with an immutable revision chain."""

    __tablename__ = "writing_submissions"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    exercise_id: Mapped[str] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), index=True, nullable=False
    )
    mode: Mapped[str] = mapped_column(String(32), default="long_form", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="evaluated", nullable=False)


class WritingRevision(UUIDMixin, TimestampMixin, Base):
    """One immutable draft of a submission.

    Only the learning-mode state (hints_revealed_count, revealed) ever
    changes after creation; text and the attempt link never change.
    """

    __tablename__ = "writing_revisions"
    __table_args__ = (
        UniqueConstraint("submission_id", "revision_number", name="uq_writing_revision_number"),
    )

    submission_id: Mapped[str] = mapped_column(
        ForeignKey("writing_submissions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    attempt_id: Mapped[str | None] = mapped_column(
        ForeignKey("exercise_attempts.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=True,
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sentence_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hints_revealed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revealed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="evaluated", nullable=False)


class DiscourseEvaluation(UUIDMixin, TimestampMixin, Base):
    """The persisted discourse evaluation of one revision (immutable)."""

    __tablename__ = "discourse_evaluations"

    revision_id: Mapped[str] = mapped_column(
        ForeignKey("writing_revisions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    sentence_quality: Mapped[int] = mapped_column(Integer, nullable=False)
    discourse_quality: Mapped[int] = mapped_column(Integer, nullable=False)
    overall_writing: Mapped[int] = mapped_column(Integer, nullable=False)
    scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    sentence_scores: Mapped[list] = mapped_column(JSON, nullable=False)
    strengths: Mapped[list] = mapped_column(JSON, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    improved_structure: Mapped[str | None] = mapped_column(Text, nullable=True)
    rewrites: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    structure_suggestion: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    evaluation_version: Mapped[str] = mapped_column(String(64), nullable=False)
    provenance: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class DiscourseIssue(UUIDMixin, TimestampMixin, Base):
    """One location-aware discourse issue of an evaluation."""

    __tablename__ = "discourse_issues"

    evaluation_id: Mapped[str] = mapped_column(
        ForeignKey("discourse_evaluations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    issue_number: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    sentence_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sentence_range: Mapped[list | None] = mapped_column(JSON, nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_fix: Mapped[str] = mapped_column(Text, nullable=False)


class WritingScenario(UUIDMixin, TimestampMixin, Base):
    """One AI-generated real-world writing scenario (Phase 9).

    Scenarios are persisted so opening them never regenerates AI content;
    exercises link back via ``exercises.scenario_id``. Dimension fields use
    fixed vocabulary defined by the scenario taxonomy so the adaptive
    planner and evaluation stay deterministic.
    """

    __tablename__ = "writing_scenarios"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    genre: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    medium: Mapped[str] = mapped_column(String(24), nullable=False)
    audience: Mapped[str] = mapped_column(String(24), nullable=False)
    relationship: Mapped[str] = mapped_column(String(24), nullable=False)
    purpose: Mapped[str] = mapped_column(String(24), nullable=False)
    register: Mapped[str] = mapped_column(String(16), nullable=False)
    tone: Mapped[str] = mapped_column(String(24), nullable=False)
    target_length: Mapped[str] = mapped_column(String(24), nullable=False)
    jlpt_level: Mapped[str] = mapped_column(String(8), nullable=False)
    topic: Mapped[str] = mapped_column(String(100), nullable=False)
    situation_vi: Mapped[str] = mapped_column(Text, nullable=False)
    context_vi: Mapped[str] = mapped_column(Text, nullable=False)
    required_points: Mapped[list] = mapped_column(JSON, nullable=False)
    optional_points: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    forbidden_patterns: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    difficulty_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    generation_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="generated", nullable=False)
