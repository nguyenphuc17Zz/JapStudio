"""API schemas for the gamification experience layer (Phase 7)."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class DailyGoalState(BaseModel):
    target: int
    completed_count: int
    completed: bool
    progress_percent: int


class LevelState(BaseModel):
    current_level: int
    current_xp: int
    xp_in_level: int
    xp_to_next_level: int
    progress_percent: int


class GamificationSummary(BaseModel):
    level: LevelState
    current_streak: int
    longest_streak: int
    last_active_date: date | None
    today_xp: int
    daily_goal: DailyGoalState


class XpEventItem(BaseModel):
    id: str
    event_type: str
    amount: int
    source_type: str
    source_id: str
    metadata: dict[str, Any] | None
    created_at: datetime


class XpHistoryResponse(BaseModel):
    items: list[XpEventItem]
    total: int
    skip: int
    limit: int


class DailyMissionResponse(BaseModel):
    id: str
    mission_type: str
    title: str
    description: str
    target_count: int
    completed_count: int
    completed: bool
    focus_skills: list[str]
    topic: str
    register: str
    difficulty: int
    reason: str
    status: str
    provider: str
    model: str
    prompt_version: str
    created_at: datetime


class GamificationTodayResponse(BaseModel):
    summary: GamificationSummary
    mission: DailyMissionResponse | None
    focus: dict[str, Any]
    recommendation: dict[str, Any] | None
    session_summary: dict[str, Any] | None
    encouragement: str | None
    reminders: list[str]


class ChallengeResponse(BaseModel):
    id: str
    challenge_type: str
    instruction_vi: str
    source_text: str
    target_skill: str
    difficulty: int
    objective: str
    required_expression: str | None
    exercise_id: str
    status: str
    success_criteria: dict[str, Any]
    xp_reward: int
    completed: bool
    completed_at: datetime | None
    created_at: datetime


class ChallengeGenerateRequest(BaseModel):
    provider: str | None = None
    model: str | None = None


class ChallengeAttemptRequest(BaseModel):
    answer_text: str = Field(min_length=1, max_length=5000)
    provider: str | None = None
    model: str | None = None


class ChallengeAttemptResponse(BaseModel):
    id: str
    challenge_id: str
    attempt_id: str
    success: bool
    score: int
    answer_text: str
    evaluation: dict[str, Any]
    xp_awarded: int
    created_at: datetime


class ChallengeAttemptListResponse(BaseModel):
    items: list[ChallengeAttemptResponse]
    total: int


class MilestoneItem(BaseModel):
    id: str
    milestone_key: str
    title: str
    description: str
    achieved_at: datetime
    celebration: dict[str, Any] | None


class MilestoneListResponse(BaseModel):
    items: list[MilestoneItem]
