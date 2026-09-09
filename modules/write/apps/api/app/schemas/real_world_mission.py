"""Pydantic schemas for Real-World Writing Missions (Phase 20).

Defines request/response contracts for:
- Mission generation & configuration across 4 categories and 3 prompt modes.
- 10-dimensional evaluation contracts & point-by-point checklist verification.
- Mission taxonomy queries and seamless simulation transitions.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

_VALUE_PATTERN = r"^[a-z_]+$"


class VocabularyHelperItem(BaseModel):
    word: str = Field(min_length=1, max_length=100)
    reading: str = Field(min_length=1, max_length=100)
    meaning: str = Field(min_length=1, max_length=255)
    example: str | None = Field(default=None, max_length=500)


class MissionRequiredPoint(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    description: str = Field(min_length=1, max_length=500)


class RealWorldMissionGenerateRequest(BaseModel):
    category: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    action_type: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    prompt_mode: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    target_weakness_id: str | None = None
    role: str | None = Field(default=None, max_length=200)
    recipient: str | None = Field(default=None, max_length=200)
    register: str | None = Field(default=None, pattern=_VALUE_PATTERN)
    jlpt_level: str | None = Field(default=None, pattern=r"^N[1-5]$")
    difficulty: int | None = Field(default=None, ge=1, le=10)
    provider: str | None = None
    model: str | None = None


class RealWorldMissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    action_type: str
    prompt_mode: str
    role: str
    recipient: str
    relationship: str
    objective: str
    situation_vi: str
    context_vi: str
    situation_ja: str | None = None
    context_ja: str | None = None
    incoming_message: str | None = None
    constraints: list[str] = Field(default_factory=list)
    required_points: list[MissionRequiredPoint] = Field(default_factory=list)
    target_register: str
    optional_vocabulary: list[VocabularyHelperItem] = Field(default_factory=list)
    success_conditions: list[str] = Field(default_factory=list)
    difficulty: int = Field(ge=1, le=10)
    jlpt_level: str
    pedagogical_target_summary: str | None = None
    created_at: datetime


class MissionEvaluationRequest(BaseModel):
    scenario_id: str | None = None
    text: str = Field(min_length=1, max_length=5000)
    mission_context: dict[str, Any] | None = None
    provider: str | None = None
    model: str | None = None


class MissionDimensionScore(BaseModel):
    score: int = Field(ge=0, le=100)
    status: str = Field(pattern=r"^(excellent|good|needs_work|poor)$")
    feedback_vi: str = Field(min_length=1, max_length=1000)


class Mission10Dimensions(BaseModel):
    task_completion: MissionDimensionScore
    factual_completeness: MissionDimensionScore
    naturalness: MissionDimensionScore
    grammar: MissionDimensionScore
    vocabulary: MissionDimensionScore
    register: MissionDimensionScore
    politeness: MissionDimensionScore
    tone: MissionDimensionScore
    clarity: MissionDimensionScore
    discourse: MissionDimensionScore


class MissionRequiredPointCheck(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    description: str = Field(min_length=1, max_length=500)
    status: str = Field(pattern=r"^(satisfied|partially_satisfied|missing)$")
    explanation_vi: str = Field(min_length=1, max_length=1000)


class MissionEvaluationResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    passed: bool
    dimensions: Mission10Dimensions
    required_points: list[MissionRequiredPointCheck] = Field(default_factory=list)
    constraints_respected: bool
    constraints_feedback: list[str] = Field(default_factory=list)
    strengths_vi: list[str] = Field(default_factory=list)
    improvements_vi: list[str] = Field(default_factory=list)
    native_model_rewrite: str = Field(min_length=1)
    rewrite_nuances_vi: str = Field(min_length=1)
    cultural_discourse_tip_vi: str | None = None
    weakness_mastery_updated: bool = False
    weakness_feedback_summary: str | None = None
    scenario_id: str | None = None


class TransitionToSimulationRequest(BaseModel):
    scenario_id: str = Field(min_length=1, max_length=64)
    initial_user_text: str | None = None
    provider: str | None = None
    model: str | None = None


class TransitionToSimulationResponse(BaseModel):
    session_id: str
    scenario_id: str
    status: str
    current_turn: int
    persona: dict[str, Any] | None = None
    turns: list[dict[str, Any]] = Field(default_factory=list)


class MissionTaxonomyCategory(BaseModel):
    id: str
    label_vi: str
    label_ja: str
    icon: str
    description: str
    action_count: int


class MissionTaxonomyAction(BaseModel):
    action_type: str
    category: str
    label_vi: str
    label_ja: str
    default_register: str
    recommended_jlpt: list[str]
    default_medium: str
    typical_role_vi: str
    typical_recipient_vi: str
    communicative_purpose_vi: str


class MissionTaxonomyPromptMode(BaseModel):
    mode: str
    mode_code: str
    label_vi: str
    description_vi: str
    recommended_level: str


class MissionTaxonomyDimension(BaseModel):
    key: str
    label_vi: str
    label_ja: str
    description_vi: str
    weight: float


class MissionTaxonomyResponse(BaseModel):
    categories: list[MissionTaxonomyCategory]
    actions: list[MissionTaxonomyAction]
    prompt_modes: list[MissionTaxonomyPromptMode]
    evaluation_dimensions: list[MissionTaxonomyDimension]
