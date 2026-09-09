from __future__ import annotations

import enum

from sqlalchemy import (
    JSON,
    Computed,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class VocabularyType(str, enum.Enum):
    WORD = "word"
    EXPRESSION = "expression"
    COLLOCATION = "collocation"


class VocabularyConfidence(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class VocabularySourceType(str, enum.Enum):
    USER_ANSWER = "user_answer"
    AI_CORRECTION = "ai_correction"
    AI_NATURAL = "ai_natural"
    AI_NATIVE = "ai_native"
    AI_REGISTER_VARIANT = "ai_register_variant"
    AI_EXPLANATION = "ai_explanation"


class VocabularyFamiliarity(str, enum.Enum):
    NEW = "new"
    LEARNING = "learning"
    FAMILIAR = "familiar"
    STRONG = "strong"


class VocabularyEntry(UUIDMixin, TimestampMixin, Base):
    """One global vocabulary concept (word / expression / collocation).

    Shared by all learners; user-specific state lives in UserVocabulary.
    ``normalized_expression`` is the deterministic deduplication key; the AI
    is additionally consulted for lexical equivalence (inflected forms).
    """

    __tablename__ = "vocabulary_entries"

    expression: Mapped[str] = mapped_column(String(100), nullable=False)
    normalized_expression: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    reading: Mapped[str | None] = mapped_column(String(200), nullable=True)
    type: Mapped[VocabularyType] = mapped_column(
        Enum(VocabularyType, native_enum=False, length=32), nullable=False
    )
    meaning_vi: Mapped[str] = mapped_column(Text, nullable=False)
    part_of_speech: Mapped[str | None] = mapped_column(String(50), nullable=True)
    estimated_jlpt_level: Mapped[str | None] = mapped_column(String(8), nullable=True)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    register: Mapped[str | None] = mapped_column(String(20), nullable=True)
    usage_context: Mapped[str | None] = mapped_column(String(100), nullable=True)
    example_sentence: Mapped[str] = mapped_column(Text, nullable=False)
    natural_alternatives: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    importance: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence: Mapped[VocabularyConfidence] = mapped_column(
        Enum(VocabularyConfidence, native_enum=False, length=16), nullable=False
    )
    provenance: Mapped[dict] = mapped_column(JSON, nullable=False)

    discoveries: Mapped[list["VocabularyDiscovery"]] = relationship(
        back_populates="entry", cascade="all, delete-orphan"
    )
    user_states: Mapped[list["UserVocabulary"]] = relationship(
        back_populates="entry", cascade="all, delete-orphan"
    )


class UserVocabulary(UUIDMixin, TimestampMixin, Base):
    """Per-user learning state for one vocabulary entry.

    ``user_id`` is nullable until authentication exists; null rows represent
    the single anonymous learner.
    """

    __tablename__ = "user_vocabulary"
    __table_args__ = (UniqueConstraint("user_id", "entry_id", name="uq_user_vocabulary_entry"),)

    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    entry_id: Mapped[str] = mapped_column(
        ForeignKey("vocabulary_entries.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    discovered_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    seen_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    incorrect_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    familiarity: Mapped[VocabularyFamiliarity] = mapped_column(
        Enum(VocabularyFamiliarity, native_enum=False, length=16),
        default=VocabularyFamiliarity.NEW,
        nullable=False,
    )
    last_seen: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=True)
    first_used_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=True)
    source_attempt_id: Mapped[str | None] = mapped_column(
        ForeignKey("exercise_attempts.id", ondelete="SET NULL"), nullable=True
    )
    source_exercise_id: Mapped[str | None] = mapped_column(
        ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True
    )
    user_expression: Mapped[str | None] = mapped_column(String(200), nullable=True)
    learning_reason: Mapped[str] = mapped_column(Text, nullable=False)
    curriculum_context: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    discovered_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    entry: Mapped[VocabularyEntry] = relationship(back_populates="user_states")


class VocabularyDiscovery(UUIDMixin, TimestampMixin, Base):
    """One discovery event: this attempt introduced this entry to the bank.

    Preserves the learner-oriented context (what the user wrote, why the item
    matters, the example used at discovery time) without overwriting earlier
    discoveries, and powers "vocabulary from this answer".
    """

    __tablename__ = "vocabulary_discoveries"
    __table_args__ = (UniqueConstraint("discovery_key", name="uq_vocab_discovery_attempt_entry"),)

    entry_id: Mapped[str] = mapped_column(
        ForeignKey("vocabulary_entries.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    attempt_id: Mapped[str] = mapped_column(
        ForeignKey("exercise_attempts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    exercise_id: Mapped[str] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source_type: Mapped[VocabularySourceType] = mapped_column(
        Enum(VocabularySourceType, native_enum=False, length=32), nullable=False
    )
    discovery_key: Mapped[str] = mapped_column(
        String(110),
        Computed(
            "CONCAT(entry_id,'#',attempt_id,'#',CAST(source_type AS CHAR))",
            persisted=False,
        ),
        nullable=False,
    )
    user_expression: Mapped[str | None] = mapped_column(String(200), nullable=True)
    learning_reason: Mapped[str] = mapped_column(Text, nullable=False)
    context_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_sentence: Mapped[str | None] = mapped_column(Text, nullable=True)
    provenance: Mapped[dict] = mapped_column(JSON, nullable=False)

    entry: Mapped[VocabularyEntry] = relationship(back_populates="discoveries")
