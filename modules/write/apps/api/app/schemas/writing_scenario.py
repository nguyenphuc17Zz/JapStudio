"""Schemas for the writing-scenario domain (Phase 9).

Covers the AI pipeline contracts (plan -> draft -> validation -> evaluation)
and the API surface (generate / read / exercise / history). All AI output is
validated against the deterministic taxonomy in
``app.domain.scenario_formats``; composite scores stay deterministic in the
service layer.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

_VALUE_PATTERN = r"^[a-z_]+$"


class WritingScenarioRequirement(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    description: str = Field(min_length=1, max_length=500)


class ScenarioGenerateRequest(BaseModel):
    """All fields optional: an empty body produces an AI-selected scenario."""

    genre: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    medium: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    audience: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    purpose: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    register: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    jlpt_level: str | None = Field(default=None, pattern=r"^N[1-5]$")
    difficulty: int | None = Field(default=None, ge=1, le=10)
    provider: str | None = None
    model: str | None = None


class WritingScenarioPlan(BaseModel):
    """Stage 1 output: dimension selection, validated against the taxonomy."""

    genre: str = Field(pattern=_VALUE_PATTERN)
    medium: str = Field(pattern=_VALUE_PATTERN)
    audience: str = Field(pattern=_VALUE_PATTERN)
    relationship: str = Field(pattern=_VALUE_PATTERN)
    purpose: str = Field(pattern=_VALUE_PATTERN)
    register: str = Field(pattern=_VALUE_PATTERN)
    tone: str = Field(pattern=_VALUE_PATTERN)
    jlpt_level: str = Field(pattern=r"^N[1-5]$")
    target_length: str = Field(pattern=_VALUE_PATTERN)
    difficulty: int = Field(ge=1, le=10)
    topic: str = Field(min_length=1, max_length=100)


class WritingScenarioDraft(BaseModel):
    """Stage 2 output: the learner-facing scenario content."""

    situation_vi: str = Field(min_length=10, max_length=2000)
    context_vi: str = Field(min_length=10, max_length=2000)
    required_points: list[WritingScenarioRequirement] = Field(min_length=1, max_length=6)
    optional_points: list[str] = Field(default_factory=list, max_length=6)
    forbidden_patterns: list[str] = Field(default_factory=list, max_length=6)
    difficulty_metadata: dict[str, int] = Field(default_factory=dict, max_length=10)
    grammar_complexity: int = Field(ge=1, le=10)
    vocabulary_complexity: int = Field(ge=1, le=10)
    context_complexity: int = Field(ge=1, le=10)
    naturalness_target: int = Field(ge=1, le=10)


class WritingScenarioValidationResult(BaseModel):
    """Stage 3 output: quality gate before persistence."""

    valid: bool
    issues: list[str] = Field(default_factory=list, max_length=10)
    suggestion: str | None = Field(default=None, max_length=2000)


class ScenarioRequiredPointResult(BaseModel):
    """Whether one required point was covered by the draft."""

    id: str = Field(min_length=1, max_length=64)
    description: str = Field(min_length=1, max_length=500)
    status: str = Field(pattern=r"^(satisfied|partially_satisfied|missing)$")
    explanation: str = Field(min_length=1, max_length=500)


class ScenarioFormatSectionResult(BaseModel):
    """Whether one genre format section is present in the draft."""

    name: str = Field(min_length=1, max_length=64)
    status: str = Field(pattern=r"^(present|partial|missing)$")
    note: str | None = Field(default=None, max_length=500)


class ScenarioEvaluationResult(BaseModel):
    """Scenario-aware evaluation stage output (one structured call)."""

    scenario_semantic_fit: int = Field(ge=0, le=100)
    audience_fit: int = Field(ge=0, le=100)
    purpose_fit: int = Field(ge=0, le=100)
    tone_fit: int = Field(ge=0, le=100)
    constraint_compliance: int = Field(ge=0, le=100)
    required_points: list[ScenarioRequiredPointResult] = Field(
        min_length=1, max_length=6, default_factory=list
    )
    format_sections: list[ScenarioFormatSectionResult] = Field(default_factory=list, max_length=10)
    strengths: list[str] = Field(default_factory=list, max_length=4)
    summary: str = Field(min_length=1, max_length=1000)


class WritingScenarioResponse(BaseModel):
    id: str
    genre: str
    medium: str
    audience: str
    relationship: str
    purpose: str
    register: str
    tone: str
    target_length: str
    jlpt_level: str
    situation_vi: str
    context_vi: str
    required_points: list[WritingScenarioRequirement] = Field(default_factory=list)
    optional_points: list[str] = Field(default_factory=list)
    forbidden_patterns: list[str] = Field(default_factory=list)
    difficulty: int
    difficulty_metadata: dict[str, Any] = Field(default_factory=dict)
    generation_metadata: dict[str, Any] | None = None
    created_at: datetime


class ScenarioHistoryItem(BaseModel):
    scenario_id: str
    genre: str
    medium: str
    audience: str
    purpose: str
    register: str
    attempt_count: int
    last_attempt_at: datetime


class ScenarioHistoryResponse(BaseModel):
    items: list[ScenarioHistoryItem] = Field(default_factory=list)
    total: int = 0
