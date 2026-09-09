"""API schemas for the adaptive learning engine (Phase 6)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class LearnerProfileUpdate(BaseModel):
    """Editable profile preferences (all fields optional)."""

    goal: str | None = Field(default=None, max_length=50)
    goal_type: str | None = Field(default=None, max_length=32)
    target_jlpt: str | None = Field(default=None, pattern=r"^N[1-5]$")
    daily_target: int | None = Field(default=None, ge=1, le=20)
    preferred_registers: list[str] | None = None
    preferred_topics: list[str] | None = None
    streak_enabled: bool | None = None
    memory_enabled: bool | None = None


class LearningNextRequest(BaseModel):
    """Optional provider and model selection for recommendations."""

    provider: str | None = None
    model: str | None = None


class LearnerProfileResponse(BaseModel):
    id: str
    goal: str | None
    goal_type: str | None
    target_jlpt: str | None
    daily_target: int
    preferred_registers: list[str] | None
    preferred_topics: list[str] | None
    native_language: str
    target_level: str | None
    adaptive_state: dict[str, Any] | None
    evidence_count: int = 0
    profile_version: str
    streak_enabled: bool = True
    memory_enabled: bool = True
    created_at: datetime
    updated_at: datetime


class LearningRecommendationResponse(BaseModel):
    id: str
    strategy: str
    scenario_genre: str | None = None
    exercise_type: str
    topic: str
    register: str
    jlpt_level: str
    difficulty: int
    target_length: str
    focus_skills: list[str]
    reason: str
    explanation: str | None
    status: str
    exercise_id: str | None
    objective_id: str | None = None
    milestone_id: str | None = None
    exercise: dict[str, Any] | None
    created_at: datetime


class LearningHistoryResponse(BaseModel):
    items: list[LearningRecommendationResponse]
    total: int
    skip: int
    limit: int


class LearningTodayResponse(BaseModel):
    session: dict[str, Any] | None
    focus: dict[str, Any]
    recommendation: LearningRecommendationResponse | None


class LearningNextResponse(LearningRecommendationResponse):
    pass
