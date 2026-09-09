"""API schemas for the AI Curriculum & Learning Journey Engine (Phase 13)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class JourneyMilestoneResponse(BaseModel):
    id: str
    position: int
    title: str
    description: str
    status: str
    unlocked_at: datetime | None = None
    completed_at: datetime | None = None


class JourneyObjectiveResponse(BaseModel):
    id: str
    milestone_id: str
    position: int
    title: str
    description: str
    target_competencies: list[str]
    target_skills: list[str]
    exercise_modes: list[str]
    target_level: str
    priority: int
    status: str
    unlocked_at: datetime | None = None
    completed_at: datetime | None = None


class JourneyProgressResponse(BaseModel):
    skill_evidence: dict[str, Any] = {}
    mastery_state: str = "not_started"
    exercises_completed: int = 0
    attempts_submitted: int = 0
    average_score: int = 0
    best_score: int = 0


class ObjectiveStatusResponse(BaseModel):
    objective: JourneyObjectiveResponse
    progress: JourneyProgressResponse
    explanation_vi: str | None = None


class JourneyStatusResponse(BaseModel):
    journey_id: str
    status: str
    goal_type: str
    goal: str | None = None
    title: str | None = None
    overview_vi: str | None = None
    progress: int
    source: str = "ai"
    current_milestone_id: str | None = None
    current_objective_id: str | None = None
    explanation: str | None = None
    started_at: datetime
    completed_at: datetime | None = None
    milestones: list[JourneyMilestoneResponse] = []
    objectives: list[JourneyObjectiveResponse] = []
    objectives_progress: dict[str, JourneyProgressResponse] = {}


class JourneyCreateResponse(JourneyStatusResponse):
    pass


class JourneyObjectiveContextResponse(BaseModel):
    objective_id: str
    objective_title: str
    milestone_title: str
    competency_labels_vi: dict[str, str]
    target_skills: list[str]
    suggested_modes: list[str]
    context: str
    progress: JourneyProgressResponse


class JourneyEvidenceResponse(BaseModel):
    objective_id: str
    exercise_id: str
    attempt_id: str
    exercise_type: str
    mode: str
    topic: str
    score: int
    skills: dict[str, Any]
    created_at: datetime


class JourneyEvidenceListResponse(BaseModel):
    objective_id: str
    items: list[JourneyEvidenceResponse]
    total: int


class JourneyCreateRequest(BaseModel):
    goal_type: str | None = Field(default=None, max_length=32)
    goal: str | None = Field(default=None, max_length=50)
    force_regenerate: bool = False
    provider: str | None = None
    model: str | None = None


class JourneyReplanningResponse(BaseModel):
    journey_id: str | None = None
    replan_requested: bool
    trigger: str
    reason: str
    applied: bool
    event_id: str | None = None


class ObjectiveExplanationResponse(BaseModel):
    objective_id: str
    summary_vi: str
    recommended_focus_vi: str
    source: str = "ai"
