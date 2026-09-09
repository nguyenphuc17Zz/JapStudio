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
    func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class AIEnrichmentJob(Base):
    """Tracks background AI processing jobs for content intelligence."""
    __tablename__ = "ai_enrichment_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    job_type: Mapped[str] = mapped_column(
        String(50),
        default="FULL_ENRICHMENT",
        index=True,
        nullable=False
    )  # FULL_ENRICHMENT, SUMMARY, VOCABULARY, GRAMMAR, DIFFICULTY, QUALITY

    status: Mapped[str] = mapped_column(
        String(30),
        default="QUEUED",
        index=True,
        nullable=False
    )  # QUEUED, RUNNING, SUCCESS, PARTIAL_SUCCESS, FAILED, CANCELLED, SKIPPED

    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Empty string = "resolve current Settings at execution time" (never a
    # stale snapshot; explicit overrides are stored verbatim).
    model_provider: Mapped[str] = mapped_column(String(50), default="", nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), default="enrichment_comprehensive_v1", nullable=False)

    input_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    error_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Granular status for each pipeline stage: {"language": "SUCCESS", "vocab": "SUCCESS", "grammar": "FAILED", ...}
    stage_status_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent", back_populates="enrichment_jobs")

    __table_args__ = (
        Index("ix_ai_jobs_content_status", "content_id", "status"),
        Index("ix_ai_jobs_created_status", "created_at", "status"),
    )


class ContentEnrichment(Base):
    """Persisted structured intelligence for a CanonicalContent item."""
    __tablename__ = "content_enrichment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )

    # 1. Language Analysis
    language: Mapped[str] = mapped_column(String(20), default="ja", nullable=False)
    language_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    is_japanese: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mixed_language: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 2. Content Classification & Roles
    primary_type: Mapped[str] = mapped_column(String(50), default="ARTICLE", nullable=False)
    secondary_types: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    content_role: Mapped[str] = mapped_column(String(50), default="FORMAL", nullable=False)

    # 3. Topics & Taxonomy
    primary_topic: Mapped[str] = mapped_column(String(100), default="General", index=True, nullable=False)
    secondary_topics: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    topic_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    keywords: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    entities: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    # 4. Multi-dimensional Difficulty (1-10 scale)
    overall_difficulty: Mapped[int] = mapped_column(Integer, default=5, index=True, nullable=False)
    vocabulary_difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    grammar_difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    kanji_difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    sentence_complexity: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    conceptual_difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    # Estimated JLPT level (N5, N4, N3, N2, N1, N1+) - estimated, NOT official
    estimated_jlpt: Mapped[str] = mapped_column(String(10), default="N3", index=True, nullable=False)
    difficulty_reasons: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # 5. Multi-level Summaries
    micro_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    short_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    detailed_summary: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # 6. Register, Formality & Cultural Signals
    register: Mapped[str] = mapped_column(String(50), default="FORMAL", nullable=False)
    formality_score: Mapped[int] = mapped_column(Integer, default=70, nullable=False)  # 0-100
    casualness_score: Mapped[int] = mapped_column(Integer, default=30, nullable=False)  # 0-100
    internet_slang_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0-100
    requires_cultural_context: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cultural_topics: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # 7. Quality & Learning Readiness
    quality_score: Mapped[int] = mapped_column(Integer, default=80, index=True, nullable=False)  # 0-100
    freshness_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)  # 0-100
    learning_readiness_score: Mapped[int] = mapped_column(Integer, default=80, index=True, nullable=False)  # 0-100
    learning_ready: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)

    # 8. Versioning & Provenance
    enrichment_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), default="enrichment_comprehensive_v1", nullable=False)
    model_provider: Mapped[str] = mapped_column(String(50), default="gemini", nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), default="gemini-2.0-flash", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent", back_populates="enrichment")


class ContentSentence(Base):
    """Anchored sentence entity for citation, vocabulary anchoring, and future jump-to-sentence."""
    __tablename__ = "content_sentences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    sentence_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    start_offset: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    end_offset: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    has_high_learning_value: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    learning_value_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent", back_populates="sentences")

    __table_args__ = (
        Index("ix_content_sentence_idx", "content_id", "sentence_index"),
    )


class ContentVocabulary(Base):
    """High-value vocabulary words extracted from content."""
    __tablename__ = "content_vocabulary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    surface_form: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    normalized_form: Mapped[str] = mapped_column(String(100), nullable=False)
    reading: Mapped[str] = mapped_column(String(100), nullable=False)
    part_of_speech: Mapped[str] = mapped_column(String(50), nullable=False)

    meaning_in_context: Mapped[str] = mapped_column(Text, nullable=False)
    importance: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1-5
    learning_priority: Mapped[int] = mapped_column(Integer, default=50, index=True, nullable=False)  # 0-100
    difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)  # 1-10

    source_sentence_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("content_sentences.id", ondelete="SET NULL"),
        nullable=True
    )
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent", back_populates="vocabularies")
    source_sentence: Mapped[Optional["ContentSentence"]] = relationship("ContentSentence")

    __table_args__ = (
        Index("ix_content_vocab_term", "content_id", "surface_form"),
    )


class ContentExpression(Base):
    """Collocations, idiomatic phrases, or multi-word native expressions."""
    __tablename__ = "content_expressions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    expression: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    reading: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    meaning_in_context: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="COLLOCATION", nullable=False)  # COLLOCATION, IDIOM, SLANG, FORMAL_PATTERN

    difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    learning_priority: Mapped[int] = mapped_column(Integer, default=50, nullable=False)

    source_sentence_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("content_sentences.id", ondelete="SET NULL"),
        nullable=True
    )
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent", back_populates="expressions")
    source_sentence: Mapped[Optional["ContentSentence"]] = relationship("ContentSentence")


class ContentGrammar(Base):
    """Grammar patterns detected in context."""
    __tablename__ = "content_grammar"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    pattern: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    meaning_in_context: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="INTERMEDIATE", nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    source_sentence_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("content_sentences.id", ondelete="SET NULL"),
        nullable=True
    )
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent", back_populates="grammars")
    source_sentence: Mapped[Optional["ContentSentence"]] = relationship("ContentSentence")
