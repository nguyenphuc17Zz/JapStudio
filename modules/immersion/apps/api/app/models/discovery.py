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


class Topic(Base):
    """Canonical Topic entity representing a cluster of related Japanese stories/discussions."""
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="general", index=True, nullable=False)

    keywords_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    entity_ids_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    aliases_json: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    is_evergreen: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    moderation_status: Mapped[str] = mapped_column(
        String(30), default="VISIBLE", index=True, nullable=False
    )  # VISIBLE, HIDDEN, REVIEW_REQUIRED

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    contents: Mapped[List["TopicContent"]] = relationship(
        "TopicContent", back_populates="topic", cascade="all, delete-orphan", lazy="selectin"
    )
    trending_info: Mapped[Optional["TrendingTopic"]] = relationship(
        "TrendingTopic", back_populates="topic", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    snapshots: Mapped[List["TrendSnapshot"]] = relationship(
        "TrendSnapshot", back_populates="topic", cascade="all, delete-orphan", lazy="select"
    )


class TrendingTopic(Base):
    """Dynamic trend status, velocity, and multi-source diversity metrics for a topic."""
    __tablename__ = "trending_topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)

    trend_score: Mapped[float] = mapped_column(Float, default=0.0, index=True, nullable=False)  # 0 - 100
    momentum_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # -100 to +100
    volume_score: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    source_diversity_score: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)  # 0 - 100
    freshness_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)  # 0 - 100
    confidence_score: Mapped[float] = mapped_column(Float, default=85.0, nullable=False)  # 0 - 100

    status: Mapped[str] = mapped_column(
        String(30), default="EMERGING", index=True, nullable=False
    )  # EMERGING, RISING, PEAK, COOLING, ENDED, EVERGREEN

    lifecycle_history_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    peak_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    topic: Mapped["Topic"] = relationship("Topic", back_populates="trending_info")


class TopicContent(Base):
    """Association linking canonical content items to their contextual topic clusters."""
    __tablename__ = "topic_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), index=True, nullable=False
    )
    content_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("canonical_contents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    relevance_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    source_type: Mapped[str] = mapped_column(
        String(50), default="NEWS", index=True, nullable=False
    )  # NEWS, SOCIAL, BLOG, TECHNICAL, FORUM
    register: Mapped[str] = mapped_column(
        String(50), default="FORMAL", nullable=False
    )  # FORMAL, CASUAL, INTERNET, TECHNICAL
    is_representative: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    topic: Mapped["Topic"] = relationship("Topic", back_populates="contents")
    content: Mapped["CanonicalContent"] = relationship("CanonicalContent", lazy="selectin")

    __table_args__ = (
        Index("ix_topic_contents_topic_source", "topic_id", "source_type"),
    )


class TrendSnapshot(Base):
    """Historical time-series trend tracking to power velocity charts and growth metrics."""
    __tablename__ = "trend_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), index=True, nullable=False
    )

    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True, nullable=False)
    trend_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    volume: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    velocity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    source_diversity: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    topic: Mapped["Topic"] = relationship("Topic", back_populates="snapshots")


class DiscoveryEdge(Base):
    """Graph edges connecting topics, entities, and content for Rabbit Hole exploration."""
    __tablename__ = "discovery_edges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    from_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # TOPIC, CONTENT, EXPRESSION
    from_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)

    to_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # TOPIC, CONTENT, EXPRESSION
    to_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)

    relation_type: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )  # RELATED_TOPIC, SAME_EVENT, FOLLOW_UP, CAUSED_BY, RELATED_ENTITY, SIMILAR_TOPIC, CONTRASTING_TOPIC, VOCABULARY_RELEVANT

    weight: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    label: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_discovery_edges_from", "from_type", "from_id"),
        Index("ix_discovery_edges_to", "to_type", "to_id"),
    )


class DiscoverySession(Base):
    """Lightweight session log tracking user's rabbit hole journey and preventing loops."""
    __tablename__ = "discovery_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(100), default="default_user", index=True, nullable=False)
    entry_point_type: Mapped[str] = mapped_column(String(50), default="TOPIC", nullable=False)
    entry_point_id: Mapped[int] = mapped_column(Integer, nullable=False)

    path_history_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    depth: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
