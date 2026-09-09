from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class ItemLogResponse(BaseModel):
    id: int
    job_id: int
    source_id: int
    external_id: Optional[str] = None
    url: Optional[str] = None
    status: str
    reason: Optional[str] = None
    content_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IngestionJobResponse(BaseModel):
    id: int
    source_id: int
    source_name: Optional[str] = None
    connector_type: Optional[str] = None
    job_type: str
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
    items_seen: int = 0
    items_fetched: int = 0
    items_normalized: int = 0
    items_created: int = 0
    items_updated: int = 0
    items_duplicate: int = 0
    items_rejected: int = 0
    items_failed: int = 0
    error_summary: Optional[str] = None
    error_type: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IngestionJobDetailResponse(IngestionJobResponse):
    item_logs: List[ItemLogResponse] = Field(default_factory=list)


class IngestionJobListResponse(BaseModel):
    items: List[IngestionJobResponse]
    total: int
    page: int
    page_size: int
    has_next: bool


class IngestionStatsResponse(BaseModel):
    jobs_today: int = 0
    successful_jobs: int = 0
    failed_jobs: int = 0
    partial_jobs: int = 0
    running_jobs: int = 0
    queued_jobs: int = 0
    items_fetched: int = 0
    items_created: int = 0
    items_updated: int = 0
    items_duplicate: int = 0
    items_rejected: int = 0
    avg_duration_ms: float = 0.0


class SyncTriggerResponse(BaseModel):
    success: bool
    job_id: int
    source_id: int
    status: str = "QUEUED"
    message: str


class SourceSyncStateResponse(BaseModel):
    source_id: int
    cursor: Optional[str] = None
    page: Optional[int] = None
    last_seen_external_id: Optional[str] = None
    last_started_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    consecutive_failures: int = 0
    circuit_state: str = "CLOSED"
    circuit_opened_at: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
