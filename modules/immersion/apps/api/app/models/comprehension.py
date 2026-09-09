from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String,
    Integer,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    JSON,
    Index,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ReadingInteraction(Base):
    """Logs individual user comprehension interactions during reading."""
    __tablename__ = "reading_interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    section_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    sentence_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    target_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # CONTEXT_GUESS, MEANING_GUESS, COMPREHENSION_CHECK, MAIN_IDEA, AUTHOR_INTENTION, PREDICTION, SENTENCE_ANALYSIS, ASSISTANCE_REQUEST
    interaction_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # CORRECT, INCORRECT, UNDERSTOOD, MOSTLY, NOT_UNDERSTOOD, SKIPPED, REVEALED
    result: Mapped[str] = mapped_column(String(50), nullable=False)

    # HIGH, MEDIUM, LOW
    confidence: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    time_spent_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")

    __table_args__ = (
        Index("ix_reading_interact_user_content", "user_id", "content_id"),
        Index("ix_reading_interact_type", "user_id", "interaction_type"),
        Index("ix_reading_interact_time", "created_at"),
    )


class ContentCheckpoint(Base):
    """Reading checkpoints embedded in articles (Main idea, author intention, predict next)."""
    __tablename__ = "content_checkpoints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    section_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    sentence_range_start: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    sentence_range_end: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # MAIN_IDEA, AUTHOR_INTENTION, PREDICT_NEXT
    checkpoint_type: Mapped[str] = mapped_column(String(50), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)

    # List of options: [{ "id": 0, "text": "...", "is_correct": bool, "explanation": "..." }]
    options_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    correct_option_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")

    __table_args__ = (
        Index("ix_checkpoint_content_section", "content_id", "section_index"),
    )


class AICompanionCache(Base):
    """Persistent cache for AI Reading Companion questions & answers."""
    __tablename__ = "ai_companion_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    sentence_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    context_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    # WHAT_MEANS, WHY_GRAMMAR, SIMPLIFY, EXPLAIN_NUANCE, WHY_FORMAL, KEY_POINT, CUSTOM
    question_type: Mapped[str] = mapped_column(String(50), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="vi", nullable=False)

    response_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    model_provider: Mapped[str] = mapped_column(String(50), default="gemini", nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), default="gemini-2.0-flash", nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")

    __table_args__ = (
        Index("ix_companion_lookup", "content_id", "context_hash", "question_type", "language"),
    )
