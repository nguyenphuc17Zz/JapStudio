"""AI Exercise Cache Database Model.

Universal pool storing AI-generated exercises across Reflex, Keigo, Situations, Pitch, etc.
Supports unlimited storage scale, semantic deduplication, and spaced decay selection.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AIExerciseCache(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Stores AI-generated speaking exercises for instant zero-latency recall and deduplicated pool reuse."""

    __tablename__ = "ai_exercise_cache"

    domain: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    sub_mode: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    difficulty: Mapped[str] = mapped_column(String(30), nullable=False, default="normal", index=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    content_json: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    ngram_signature: Mapped[str | None] = mapped_column(Text, nullable=True)

    times_served: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_served_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    quality_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    generation_source: Mapped[str] = mapped_column(String(50), default="gemini_ai", nullable=False)

    __table_args__ = (
        Index("ix_ai_cache_lookup", "domain", "sub_mode", "difficulty"),
        Index("ix_ai_cache_served", "times_served", "last_served_at"),
    )
