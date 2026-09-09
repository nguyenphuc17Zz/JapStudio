from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class ContentBase(BaseModel):
    title: str
    canonical_url: str
    external_id: Optional[str] = None
    content_type: str = "ARTICLE"
    excerpt: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    language: str = "ja"
    language_status: str = "JA"
    image_url: Optional[str] = None
    status: str = "PUBLISHED"
    duplicate_group_id: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class ContentResponse(ContentBase):
    id: int
    source_id: int
    source_name: Optional[str] = None
    content_hash: str
    rejection_reason: Optional[str] = None
    fetched_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContentListResponse(BaseModel):
    items: List[ContentResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
