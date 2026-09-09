from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# 1. Topic & Trending Schemas
# ---------------------------------------------------------------------------

class TopicResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str
    category: str
    keywords: List[str] = Field(default_factory=list)
    aliases: List[str] = Field(default_factory=list)
    is_evergreen: bool = False
    moderation_status: str = "VISIBLE"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrendingTopicItem(BaseModel):
    id: int
    topic_id: int
    name: str
    slug: str
    title: str
    summary: str
    trend_score: float
    momentum_score: float
    volume_score: int
    source_diversity_score: float
    freshness_score: float
    confidence_score: float
    status: str
    fire_count: int = 1  # 1 to 5 flames
    source_types: List[str] = Field(default_factory=list)
    article_count: int = 0
    first_seen_at: datetime
    last_activity_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrendingTopicsResponse(BaseModel):
    items: List[TrendingTopicItem]
    total: int
    time_window: str = "24h"


# ---------------------------------------------------------------------------
# 2. Explore Page Discovery Hub
# ---------------------------------------------------------------------------

class ExploreCategoryGroup(BaseModel):
    category: str
    title: str
    description: str
    topics: List[TrendingTopicItem]


class ExplorePageResponse(BaseModel):
    trending_today: List[TrendingTopicItem]
    gaining_attention: List[TrendingTopicItem]
    categories: List[ExploreCategoryGroup]
    rabbit_hole_starters: List[Dict[str, Any]]
    total_active_topics: int


# ---------------------------------------------------------------------------
# 3. Topic Multi-Source & Register Lens
# ---------------------------------------------------------------------------

class TopicArticleItem(BaseModel):
    content_id: int
    title: str
    excerpt: Optional[str] = None
    source_name: str
    source_type: str  # NEWS, SOCIAL, BLOG, TECHNICAL
    published_at: Optional[datetime] = None
    register: str = "FORMAL"  # FORMAL, CASUAL, INTERNET, TECHNICAL
    reading_time_minutes: int = 3
    image_url: Optional[str] = None
    is_representative: bool = False

    model_config = ConfigDict(protected_namespaces=())


class RegisterComparisonItem(BaseModel):
    register: str  # FORMAL, CASUAL, INTERNET, TECHNICAL
    label: str     # Tin tức báo đài, Đời thường/Blog, Mạng xã hội/Slang
    sample_sentence: str
    nuance: str
    source_name: str

    model_config = ConfigDict(protected_namespaces=())


class TopicDetailResponse(BaseModel):
    topic: TopicResponse
    trending_info: Optional[TrendingTopicItem] = None
    total_articles: int
    sources_breakdown: Dict[str, int]
    representative_news: Optional[TopicArticleItem] = None
    representative_social: Optional[TopicArticleItem] = None
    representative_blog: Optional[TopicArticleItem] = None
    register_comparison: List[RegisterComparisonItem] = Field(default_factory=list)
    common_collocations: List[str] = Field(default_factory=list)
    recurring_vocabulary: List[Dict[str, Any]] = Field(default_factory=list)
    timeline_count: int = 0


# ---------------------------------------------------------------------------
# 4. Multi-Source Timeline & Comparison
# ---------------------------------------------------------------------------

class TopicTimelineEvent(BaseModel):
    id: int
    timestamp: datetime
    source_name: str
    source_type: str
    title: str
    excerpt: Optional[str] = None
    content_id: int
    register: str

    model_config = ConfigDict(protected_namespaces=())


class TopicTimelineResponse(BaseModel):
    topic_name: str
    slug: str
    events: List[TopicTimelineEvent]
    total: int


class TopicSourceComparisonResponse(BaseModel):
    topic_name: str
    slug: str
    news_lens: Dict[str, Any]
    social_lens: Dict[str, Any]
    blog_lens: Dict[str, Any]
    register_comparison: List[RegisterComparisonItem]
    divergence_summary: str


# ---------------------------------------------------------------------------
# 5. Rabbit Hole Engine Schemas
# ---------------------------------------------------------------------------

class RabbitHoleNode(BaseModel):
    id: int
    type: str  # TOPIC, CONTENT, VOCABULARY, EXPRESSION
    title: str
    subtitle: Optional[str] = None
    badge: str
    score: float = 1.0
    relation_type: str  # RELATED_TOPIC, SAME_EVENT, FOLLOW_UP, CAUSED_BY, RELATED_ENTITY
    relation_label: str  # Chủ đề liên quan, Diễn biến tiếp nối, Cùng sự kiện...
    slug: Optional[str] = None


class RabbitHoleResponse(BaseModel):
    current_node: Dict[str, Any]
    related_nodes: List[RabbitHoleNode]
    breadcrumb_path: List[Dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 6. Admin Trends & Moderation Schemas
# ---------------------------------------------------------------------------

class AdminTrendItem(BaseModel):
    topic_id: int
    name: str
    slug: str
    category: str
    trend_score: float
    momentum: float
    volume: int
    source_diversity: float
    confidence: float
    status: str
    moderation_status: str
    last_activity_at: datetime


class AdminTrendsResponse(BaseModel):
    trends: List[AdminTrendItem]
    total: int


class ModerateTopicRequest(BaseModel):
    moderation_status: str  # VISIBLE, HIDDEN, REVIEW_REQUIRED


class MergeTopicRequest(BaseModel):
    source_topic_id: int
    target_topic_id: int
