"""Structured AI-pipeline contracts for the interactive simulation (Phase 10).

Stage outputs (planner -> turn generation -> turn evaluation -> state
update -> context summary -> final summary -> coach) are validated by the
Phase 2 gateway before the simulation service sees them. The AI never owns
the simulation state: it only proposes state updates that the deterministic
state machine validates and merges.
"""

from typing import Any

from pydantic import BaseModel, Field

_TURN_TYPE_PATTERN = (
    r"^(opening|question|clarification|objection|negotiation|confirmation|"
    r"correction|escalation|resolution|closing)$"
)
_PRESSURE_PATTERN = (
    r"^(normal|time_pressure|difficult_client|unclear_requirement|"
    r"conflicting_request|high_formality)$"
)
_CATEGORY_PATTERN = r"^(grammar|vocabulary|naturalness|register|semantic)$"
_SEVERITY_PATTERN = r"^(info|minor|major|critical)$"
_TONE_PATTERN = (
    r"^(friendly|neutral|polite|professional|apologetic|persuasive|"
    r"conciliatory|firm)$"
)


class SimulationStagePlan(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    goal: str = Field(min_length=1, max_length=300)


class SimulationPersona(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    role: str = Field(min_length=1, max_length=100)
    personality_vi: str = Field(min_length=1, max_length=300)


class SimulationPlanResult(BaseModel):
    """Planner stage output: the conversation design for one scenario."""

    objective_vi: str = Field(min_length=1, max_length=500)
    stages: list[SimulationStagePlan] = Field(min_length=3, max_length=5)
    persona: SimulationPersona
    pressure_condition: str = Field(pattern=_PRESSURE_PATTERN)
    difficulty: dict[str, int] = Field(default_factory=dict, max_length=10)


class SimulationTurnGenerationResult(BaseModel):
    """Turn generation output: the persona's next Japanese message."""

    message_ja: str = Field(min_length=1, max_length=400)
    tone: str = Field(pattern=_TONE_PATTERN)


class SimulationTurnIssue(BaseModel):
    category: str = Field(pattern=_CATEGORY_PATTERN)
    severity: str = Field(pattern=_SEVERITY_PATTERN)
    explanation: str = Field(min_length=1, max_length=500)
    suggested_fix: str = Field(min_length=1, max_length=500)


class SimulationTurnEvaluationResult(BaseModel):
    """Turn evaluation output: conversation-level judgement only.

    Sentence/scenario scores are deterministic; this stage adds the two
    simulation dimensions and the guided feedback.
    """

    goal_progress: int = Field(ge=0, le=100)
    communication_effectiveness: int = Field(ge=0, le=100)
    strengths: list[str] = Field(min_length=1, max_length=4)
    issues: list[SimulationTurnIssue] = Field(default_factory=list, max_length=3)
    feedback_vi: str = Field(min_length=1, max_length=400)


class SimulationStateUpdateResult(BaseModel):
    """Proposed state change; the deterministic validator must accept it."""

    unresolved_items: list[str] = Field(default_factory=list, max_length=20)
    completed_items: list[str] = Field(default_factory=list, max_length=20)
    facts: list[str] = Field(default_factory=list, max_length=30)
    decisions: list[str] = Field(default_factory=list, max_length=20)
    participant_positions: dict[str, Any] = Field(default_factory=dict, max_length=10)
    emotional_context: str = Field(default="", max_length=200)
    next_goal: str = Field(default="", max_length=300)


class SimulationContextSummaryResult(BaseModel):
    """Structured memory for long conversations (context window control)."""

    unresolved_items: list[str] = Field(default_factory=list, max_length=20)
    decisions: list[str] = Field(default_factory=list, max_length=20)
    facts: list[str] = Field(default_factory=list, max_length=30)
    participant_positions: dict[str, Any] = Field(default_factory=dict, max_length=10)
    emotional_context: str = Field(default="", max_length=200)
    summary_note: str = Field(min_length=1, max_length=500)


class SimulationSummaryResult(BaseModel):
    """Final report; every claim must be grounded in the persisted turns."""

    summary_vi: str = Field(min_length=1, max_length=700)
    strengths: list[str] = Field(default_factory=list, max_length=4)
    needs_work: list[str] = Field(default_factory=list, max_length=4)


class SimulationCoachResult(BaseModel):
    """Bounded coach answer about the active session."""

    answer: str = Field(min_length=1, max_length=700)
    suggestions: list[str] = Field(default_factory=list, max_length=4)
