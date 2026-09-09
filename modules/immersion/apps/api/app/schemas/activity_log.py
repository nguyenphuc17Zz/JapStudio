from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ActivityLogResponse(BaseModel):
    """Activity log serialization schema with audit support."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    request_id: Optional[str] = None
    source_id: int
    event_type: str = Field(default="sync", alias="action")
    connector_type: Optional[str] = "RSS"
    status: str
    status_code: Optional[int] = None
    duration_ms: Optional[float] = Field(default=None, alias="response_time_ms")
    items_count: int = Field(default=0, alias="items_fetched")
    message: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict, alias="details_json")
    created_at: datetime
