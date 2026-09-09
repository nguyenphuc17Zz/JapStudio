from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict

STANDARD_CAPABILITIES = [
    "hasTitle",
    "hasAuthor",
    "hasPublishedDate",
    "hasFullContent",
    "hasExcerpt",
    "hasImages",
    "hasComments",
    "hasEngagement",
    "supportsSearch",
    "supportsPagination",
    "supportsRealtime",
    "supportsHistoricalQuery",
]

DEFAULT_CAPABILITY_STATES: Dict[str, str] = {cap: "UNKNOWN" for cap in STANDARD_CAPABILITIES}


class SourceCredentialCreate(BaseModel):
    """Payload to create or update credentials."""
    auth_type: str = "none" # none, api_key, bearer_token, basic_auth, oauth2
    secret: Optional[str] = None # Plaintext input, will be encrypted
    key_name: Optional[str] = None # Header/Param name, e.g. "X-API-Key"
    extra_config_json: Dict[str, Any] = {}


class SourceCredentialResponse(BaseModel):
    """Safe response model exposing only masked secret."""
    model_config = ConfigDict(from_attributes=True)

    auth_type: str
    masked_secret: Optional[str] = None
    key_name: Optional[str] = None
    extra_config_json: Dict[str, Any] = {}
    updated_at: datetime


class SourceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    source_type: str = Field("WEB", description="NEWS, SOCIAL, BLOG, FORUM, WEB, OTHER")
    connector_type: str = Field("RSS", description="RSS, ATOM, REST_API, JSON_API, GRAPHQL, SITEMAP, WEB, REDDIT, X, THREADS, CUSTOM")
    category: Optional[str] = None
    description: Optional[str] = None
    base_url: Optional[str] = None
    feed_url: Optional[str] = None
    api_url: Optional[str] = None
    icon_url: Optional[str] = None
    canonical_url: Optional[str] = None
    external_identifier: Optional[str] = None
    language: str = "ja"
    country: str = "JP"
    region: Optional[str] = None
    content_roles: List[str] = Field(default_factory=list) # FORMAL, CASUAL, INTERNET, BUSINESS, TECHNICAL, LIFESTYLE, NEWS, CULTURE, ACADEMIC, ENTERTAINMENT
    categories: List[str] = Field(default_factory=list) # Technology, AI, Anime, Gaming, Business, Economy, Politics, Culture, Lifestyle...
    topics: List[str] = Field(default_factory=list)
    sync_interval_minutes: int = Field(60, ge=5, le=10080)
    priority: int = Field(5, ge=1, le=10)
    fallback_chain: List[str] = Field(default_factory=list)
    config_json: Dict[str, Any] = Field(default_factory=dict)
    headers_json: Dict[str, str] = Field(default_factory=dict)
    credential_reference: Optional[str] = None


class SourceCreate(SourceBase):
    slug: Optional[str] = None
    capabilities: Optional[Dict[str, str]] = None
    credential: Optional[SourceCredentialCreate] = None


class SourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    slug: Optional[str] = None
    source_type: Optional[str] = None
    connector_type: Optional[str] = None
    description: Optional[str] = None
    base_url: Optional[str] = None
    feed_url: Optional[str] = None
    api_url: Optional[str] = None
    icon_url: Optional[str] = None
    canonical_url: Optional[str] = None
    external_identifier: Optional[str] = None
    language: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = None # active, paused, error, disabled
    enabled: Optional[bool] = None
    content_roles: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    sync_interval_minutes: Optional[int] = Field(None, ge=5, le=10080)
    priority: Optional[int] = Field(None, ge=1, le=10)
    fallback_chain: Optional[List[str]] = None
    config_json: Optional[Dict[str, Any]] = None
    headers_json: Optional[Dict[str, str]] = None
    capabilities: Optional[Dict[str, str]] = None
    credential: Optional[SourceCredentialCreate] = None


class SourceResponse(SourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    status: str
    enabled: bool = True
    health_status: str = "UNKNOWN" # HEALTHY, WARNING, ERROR, UNKNOWN
    is_syncing: bool = False
    capabilities: Dict[str, str] = Field(default_factory=dict)
    last_sync_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    last_successful_sync_at: Optional[datetime] = None
    last_sync_duration_ms: Optional[float] = None
    consecutive_failure_count: int = 0
    last_error_message: Optional[str] = None
    items_fetched_total: int = 0
    items_total_count: int = 0
    items_fetched_today: int = 0
    items_failed_total: int = 0
    items_rejected_total: int = 0
    created_at: datetime
    updated_at: datetime
    credential: Optional[SourceCredentialResponse] = None


class SourceStats(BaseModel):
    """Aggregated statistics for immersion content sources."""
    total_sources: int = 0
    active_sources: int = 0
    paused_sources: int = 0
    error_sources: int = 0
    healthy_sources: int = 0
    warning_sources: int = 0
    down_sources: int = 0
    total_items: int = 0
    items_today: int = 0
    by_source_type: Dict[str, int] = Field(default_factory=dict)
    by_connector_type: Dict[str, int] = Field(default_factory=dict)
    by_role: Dict[str, int] = Field(default_factory=dict)
    by_category: Dict[str, int] = Field(default_factory=dict)


class BulkActionRequest(BaseModel):
    source_ids: List[int] = Field(..., min_length=1)
    action: str = Field(..., description="Action: activate, pause, delete, sync, health_check")


class BulkActionResult(BaseModel):
    action: str
    affected_count: int
    failed_count: int = 0
    message: str
    errors: List[str] = Field(default_factory=list)


class PresetSourceItem(BaseModel):
    key: str
    name: str
    source_type: str = "NEWS"
    connector_type: str = "RSS"
    content_roles: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    feed_url: Optional[str] = None
    base_url: Optional[str] = None
    description: str
    icon_url: Optional[str] = None
    sync_interval_minutes: int = 60
    priority: int = 5
    config_json: Dict[str, Any] = Field(default_factory=dict)
    headers_json: Dict[str, str] = Field(default_factory=dict)
    capabilities: Dict[str, str] = Field(default_factory=dict)


class PresetCategoryGroup(BaseModel):
    category: str
    label: str
    description: str
    items: List[PresetSourceItem]


class PresetInstallRequest(BaseModel):
    preset_keys: List[str] = Field(..., min_length=1)


class SourceExportData(BaseModel):
    version: str = "2.0"
    exported_at: datetime
    sources: List[Dict[str, Any]]
