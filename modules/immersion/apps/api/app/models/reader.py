from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    String,
    Integer,
    Float,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    JSON,
    Index,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class UserSavedContent(Base):
    """User bookmarked/saved content items."""
    __tablename__ = "user_saved_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")

    __table_args__ = (
        UniqueConstraint("user_id", "content_id", name="uq_user_saved_content"),
    )


class UserReadingProgress(Base):
    """User reading progress on specific content items for 'Continue Reading'."""
    __tablename__ = "user_reading_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 - 100
    last_sentence_index: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    last_read_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")

    __table_args__ = (
        UniqueConstraint("user_id", "content_id", name="uq_user_reading_progress"),
        Index("ix_user_progress_recent", "user_id", "last_read_at"),
    )


class UserReadingHistory(Base):
    """Chronological record of reading sessions."""
    __tablename__ = "user_reading_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    read_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")

    __table_args__ = (
        Index("ix_user_history_timeline", "user_id", "read_at"),
    )


class ContentTranslation(Base):
    """Persistent cache for Vietnamese translations of articles or individual sentences."""
    __tablename__ = "content_translations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    # sentence_index is null when storing the translation for the entire article, or integer for sentence
    sentence_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    target_language: Mapped[str] = mapped_column(String(10), default="vi", nullable=False)
    translated_text: Mapped[str] = mapped_column(Text, nullable=False)

    model_provider: Mapped[str] = mapped_column(String(50), default="gemini", nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), default="gemini-2.0-flash", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")

    __table_args__ = (
        Index("ix_content_trans_lookup", "content_id", "sentence_index", "target_language"),
    )


class ContentExplanation(Base):
    """Persistent cache for context-specific pedagogical sentence explanations."""
    __tablename__ = "content_explanations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    sentence_index: Mapped[int] = mapped_column(Integer, nullable=False)

    literal_translation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    natural_meaning: Mapped[str] = mapped_column(Text, default="", nullable=False)
    context_nuance: Mapped[str] = mapped_column(Text, default="", nullable=False)
    key_grammar_notes: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent")

    __table_args__ = (
        UniqueConstraint("content_id", "sentence_index", name="uq_content_sentence_explanation"),
    )
