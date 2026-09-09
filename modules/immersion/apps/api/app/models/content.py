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
    func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class CanonicalContent(Base):
    """Canonical, normalized Japanese content entity persisted by Ingestion Engine."""
    __tablename__ = "canonical_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("content_sources.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    # Identifiers & URLs
    external_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    canonical_url: Mapped[str] = mapped_column(String(1000), index=True, nullable=False)

    # Content Categorization
    content_type: Mapped[str] = mapped_column(
        String(50),
        default="ARTICLE",
        index=True,
        nullable=False
    ) # ARTICLE, POST, NEWS, BLOG_POST, FORUM_POST, WEB_PAGE, OTHER

    # Core Text & Metadata
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    excerpt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Timestamps
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True, nullable=True)
    updated_at_source: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Language Classification
    language: Mapped[str] = mapped_column(String(20), default="ja", index=True, nullable=False)
    language_status: Mapped[str] = mapped_column(String(20), default="JA", nullable=False) # JA, NON_JA, UNKNOWN

    # Visual & Attachments
    image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    # Processing & Lifecycle Status
    status: Mapped[str] = mapped_column(
        String(30),
        default="PUBLISHED",
        index=True,
        nullable=False
    ) # PENDING, PUBLISHED, REJECTED, ARCHIVED, ERROR
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # AI Enrichment Lifecycle Status
    enrichment_status: Mapped[str] = mapped_column(
        String(30),
        default="NOT_PROCESSED",
        index=True,
        nullable=False
    ) # NOT_PROCESSED, PROCESSING, PARTIALLY_ENRICHED, ENRICHED, FAILED

    # Deduplication & Grouping Fingerprints
    content_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False) # SHA-256
    duplicate_group_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)

    # Extensible Metadata (tags, raw fields, audio enclosures, furigana info)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Audit Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    source: Mapped["ContentSource"] = relationship("ContentSource", back_populates="canonical_contents")
    raw_items: Mapped[List["RawIngestionItem"]] = relationship(
        "RawIngestionItem",
        back_populates="canonical_content",
        lazy="select"
    )
    item_logs: Mapped[List["IngestionItemLog"]] = relationship(
        "IngestionItemLog",
        back_populates="canonical_content",
        lazy="select"
    )
    enrichment: Mapped[Optional["ContentEnrichment"]] = relationship(
        "ContentEnrichment",
        back_populates="content",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="select"
    )
    sentences: Mapped[List["ContentSentence"]] = relationship(
        "ContentSentence",
        back_populates="content",
        cascade="all, delete-orphan",
        lazy="select"
    )
    vocabularies: Mapped[List["ContentVocabulary"]] = relationship(
        "ContentVocabulary",
        back_populates="content",
        cascade="all, delete-orphan",
        lazy="select"
    )
    expressions: Mapped[List["ContentExpression"]] = relationship(
        "ContentExpression",
        back_populates="content",
        cascade="all, delete-orphan",
        lazy="select"
    )
    grammars: Mapped[List["ContentGrammar"]] = relationship(
        "ContentGrammar",
        back_populates="content",
        cascade="all, delete-orphan",
        lazy="select"
    )
    enrichment_jobs: Mapped[List["AIEnrichmentJob"]] = relationship(
        "AIEnrichmentJob",
        back_populates="content",
        cascade="all, delete-orphan",
        lazy="select"
    )

    __table_args__ = (
        Index("ix_canonical_contents_source_ext", "source_id", "external_id"),
        Index("ix_canonical_contents_hash_source", "content_hash", "source_id"),
    )
