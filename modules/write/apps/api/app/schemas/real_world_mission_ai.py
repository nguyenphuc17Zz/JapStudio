"""Internal AI structured output schemas for Real-World Mission Generator & Evaluator (Phase 20)."""

from __future__ import annotations


from pydantic import BaseModel, Field

from app.schemas.real_world_mission import (
    Mission10Dimensions,
    MissionRequiredPoint,
    MissionRequiredPointCheck,
    VocabularyHelperItem,
)


class RealWorldMissionAIDraft(BaseModel):
    role: str = Field(min_length=1, max_length=200)
    recipient: str = Field(min_length=1, max_length=200)
    relationship: str = Field(min_length=1, max_length=200)
    objective: str = Field(min_length=1, max_length=500)
    situation_vi: str = Field(min_length=10, max_length=3000)
    context_vi: str = Field(min_length=10, max_length=3000)
    situation_ja: str | None = Field(default=None, max_length=3000)
    context_ja: str | None = Field(default=None, max_length=3000)
    incoming_message: str | None = Field(default=None, max_length=3000)
    constraints: list[str] = Field(default_factory=list, max_length=10)
    required_points: list[MissionRequiredPoint] = Field(min_length=1, max_length=6)
    target_register: str = Field(pattern=r"^(casual|polite|business|mixed)$")
    optional_vocabulary: list[VocabularyHelperItem] = Field(default_factory=list, max_length=10)
    success_conditions: list[str] = Field(default_factory=list, max_length=8)
    pedagogical_target_summary: str | None = Field(default=None, max_length=500)


class MissionEvaluationAIResult(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    passed: bool
    dimensions: Mission10Dimensions
    required_points: list[MissionRequiredPointCheck] = Field(default_factory=list)
    constraints_respected: bool
    constraints_feedback: list[str] = Field(default_factory=list)
    strengths_vi: list[str] = Field(default_factory=list, max_length=5)
    improvements_vi: list[str] = Field(default_factory=list, max_length=5)
    native_model_rewrite: str = Field(min_length=5, max_length=5000)
    rewrite_nuances_vi: str = Field(min_length=5, max_length=3000)
    cultural_discourse_tip_vi: str | None = Field(default=None, max_length=2000)
