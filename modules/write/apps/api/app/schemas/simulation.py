"""API schemas for the interactive simulation domain (Phase 10).

The session response embeds the full conversation (turns + per-turn
evaluation). Reads never re-trigger the AI; the summary is generated once
and persisted.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SimulationCreateRequest(BaseModel):
    scenario_id: str = Field(min_length=1, max_length=64)
    mode: str = Field(default="guided", pattern=r"^(guided|immersive)$")
    provider: str | None = None
    model: str | None = None


class SimulationTurnRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    end_early: bool = False
    provider: str | None = None
    model: str | None = None


class SimulationCoachRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    provider: str | None = None
    model: str | None = None


class SimulationCorrections(BaseModel):
    minimal_fix: str | None = None
    natural_rewrite: str | None = None
    native_rewrite: str | None = None


class SimulationTurnIssueOut(BaseModel):
    category: str
    severity: str
    explanation: str
    suggested_fix: str


class SimulationTurnEvaluationOut(BaseModel):
    overall_score: int
    sentence_quality: int | None
    scenario_fit: int | None
    goal_progress: int
    communication_effectiveness: int
    naturalness_score: int | None
    strengths: list[str] = Field(default_factory=list)
    issues: list[SimulationTurnIssueOut] = Field(default_factory=list)
    feedback_vi: str | None = None
    corrections: SimulationCorrections | None = None


class SimulationTurnOut(BaseModel):
    id: str
    turn_number: int
    actor: str
    turn_type: str
    text: str
    status: str
    created_at: datetime
    evaluation: SimulationTurnEvaluationOut | None = None


class SimulationStateOut(BaseModel):
    objective: str
    current_stage: str
    unresolved_items: list[str] = Field(default_factory=list)
    completed_items: list[str] = Field(default_factory=list)
    participant_positions: dict[str, Any] = Field(default_factory=dict)
    facts: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    emotional_context: str = ""
    next_goal: str = ""


class SimulationSessionResponse(BaseModel):
    id: str
    scenario_id: str
    simulation_type: str
    mode: str
    register: str
    jlpt_level: str
    difficulty: int
    pressure_condition: str
    status: str
    resolution: str | None
    max_turns: int
    current_turn: int
    objective_vi: str
    persona: dict[str, Any] | None
    state: SimulationStateOut
    meta: dict[str, Any] = Field(default_factory=dict)
    summary: dict[str, Any] | None = None
    turns: list[SimulationTurnOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class SimulationCompareItem(BaseModel):
    previous_session_id: str
    deltas: dict[str, int] = Field(default_factory=dict)


class SimulationSummaryResponse(BaseModel):
    session_id: str
    summary_vi: str
    dimensions: dict[str, int] = Field(default_factory=dict)
    strengths: list[str] = Field(default_factory=list)
    needs_work: list[str] = Field(default_factory=list)
    resolution: str
    turn_count: int
    compare: SimulationCompareItem | None = None
    suggested_challenge: dict[str, Any] | None = None
    ai_generated: bool
    provider: str
    model: str
    prompt_version: str


class SimulationExplainResponse(BaseModel):
    turn_id: str
    corrections: SimulationCorrections | None = None
    issues: list[SimulationTurnIssueOut] = Field(default_factory=list)
    feedback_vi: str | None = None
    summary: str = ""


class SimulationCoachResponse(BaseModel):
    answer: str
    suggestions: list[str] = Field(default_factory=list)


class SimulationHistoryItem(BaseModel):
    id: str
    simulation_type: str
    mode: str
    register: str
    status: str
    resolution: str | None
    turn_count: int
    average_overall: int | None
    scenario_id: str
    created_at: datetime
    updated_at: datetime


class SimulationHistoryResponse(BaseModel):
    items: list[SimulationHistoryItem] = Field(default_factory=list)
    total: int = 0
