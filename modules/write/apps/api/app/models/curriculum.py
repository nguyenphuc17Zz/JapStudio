"""Curriculum & learning journey entities (Phase 13).

Hierarchy: ``LearningJourney`` -> ``LearningMilestone`` -> ``LearningObjective``.

- ``LearningJourney`` is the long-term container: one active journey per
  learner; past journeys are archived (plan history preserved).
- ``LearningMilestone`` groups objectives into thematic stages.
- ``LearningObjective`` is the smallest AI-planned unit; its ``entry_criteria``
  and ``success_criteria`` are deterministic JSON the engine evaluates.
- ``ObjectiveProgress`` is the durable evidence ledger per objective
  (exercises completed, average score, per-skill evidence).
- ``CurriculumPlan`` preserves the raw AI plan (full history) for auditability
  and replanning.
- ``CurriculumReplanningEvent`` records every replanning decision.

All ``user_id`` columns are nullable until authentication exists (same
convention as ``learner_profiles``); NULL rows represent the single
anonymous learner.
"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class LearningJourney(UUIDMixin, TimestampMixin, Base):
    """One long-term learning journey (goal -> milestones -> objectives)."""

    __tablename__ = "learning_journeys"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    goal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    goal: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    progress: Mapped[float] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_milestone_id: Mapped[str | None] = mapped_column(String(64))
    current_objective_id: Mapped[str | None] = mapped_column(String(64))
    explanation: Mapped[str | None] = mapped_column(Text)
    planning_prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)
    planning_provider: Mapped[str] = mapped_column(String(50), nullable=False)
    planning_model: Mapped[str] = mapped_column(String(100), nullable=False)
    source: Mapped[str] = mapped_column(String(16), default="ai", nullable=False)
    review_meta: Mapped[dict | None] = mapped_column(JSON)


class LearningMilestone(UUIDMixin, TimestampMixin, Base):
    """One thematic stage of a journey (1..N, strictly ordered)."""

    __tablename__ = "learning_milestones"

    journey_id: Mapped[str] = mapped_column(
        ForeignKey("learning_journeys.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    entry_criteria: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="locked", nullable=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LearningObjective(UUIDMixin, TimestampMixin, Base):
    """The smallest AI-planned unit; evaluated deterministically."""

    __tablename__ = "learning_objectives"

    milestone_id: Mapped[str] = mapped_column(
        ForeignKey("learning_milestones.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    target_competencies: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    target_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    exercise_modes: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    target_level: Mapped[str] = mapped_column(String(32), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    entry_criteria: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    success_criteria: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="locked", nullable=False)
    unlocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ObjectiveProgress(UUIDMixin, TimestampMixin, Base):
    """Durable evidence ledger for one objective (updated incrementally)."""

    __tablename__ = "objective_progress"

    objective_id: Mapped[str] = mapped_column(
        ForeignKey("learning_objectives.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exercises_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attempts_submitted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    best_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mastery_state: Mapped[str] = mapped_column(String(16), default="not_started", nullable=False)
    skill_evidence: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    modes_used: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CurriculumPlan(UUIDMixin, TimestampMixin, Base):
    """Raw AI curriculum plan; kept for auditability and replanning."""

    __tablename__ = "curriculum_plans"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    journey_id: Mapped[str | None] = mapped_column(
        ForeignKey("learning_journeys.id", ondelete="SET NULL"), index=True, nullable=True
    )
    plan_type: Mapped[str] = mapped_column(String(16), nullable=False)
    goal_type: Mapped[str] = mapped_column(String(32), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)
    review_meta: Mapped[dict | None] = mapped_column(JSON)


class CurriculumReplanningEvent(UUIDMixin, TimestampMixin, Base):
    """Every deterministic replanning decision (audit trail)."""

    __tablename__ = "curriculum_replanning_events"

    journey_id: Mapped[str] = mapped_column(
        ForeignKey("learning_journeys.id", ondelete="CASCADE"), index=True, nullable=False
    )
    trigger: Mapped[str] = mapped_column(String(32), nullable=False)
    replan_requested: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    current_progress: Mapped[dict | None] = mapped_column(JSON)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    applied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
