"""Learner memory persistence (Phase 12).

One row is a single durable memory: a useful, contextual fact about the
learner that aggregate scores alone cannot capture. Memories are distinct
from the Phase 6 ``LearnerProfile`` (aggregated state) â€” they carry specific
historical/contextual facts with evidence, confidence and importance.

Privacy: ``content`` holds the memory's wording; ``evidence`` holds only
identifiers (attempt/exercise/evaluation/vocabulary/simulation/scenario ids)
for auditability â€” never raw learner writing.
"""

from __future__ import annotations

from sqlalchemy import (
    JSON,
    Computed,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class LearnerMemory(UUIDMixin, TimestampMixin, Base):
    """One persistent memory about the learner.

    ``user_id`` is nullable until authentication exists (NULL = the anonymous
    learner), matching the profile/vocabulary convention.
    """

    __tablename__ = "learner_memories"
    __table_args__ = (UniqueConstraint("memory_key", name="uq_learner_memory_source"),)

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    category: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    confidence: Mapped[str] = mapped_column(
        String(16), index=True, default="medium", nullable=False
    )
    importance: Mapped[int] = mapped_column(Integer, index=True, default=5, nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    memory_key: Mapped[str | None] = mapped_column(
        String(110),
        Computed(
            "CASE WHEN source_id IS NOT NULL THEN CONCAT(COALESCE(user_id,''),'#',"
            "source_type,'#',source_id) ELSE NULL END",
            persisted=False,
        ),
        nullable=True,
    )
    evidence: Mapped[list | None] = mapped_column(JSON, default=list, nullable=False)
    first_seen_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_seen_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(16), index=True, default="candidate", nullable=False)
    memory_class: Mapped[str] = mapped_column(String(16), default="stable", nullable=False)
    retention_policy: Mapped[dict | None] = mapped_column(JSON)
    memory_metadata: Mapped[dict | None] = mapped_column("metadata", JSON)
