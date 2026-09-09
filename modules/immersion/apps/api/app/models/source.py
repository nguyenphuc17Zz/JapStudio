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
    func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ContentSource(Base):
    """Represents an external Japanese content source managed by Immersion."""
    __tablename__ = "content_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Core Source & Connector Classifications
    source_type: Mapped[str] = mapped_column(String(50), default="WEB", index=True, nullable=False) # NEWS, SOCIAL, BLOG, FORUM, WEB, OTHER
    connector_type: Mapped[str] = mapped_column(String(50), default="RSS", index=True, nullable=False) # RSS, ATOM, REST_API, JSON_API, GRAPHQL, SITEMAP, WEB, REDDIT, X, THREADS, CUSTOM

    # URL Endpoints
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    feed_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    api_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Identity & Deduplication
    canonical_url: Mapped[Optional[str]] = mapped_column(String(500), index=True, nullable=True)
    external_identifier: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)

    # Japanese Language & Regional Context
    language: Mapped[str] = mapped_column(String(20), default="ja", nullable=False)
    country: Mapped[str] = mapped_column(String(10), default="JP", nullable=False)
    region: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Lifecycle, Status & Health
    status: Mapped[str] = mapped_column(String(30), default="active", index=True, nullable=False) # active, paused, error, disabled
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    health_status: Mapped[str] = mapped_column(String(30), default="UNKNOWN", index=True, nullable=False) # HEALTHY, WARNING, ERROR, UNKNOWN

    # Learning Roles & Categories
    content_roles: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False) # FORMAL, CASUAL, INTERNET, BUSINESS, TECHNICAL, LIFESTYLE, NEWS, CULTURE, ACADEMIC, ENTERTAINMENT
    categories: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False) # Technology, AI, Anime, Gaming, Business, Economy, Politics, Culture, Lifestyle...
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="news")
    topics: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # Sync Scheduling & Prioritization
    sync_interval_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False) # 1 (low) - 10 (urgent)
    fallback_chain: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False) # e.g. ["REST_API", "RSS", "SITEMAP", "WEB"]

    # Concurrency Lock
    is_syncing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Connector-specific Configurations & Headers
    config_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    headers_json: Mapped[Dict[str, str]] = mapped_column(JSON, default=dict, nullable=False)

    # Capabilities Matrix
    capabilities: Mapped[Dict[str, str]] = mapped_column(JSON, default=dict, nullable=False)

    # Synchronization Timestamps & Metrics
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_success_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_error_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_sync_duration_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    consecutive_failure_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    items_fetched_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_fetched_today: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_failed_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_rejected_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Aliases for backwards compatibility
    @property
    def last_synced_at(self) -> Optional[datetime]:
        return self.last_sync_at

    @last_synced_at.setter
    def last_synced_at(self, value: Optional[datetime]) -> None:
        self.last_sync_at = value

    @property
    def last_successful_sync_at(self) -> Optional[datetime]:
        return self.last_success_at

    @last_successful_sync_at.setter
    def last_successful_sync_at(self, value: Optional[datetime]) -> None:
        self.last_success_at = value

    @property
    def items_total_count(self) -> int:
        return self.items_fetched_total

    @items_total_count.setter
    def items_total_count(self, value: int) -> None:
        self.items_fetched_total = value

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    credential_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    credential: Mapped[Optional["SourceCredential"]] = relationship(
        "SourceCredential",
        back_populates="source",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    activity_logs: Mapped[List["SourceActivityLog"]] = relationship(
        "SourceActivityLog",
        back_populates="source",
        cascade="all, delete-orphan",
        order_by="desc(SourceActivityLog.created_at)",
        lazy="select"
    )
    canonical_contents: Mapped[List["CanonicalContent"]] = relationship(
        "CanonicalContent",
        back_populates="source",
        cascade="all, delete-orphan",
        lazy="select"
    )
    ingestion_jobs: Mapped[List["IngestionJob"]] = relationship(
        "IngestionJob",
        back_populates="source",
        cascade="all, delete-orphan",
        order_by="desc(IngestionJob.created_at)",
        lazy="select"
    )
    sync_state: Mapped[Optional["SourceSyncState"]] = relationship(
        "SourceSyncState",
        back_populates="source",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class SourceCredential(Base):
    """Encrypted credential storage for authenticated sources."""
    __tablename__ = "source_credentials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("content_sources.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    auth_type: Mapped[str] = mapped_column(String(50), default="none", nullable=False) # none, api_key, bearer_token, basic_auth, oauth2
    encrypted_secret: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # e.g. X-API-Key or Authorization
    extra_config_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    source: Mapped["ContentSource"] = relationship("ContentSource", back_populates="credential")


class SourceActivityLog(Base):
    """Historical audit log of connector interactions and sync operations."""
    __tablename__ = "source_activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    source_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("content_sources.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False) # sync_started, sync_completed, sync_failed, test_connection, health_check, config_update
    connector_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False) # RSS, ATOM, REST_API, SITEMAP, WEB, etc.
    status: Mapped[str] = mapped_column(String(30), nullable=False) # SUCCESS, WARNING, ERROR
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    items_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False) # Redacted, strictly no secrets
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)

    source: Mapped["ContentSource"] = relationship("ContentSource", back_populates="activity_logs")
