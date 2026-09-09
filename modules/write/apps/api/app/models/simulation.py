"""Interactive simulation entities (Phase 10): sessions, turns and their
evaluations.

A session wraps a WritingScenario into a multi-turn goal-oriented Japanese
conversation. Session metadata and turns are immutable after creation; the
structured state, the difficulty and the summary are the only mutable
parts. ``user_id`` columns are nullable until authentication exists (same
convention as the rest of the schema); NULL rows represent the single
anonymous learner.
"""

from datetime import datetime

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class SimulationSession(UUIDMixin, TimestampMixin, Base):
    """One interactive simulation built on top of a writing scenario."""

    __tablename__ = "simulation_sessions"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    scenario_id: Mapped[str] = mapped_column(
        ForeignKey("writing_scenarios.id", ondelete="CASCADE"), index=True, nullable=False
    )
    simulation_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    mode: Mapped[str] = mapped_column(String(16), default="guided", nullable=False)
    register: Mapped[str] = mapped_column(String(16), nullable=False)
    jlpt_level: Mapped[str] = mapped_column(String(8), nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    pressure_condition: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    resolution: Mapped[str | None] = mapped_column(String(32), nullable=True)
    max_turns: Mapped[int] = mapped_column(Integer, nullable=False)
    current_turn: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    objective_vi: Mapped[str] = mapped_column(Text, nullable=False)
    persona: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    state: Mapped[dict] = mapped_column(JSON, nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SimulationTurn(UUIDMixin, TimestampMixin, Base):
    """One immutable message of the conversation (AI or learner)."""

    __tablename__ = "simulation_turns"
    __table_args__ = (
        UniqueConstraint("session_id", "turn_number", name="uq_simulation_turn_number"),
    )

    session_id: Mapped[str] = mapped_column(
        ForeignKey("simulation_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    actor: Mapped[str] = mapped_column(String(16), nullable=False)
    turn_type: Mapped[str] = mapped_column(String(32), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(String(16), default="guided", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="pending", nullable=False)
    turn_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class SimulationEvaluation(UUIDMixin, TimestampMixin, Base):
    """The persisted evaluation of one learner turn (immutable)."""

    __tablename__ = "simulation_evaluations"

    turn_id: Mapped[str] = mapped_column(
        ForeignKey("simulation_turns.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    strengths: Mapped[list] = mapped_column(JSON, nullable=False)
    issues: Mapped[list] = mapped_column(JSON, nullable=False)
    corrections: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    feedback_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluation_version: Mapped[str] = mapped_column(String(64), nullable=False)
    provenance: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
