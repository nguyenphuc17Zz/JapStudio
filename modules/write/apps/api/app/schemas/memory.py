"""API contracts for the memory layer (Phase 12)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LearnerMemoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    type: str
    content: str
    confidence: str
    importance: int
    source_type: str
    source_id: str | None = None
    evidence: list = Field(default_factory=list)
    occurrence_count: int = 1
    status: str
    memory_class: str = "stable"
    first_seen_at: datetime
    last_seen_at: datetime
    created_at: datetime
    updated_at: datetime


class LearnerMemoryCreate(BaseModel):
    """Explicit user-created memory (source is always ``user_explicit``)."""

    category: str = Field(min_length=1, max_length=32)
    type: str = Field(default="preference", min_length=1, max_length=16)
    content: str = Field(min_length=1, max_length=500)
    importance: int = Field(default=8, ge=1, le=10)


class MemoryListResponse(BaseModel):
    items: list[LearnerMemoryResponse]
    total: int
    skip: int
    limit: int


class MemoryRefreshResponse(BaseModel):
    processed_events: int = 0
    created: int = 0
    updated: int = 0
    rejected: int = 0
    expired: int = 0
