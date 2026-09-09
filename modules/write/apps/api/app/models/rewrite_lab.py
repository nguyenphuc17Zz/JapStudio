"""Rewrite Lab and Self-Correction session persistence (Phase 19).

Entities for tracking self-correction progressive ladders,
multi-step attempts, clues, patterns, revealed variants, and transfer tasks.
"""

from __future__ import annotations

from sqlalchemy import (
    JSON,
    Boolean,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class RewriteLabSession(UUIDMixin, TimestampMixin, Base):
    """Tracks a learner's self-correction ladder, rewrites, and transfer check."""

    __tablename__ = "rewrite_lab_sessions"

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    source_type: Mapped[str] = mapped_column(
        String(32), default="standalone", nullable=False
    )  # standalone | exercise | submission
    source_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    context_vi: Mapped[str | None] = mapped_column(Text, nullable=True)

    has_issue: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    issue_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    issue_category_name_vi: Mapped[str | None] = mapped_column(String(128), nullable=True)
    issue_explanation_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_concept: Mapped[str | None] = mapped_column(String(200), nullable=True)
    target_segment: Mapped[str | None] = mapped_column(String(200), nullable=True)

    current_step: Mapped[int] = mapped_column(Integer, default=2, nullable=False)  # 2: category, 3: attempt 1, 4: clue, 5: pattern, 6: reveal
    status: Mapped[str] = mapped_column(
        String(32), default="active", nullable=False
    )  # active | self_corrected | revealed | transferred | completed

    clue: Mapped[str | None] = mapped_column(Text, nullable=True)
    pattern: Mapped[str | None] = mapped_column(Text, nullable=True)

    attempts: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    revealed_variants: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    transfer_task: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    transfer_attempts: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
