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


class IngestionJob(Base):
    """Execution instance of a content source ingestion run."""
    __tablename__ = "ingestion_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("content_sources.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    job_type: Mapped[str] = mapped_column(
        String(30),
        default="SCHEDULED",
        nullable=False
    ) # SCHEDULED, MANUAL, RETRY, BACKFILL

    status: Mapped[str] = mapped_column(
        String(30),
        default="QUEUED",
        index=True,
        nullable=False
    ) # QUEUED, RUNNING, SUCCESS, PARTIAL_SUCCESS, FAILED, CANCELLED

    # Timestamps
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Ingestion Metrics Breakdown
    items_seen: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_fetched: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_normalized: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_created: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_duplicate: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_rejected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Error & Recovery Tracking
    error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    ) # transient, permanent, timeout, rate_limited, auth, circuit_open
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)

    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)

    # Relationships
    source: Mapped["ContentSource"] = relationship("ContentSource", back_populates="ingestion_jobs")
    raw_items: Mapped[List["RawIngestionItem"]] = relationship(
        "RawIngestionItem",
        back_populates="job",
        cascade="all, delete-orphan",
        lazy="select"
    )
    item_logs: Mapped[List["IngestionItemLog"]] = relationship(
        "IngestionItemLog",
        back_populates="job",
        cascade="all, delete-orphan",
        lazy="select"
    )

    __table_args__ = (
        Index("ix_ingestion_jobs_source_status", "source_id", "status"),
    )


class RawIngestionItem(Base):
    """Raw payload representation staged during connector fetch (retention: 7 days)."""
    __tablename__ = "raw_ingestion_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ingestion_jobs.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("content_sources.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    external_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    raw_payload_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    status: Mapped[str] = mapped_column(
        String(30),
        default="FETCHED",
        index=True,
        nullable=False
    ) # FETCHED, NORMALIZED, PERSISTED, REJECTED, FAILED
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    content_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)

    # Relationships
    job: Mapped["IngestionJob"] = relationship("IngestionJob", back_populates="raw_items")
    canonical_content: Mapped[Optional["CanonicalContent"]] = relationship("CanonicalContent", back_populates="raw_items")


class IngestionItemLog(Base):
    """Detailed audit log for every item processed in an ingestion job."""
    __tablename__ = "ingestion_item_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ingestion_jobs.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("content_sources.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    status: Mapped[str] = mapped_column(
        String(30),
        index=True,
        nullable=False
    ) # FETCHED, NORMALIZED, CREATED, UPDATED, DUPLICATE, REJECTED, FAILED
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    content_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("canonical_contents.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)

    # Relationships
    job: Mapped["IngestionJob"] = relationship("IngestionJob", back_populates="item_logs")
    canonical_content: Mapped[Optional["CanonicalContent"]] = relationship("CanonicalContent", back_populates="item_logs")


class SourceSyncState(Base):
    """State machine maintaining pagination checkpoints and circuit breaker state."""
    __tablename__ = "source_sync_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("content_sources.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )

    # Checkpoint & Pagination
    cursor: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    last_seen_external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Timestamps
    last_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_success_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_item_published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_item_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Circuit Breaker Tracking
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    circuit_state: Mapped[str] = mapped_column(String(20), default="CLOSED", nullable=False) # CLOSED, OPEN, HALF_OPEN
    circuit_opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    source: Mapped["ContentSource"] = relationship("ContentSource", back_populates="sync_state")

    def __init__(self, **kwargs):
        kwargs.setdefault("circuit_state", "CLOSED")
        kwargs.setdefault("consecutive_failures", 0)
        super().__init__(**kwargs)
