"""Writing Drill Session Persistence (Phase 18).

Entities for tracking targeted writing drill practice sessions,
adaptive item sequences (guided -> free progression), attempt records,
outcomes, and mastery deltas.
"""

from __future__ import annotations

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class WritingDrillSession(UUIDMixin, TimestampMixin, Base):
    """Targeted practice session focused on remediating a specific writing weakness."""

    __tablename__ = "writing_drill_sessions"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    weakness_id: Mapped[str | None] = mapped_column(
        ForeignKey("writing_weaknesses.id", ondelete="SET NULL"), index=True, nullable=True
    )
    weakness_category: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    weakness_subtype: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    target_focus: Mapped[str] = mapped_column(String(200), nullable=False)
    jlpt_level: Mapped[str] = mapped_column(String(8), default="N3", nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    status: Mapped[str] = mapped_column(
        String(24), index=True, default="active", nullable=False
    )  # active | completed | abandoned
    current_item_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    attempts: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    outcome: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    mastery_delta: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    generation_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    completed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
