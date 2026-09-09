from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class RawContentItem(BaseModel):
    """Standardized normalized raw content item returned by all connectors."""
    external_id: Optional[str] = None
    title: Optional[str] = None
    url: str
    content: Optional[str] = None
    excerpt: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    updated_at: Optional[str] = None
    language: Optional[str] = "ja"
    image_url: Optional[str] = None
    source_metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def summary(self) -> Optional[str]:
        return self.excerpt or (self.content[:300] if self.content else None)

    @property
    def tags(self) -> List[str]:
        return (self.source_metadata or {}).get("tags", [])


class ConnectorWarning(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = {}


class ConnectorError(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = {}
    error_type: str = "transient" # transient, permanent, auth, timeout, rate_limited


class ConnectorFetchResult(BaseModel):
    """Standardized connector fetch response returned to core ingestion layer."""
    success: bool
    items: List[RawContentItem] = Field(default_factory=list)
    fetched_count: int = 0
    next_cursor: Optional[str] = None
    next_page: Optional[str] = None
    warnings: List[ConnectorWarning] = Field(default_factory=list)
    errors: List[ConnectorError] = Field(default_factory=list)
    duration_ms: float = 0.0
    status_code: Optional[int] = 200
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def response_time_ms(self) -> float:
        return self.duration_ms

    @property
    def error_message(self) -> Optional[str]:
        if self.errors:
            return self.errors[0].message
        return None

    @property
    def pagination_metadata(self) -> Optional[Dict[str, Any]]:
        if self.next_cursor or self.next_page:
            return {"next_cursor": self.next_cursor, "next_page": self.next_page}
        return None


class ConnectorMeta(BaseModel):
    """Connector metadata and capabilities specification."""
    connector_type: str
    name: str
    description: str
    is_production_ready: bool = True
    supported_auth: List[str] = ["none"]
    required_config_fields: List[str] = []
    optional_config_fields: List[str] = []
    default_capabilities: Dict[str, str] = {}
    default_headers: Dict[str, str] = {}

    @property
    def source_type(self) -> str:
        if self.connector_type == "REST_API":
            return "api"
        return self.connector_type.lower()


class TestConnectionResult(BaseModel):
    """Diagnostic response for testing source connectivity."""
    success: bool
    connector_type: str
    status_code: Optional[int] = None
    duration_ms: float
    message: str
    sample_items_count: int = 0
    sample_preview: List[Dict[str, Any]] = Field(default_factory=list)
    error_details: Optional[str] = None
    actionable_fix: Optional[str] = None

    @property
    def response_time_ms(self) -> float:
        return self.duration_ms


class HealthCheckResult(BaseModel):
    """Health status evaluation response."""
    status: str # HEALTHY, WARNING, ERROR, UNKNOWN
    duration_ms: float
    status_code: Optional[int] = None
    message: str
    timestamp: str

    @property
    def response_time_ms(self) -> float:
        return self.duration_ms


class SyncResultResponse(BaseModel):
    """Standardized response from manual or scheduled sync."""
    source_id: int
    job_id: Optional[int] = None
    request_id: Optional[str] = None
    success: bool
    items_fetched: int
    duration_ms: float
    status: str
    message: str
    sample_titles: List[str] = Field(default_factory=list)
    warnings: List[ConnectorWarning] = Field(default_factory=list)
    errors: List[ConnectorError] = Field(default_factory=list)


class AutoDetectFeedItem(BaseModel):
    title: Optional[str] = None
    url: str
    feed_type: str # RSS, ATOM, SITEMAP, JSON_API


class AutoDetectResponse(BaseModel):
    """Result of automated URL capability and endpoint discovery."""
    url: str
    canonical_url: Optional[str] = None
    website_detected: bool = False
    rss_detected: bool = False
    atom_detected: bool = False
    sitemap_detected: bool = False
    json_api_detected: bool = False
    detected_feeds: List[AutoDetectFeedItem] = Field(default_factory=list)
    detected_sitemaps: List[str] = Field(default_factory=list)
    site_title: Optional[str] = None
    site_description: Optional[str] = None
    site_icon: Optional[str] = None
    recommended_connector: str = "RSS"
    suggested_learning_roles: List[str] = Field(default_factory=list)
    suggested_categories: List[str] = Field(default_factory=list)
    capabilities: Dict[str, str] = Field(default_factory=dict)


# Backwards compatibility aliases
TestConnectionResponse = TestConnectionResult
HealthCheckResponse = HealthCheckResult
