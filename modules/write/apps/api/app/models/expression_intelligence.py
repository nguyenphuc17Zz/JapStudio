"""Expression Intelligence persistence (Phase 21).

Tracks personal expression bank, collocations, overuse patterns,
Vietnamese-to-Japanese transfer issues, and register transformations.
"""

from __future__ import annotations

from sqlalchemy import (
    JSON,
    Boolean,
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


class ExpressionRecord(UUIDMixin, TimestampMixin, Base):
    """Tracks a learner's expression usage, collocation fit, and transfer patterns."""

    __tablename__ = "expression_records"
    __table_args__ = (
        UniqueConstraint("expression_key", name="uq_expression_record_key"),
    )

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    expression: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    base_word: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    expression_type: Mapped[str] = mapped_column(
        String(32), index=True, default="collocation", nullable=False
    )  # collocation | discourse_marker | sentence_ending | connector | set_phrase

    used_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    misused_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avoided_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    natural_use_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    registers_used: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    naturalness_avg: Mapped[float] = mapped_column(Float, default=75.0, nullable=False)

    is_overused: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    overuse_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    vietnamese_literal: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    transfer_classification: Mapped[str] = mapped_column(
        String(40), default="natural", nullable=False
    )  # natural | possible_but_unnatural | literal_translation | native_preferred

    native_alternatives: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    collocations: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    example_contexts: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    nuance_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    first_used_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_used_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    expression_key: Mapped[str] = mapped_column(
        String(300),
        Computed(
            "CONCAT(COALESCE(user_id,''),'#',expression)",
            persisted=False,
        ),
        nullable=False,
    )
