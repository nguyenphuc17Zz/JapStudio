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


class UserVocabulary(Base):
    """Personal Japanese vocabulary tracking model with multi-dimensional mastery and context memory."""
    __tablename__ = "user_vocabulary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    term: Mapped[str] = mapped_column(String(100), nullable=False)  # surface form seen
    normalized_form: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # dictionary form / lemma
    reading: Mapped[str] = mapped_column(String(100), nullable=False)
    meaning: Mapped[str] = mapped_column(Text, nullable=False)
    part_of_speech: Mapped[str] = mapped_column(String(50), default="noun", nullable=False)

    # NEW, SEEN, LEARNING, FAMILIAR, MASTERED, IGNORED
    status: Mapped[str] = mapped_column(String(30), default="NEW", index=True, nullable=False)

    encounter_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    successful_recognition_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_recognition_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # HIGH, MEDIUM, LOW
    confidence: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)

    # Multi-dimensional Mastery (0 - 100)
    mastery_score: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    recognition_score: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    recall_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    source_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    content_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    importance: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1-5
    difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)  # 1-10
    learning_value_score: Mapped[int] = mapped_column(Integer, default=70, nullable=False)  # 0-100

    # Knowledge expansion & contexts
    collocations_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    related_terms_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    contexts_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    sources_breakdown_json: Mapped[Dict[str, int]] = mapped_column(JSON, default=dict, nullable=False)

    # AI-enriched word detail (saved from lookup modal or enrich-on-save).
    # Nullable/empty for words saved before this feature or when AI failed.
    nuance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    jlpt_level: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    examples_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    alternatives_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    encounters: Mapped[List["VocabularyEncounter"]] = relationship(
        "VocabularyEncounter",
        back_populates="vocabulary",
        cascade="all, delete-orphan",
        order_by="desc(VocabularyEncounter.created_at)"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "normalized_form", "reading", name="uq_user_vocab_term"),
        Index("ix_user_vocab_status", "user_id", "status"),
        Index("ix_user_vocab_mastery", "user_id", "mastery_score"),
    )


class VocabularyEncounter(Base):
    """Encounter log recording meaningful interactions with a vocabulary item."""
    __tablename__ = "vocabulary_encounters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    vocabulary_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user_vocabulary.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    content_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )

    # READING, QUIZ, CONTEXT_GUESS, VOCABULARY_POPUP, REVIEW, OTHER
    context_type: Mapped[str] = mapped_column(String(50), default="READING", nullable=False)

    # SEEN, CLICKED, GUESSED_CORRECT, GUESSED_WRONG, QUIZ_CORRECT, QUIZ_WRONG, REVIEW_RATED
    interaction_type: Mapped[str] = mapped_column(String(50), default="SEEN", nullable=False)

    # SUCCESS, FAILURE, NEUTRAL
    result: Mapped[str] = mapped_column(String(30), default="NEUTRAL", nullable=False)
    confidence: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    sentence_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_sentence_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    vocabulary: Mapped["UserVocabulary"] = relationship("UserVocabulary", back_populates="encounters")
    content: Mapped[Optional["CanonicalContent"]] = relationship("CanonicalContent")

    __table_args__ = (
        Index("ix_vocab_encounter_user", "user_id", "created_at"),
    )


class UserExpression(Base):
    """Personal Japanese collocations, idioms, and multi-word native expressions."""
    __tablename__ = "user_expressions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    expression: Mapped[str] = mapped_column(String(200), nullable=False)
    normalized_expression: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    reading: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    meaning: Mapped[str] = mapped_column(Text, nullable=False)

    # COLLOCATION, IDIOM, SLANG, FORMAL_PATTERN
    type: Mapped[str] = mapped_column(String(50), default="COLLOCATION", nullable=False)

    # NEW, LEARNING, FAMILIAR, MASTERED
    status: Mapped[str] = mapped_column(String(30), default="LEARNING", nullable=False)

    encounter_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    mastery_score: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    importance: Mapped[int] = mapped_column(Integer, default=4, nullable=False)

    # AI-enriched expression detail (lookup endpoint or backfill button).
    # Nullable/empty for entries collected before this feature or when AI failed.
    usage_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    composition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    examples_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    alternatives_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    contexts_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "normalized_expression", name="uq_user_expression"),
    )


class UserGrammar(Base):
    """Personal Japanese grammar pattern tracking model."""
    __tablename__ = "user_grammar"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    pattern: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    meaning: Mapped[str] = mapped_column(Text, nullable=False)

    # AI-enriched grammar detail (saved from grammar lookup or enrich-on-save).
    # Nullable/empty for patterns saved before this feature or when AI failed.
    formation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    usage_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    examples_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    encounter_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    incorrect_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    mastery_score: Mapped[float] = mapped_column(Float, default=20.0, nullable=False)
    confidence: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    contexts_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "pattern", name="uq_user_grammar"),
    )


class UserSavedSentence(Base):
    """Personal library of memorable or valuable sentences saved from articles."""
    __tablename__ = "user_saved_sentences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    content_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="SET NULL"),
        nullable=True
    )
    sentence_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    sentence_text: Mapped[str] = mapped_column(Text, nullable=False)
    translation_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # GOOD_EXPRESSION, GOOD_GRAMMAR, USEFUL_VOCABULARY, NATURAL_JAPANESE, MEMORABLE
    reason: Mapped[str] = mapped_column(String(50), default="MEMORABLE", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped[Optional["CanonicalContent"]] = relationship("CanonicalContent")


class ReviewState(Base):
    """Spaced Repetition scheduling state powered by the modern FSRS memory model."""
    __tablename__ = "review_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    # VOCABULARY, EXPRESSION, GRAMMAR
    item_type: Mapped[str] = mapped_column(String(30), default="VOCABULARY", index=True, nullable=False)
    item_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)

    # FSRS Memory Parameters
    stability: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)  # memory stability in days
    difficulty: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)  # item difficulty (1.0 to 10.0)

    reps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    lapses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    last_review_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    next_review_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    scheduled_days: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # DUE, SCHEDULED, OVERDUE, SUSPENDED
    due_status: Mapped[str] = mapped_column(String(20), default="DUE", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "item_type", "item_id", name="uq_user_review_item"),
        Index("ix_review_user_due", "user_id", "next_review_at"),
    )


class ReviewSession(Base):
    """Logs a focused Spaced Repetition review session and aggregate outcome."""
    __tablename__ = "review_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    items_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # {"AGAIN": 1, "HARD": 2, "GOOD": 8, "EASY": 1}
    ratings_breakdown_json: Mapped[Dict[str, int]] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
