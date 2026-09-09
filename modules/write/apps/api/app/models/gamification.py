"""Gamification entities (Phase 7): XP ledger, streaks, daily goals,
missions, challenges and milestones.

All ``user_id`` columns are nullable until authentication exists (same
convention as ``learner_profiles``); NULL rows represent the single
anonymous learner.

The XP event ledger is immutable: XP is never incremented in place, every
award is a row with an idempotency key guarded by a unique constraint.
"""

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Computed,
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


class XPEvent(UUIDMixin, TimestampMixin, Base):
    """One immutable XP award (the auditable event ledger)."""

    __tablename__ = "xp_events"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_xp_event_idempotency"),
    )

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(96), nullable=False)
    event_metadata: Mapped[dict | None] = mapped_column(JSON)


class UserStreak(UUIDMixin, TimestampMixin, Base):
    """One streak row per learner; day boundaries use the app timezone."""

    __tablename__ = "user_streaks"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=True
    )
    current_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_active_date: Mapped[date | None] = mapped_column(Date, nullable=True)


class DailyGoal(UUIDMixin, TimestampMixin, Base):
    """One goal row per learner per day; target comes from the learner profile."""

    __tablename__ = "daily_goals"
    __table_args__ = (UniqueConstraint("user_id", "goal_date", name="uq_daily_goal_user_date"),)

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    goal_date: Mapped[date] = mapped_column(Date, nullable=False)
    target: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DailyMission(UUIDMixin, TimestampMixin, Base):
    """Today's AI mission; one active mission per learner per day.

    Regeneration archives the old row (``status`` -> archived) and creates a
    replacement; archived missions never double-count completion.
    """

    __tablename__ = "daily_missions"
    __table_args__ = (UniqueConstraint("active_mission_key", name="uq_daily_mission_active"),)

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    mission_date: Mapped[date] = mapped_column(Date, nullable=False)
    mission_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    focus_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    topic: Mapped[str] = mapped_column(String(100), nullable=False)
    register: Mapped[str] = mapped_column(String(16), nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    objective_id: Mapped[str | None] = mapped_column(
        ForeignKey("learning_objectives.id", ondelete="SET NULL"), index=True, nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    active_mission_key: Mapped[str | None] = mapped_column(
        String(60),
        Computed(
            "CASE WHEN status = 'active' THEN CONCAT(COALESCE(user_id,''),'#',"
            "CAST(mission_date AS CHAR)) ELSE NULL END",
            persisted=False,
        ),
        nullable=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)


class Challenge(UUIDMixin, TimestampMixin, Base):
    """One AI challenge with a linked exercise (reuses the Phase 3/4 pipeline)."""

    __tablename__ = "challenges"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    challenge_type: Mapped[str] = mapped_column(String(32), nullable=False)
    instruction_vi: Mapped[str] = mapped_column(Text, nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    target_skill: Mapped[str] = mapped_column(String(32), nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    objective: Mapped[str] = mapped_column(String(500), nullable=False)
    required_expression: Mapped[str | None] = mapped_column(String(100))
    exercise_id: Mapped[str | None] = mapped_column(
        ForeignKey("exercises.id", ondelete="SET NULL"), index=True, nullable=True
    )
    objective_id: Mapped[str | None] = mapped_column(
        ForeignKey("learning_objectives.id", ondelete="SET NULL"), index=True, nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)


class ChallengeAttempt(UUIDMixin, TimestampMixin, Base):
    """One persisted challenge attempt (append-only, never overwritten)."""

    __tablename__ = "challenge_attempts"
    __table_args__ = (UniqueConstraint("challenge_id", "attempt_id", name="uq_challenge_attempt"),)

    challenge_id: Mapped[str] = mapped_column(
        ForeignKey("challenges.id", ondelete="CASCADE"), index=True, nullable=False
    )
    attempt_id: Mapped[str] = mapped_column(
        ForeignKey("exercise_attempts.id", ondelete="CASCADE"), index=True, nullable=False
    )
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Milestone(UUIDMixin, TimestampMixin, Base):
    """One achieved milestone (deterministic threshold; created exactly once)."""

    __tablename__ = "milestones"
    __table_args__ = (UniqueConstraint("user_id", "milestone_key", name="uq_milestone_user_key"),)

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    milestone_key: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    achieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    celebration: Mapped[dict | None] = mapped_column(JSON)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
