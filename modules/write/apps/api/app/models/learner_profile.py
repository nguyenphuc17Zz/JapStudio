from __future__ import annotations

from sqlalchemy import (
    JSON,
    Boolean,
    Computed,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class LearnerProfile(UUIDMixin, TimestampMixin, Base):
    """Persistent learner profile (Phase 6 adaptive engine).

    ``user_id`` is nullable until authentication exists; null rows represent
    the single anonymous learner (same convention as ``user_vocabulary``).

    Structured, AI-derived profile data (skills, topics, registers, patterns,
    strengths, weaknesses, estimated JLPT range, trends) lives in
    ``adaptive_state``; scalar fields (goal, target JLPT, preferences) stay
    queryable. Deterministic evidence is authoritative; AI output only
    summarizes it.
    """

    __tablename__ = "learner_profiles"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=True
    )
    native_language: Mapped[str] = mapped_column(String(10), default="vi", nullable=False)
    target_level: Mapped[str | None] = mapped_column(String(20))
    goal: Mapped[str | None] = mapped_column(String(50))
    goal_type: Mapped[str | None] = mapped_column(String(32), index=True)
    target_jlpt: Mapped[str | None] = mapped_column(String(8))
    daily_target: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    preferred_registers: Mapped[list | None] = mapped_column(JSON)
    preferred_topics: Mapped[list | None] = mapped_column(JSON)
    evaluations_since_synthesis: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    profile_version: Mapped[str] = mapped_column(
        String(32), default="learner_profile:v1", nullable=False
    )
    preferences: Mapped[dict | None] = mapped_column(JSON)
    adaptive_state: Mapped[dict | None] = mapped_column(JSON)

    user: Mapped[User | None] = relationship(back_populates="learner_profile")


class MistakePattern(UUIDMixin, TimestampMixin, Base):
    """One clustered, recurring mistake pattern with evidence counters."""

    __tablename__ = "mistake_patterns"
    __table_args__ = (UniqueConstraint("pattern_key", name="uq_mistake_pattern_label"),)

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    canonical_label: Mapped[str] = mapped_column(String(255), nullable=False)
    pattern_key: Mapped[str] = mapped_column(
        String(300),
        Computed("CONCAT(COALESCE(user_id,''),'#',canonical_label)", persisted=False),
        nullable=False,
    )
    description_vi: Mapped[str] = mapped_column(String(1000), nullable=False)
    examples: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recent_evidence_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_seen_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    confidence: Mapped[str] = mapped_column(String(16), default="low", nullable=False)
    provenance: Mapped[dict | None] = mapped_column(JSON)


class LearningRecommendation(UUIDMixin, TimestampMixin, Base):
    """One persisted adaptive decision (planner output + provenance).

    ``skill_before`` captures the targeted skill scores when the
    recommendation was made; ``skill_after`` is filled when a completed
    attempt is linked, enabling effectiveness measurement.
    """

    __tablename__ = "learning_recommendations"
    __table_args__ = (
        UniqueConstraint("active_recommendation_key", name="uq_recommendation_active"),
    )

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    exercise_id: Mapped[str | None] = mapped_column(
        ForeignKey("exercises.id", ondelete="SET NULL"), index=True, nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="recommended", nullable=False)
    active_recommendation_key: Mapped[str | None] = mapped_column(
        String(36),
        Computed(
            "CASE WHEN status = 'recommended' THEN COALESCE(user_id,'') ELSE NULL END",
            persisted=False,
        ),
        nullable=True,
    )
    strategy: Mapped[str] = mapped_column(String(32), nullable=False)
    exercise_type: Mapped[str] = mapped_column(String(32), nullable=False)
    topic: Mapped[str] = mapped_column(String(100), nullable=False)
    register: Mapped[str] = mapped_column(String(16), nullable=False)
    jlpt_level: Mapped[str] = mapped_column(String(8), nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    target_length: Mapped[str] = mapped_column(String(32), nullable=False)
    scenario_genre: Mapped[str | None] = mapped_column(String(32), nullable=True)
    focus_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    explanation: Mapped[str | None] = mapped_column(String(2000))
    objective_id: Mapped[str | None] = mapped_column(
        ForeignKey("learning_objectives.id", ondelete="SET NULL"), index=True, nullable=True
    )
    milestone_id: Mapped[str | None] = mapped_column(
        ForeignKey("learning_milestones.id", ondelete="SET NULL"), index=True, nullable=True
    )
    evidence_ids: Mapped[dict | None] = mapped_column(JSON)
    skill_before: Mapped[dict | None] = mapped_column(JSON)
    skill_after: Mapped[dict | None] = mapped_column(JSON)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)
    recommendation_version: Mapped[str] = mapped_column(
        String(32), default="learning_planner:v1", nullable=False
    )


class LearningSession(UUIDMixin, TimestampMixin, Base):
    """Lightweight daily practice session around adaptive recommendations."""

    __tablename__ = "learning_sessions"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    goal: Mapped[str | None] = mapped_column(String(50))
    recommended_focus: Mapped[list | None] = mapped_column(JSON)
    exercises_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    summary: Mapped[dict | None] = mapped_column(JSON)
    ended_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
