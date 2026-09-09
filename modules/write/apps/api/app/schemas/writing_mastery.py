"""Strict Pydantic schemas for Writing Mastery & Boss Assessment (Phase 23)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class SubSkillItem(BaseModel):
    name: str
    category: str
    status: str  # mastered | improving | recurring | regressed | new
    score: float = 0.0
    evidence_count: int = 0


class MasteryCriteriaProof(BaseModel):
    repeated_correct_usage: bool = False
    repeated_correct_count: int = 0
    delayed_retention: bool = False
    retention_days: float = 0.0
    new_context_transfer: bool = False
    distinct_contexts_count: int = 0
    free_writing_evidence: bool = False
    free_writing_pass_rate: float = 0.0
    real_world_evidence: bool = False
    real_world_pass_count: int = 0
    is_fully_mastered: bool = False
    missing_criteria: list[str] = Field(default_factory=list)


class WritingMasteryDimensionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str  # grammar | vocabulary_precision | collocation | naturalness | register | discourse | task_completion | contextual_adaptability
    label: str
    label_vi: str
    description_vi: str
    score: float  # 0.0 to 1.0
    status: str  # untested | emerging | developing | competent | mastered | regressed
    confidence: str  # low | medium | high
    evidence_count: int = 0
    recent_trend: str = "stable"  # improving | stable | declining
    sub_skills: list[SubSkillItem] = Field(default_factory=list)
    criteria_proof: MasteryCriteriaProof | None = None


class WritingMasteryProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dimensions: list[WritingMasteryDimensionOut]
    overall_mastery_index: float
    mastered_count: int
    unstable_count: int
    persistent_count: int
    current_strengths: list[str]
    current_priorities: list[str]
    next_boss_task_recommendation: dict[str, Any] | None = None


class BossTaskGenerateRequest(BaseModel):
    task_type: str | None = None  # business_email | absence_message | complaint | explanation | progress_update | opinion_paragraph
    jlpt_level: str | None = None
    target_register: str | None = None
    provider: str | None = None
    model: str | None = None


class BossTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_type: str
    title: str
    situation_vi: str
    context_vi: str
    audience: str
    relationship: str
    target_register: str
    required_constraints: list[str]
    forbidden_patterns: list[str] = Field(default_factory=list)
    target_word_count_min: int = 100
    target_word_count_max: int = 300
    time_limit_minutes: int = 15
    target_weakness_ids: list[str] = Field(default_factory=list)
    adversarial_traps: list[str] = Field(default_factory=list)
    jlpt_level: str = "N3"
    difficulty: int = 7
    status: str = "pending"
    created_at: datetime


class BossTaskSubmitRequest(BaseModel):
    text: str = Field(min_length=1)
    duration_seconds: int = 0
    provider: str | None = None
    model: str | None = None


class BossTieredRewrites(BaseModel):
    minimal_fix: str
    natural_polish: str
    business_mastery: str
    polish_notes_vi: str | None = None


class RegressionDiagnosisItem(BaseModel):
    weakness_subtype: str
    category: str
    diagnosis_vi: str
    trigger_context: str


class BossEvaluationResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    overall_score: float
    verdict: str  # PASS_WITH_DISTINCTION | PASS | NEEDS_RETRY | FAILED
    scores: dict[str, float]  # 8 dimension scores
    feedback_vi: str
    strengths: list[str]
    critical_gaps: list[str]
    rewrites: BossTieredRewrites
    historical_comparison: dict[str, Any]
    weakness_impacts: list[dict[str, Any]] = Field(default_factory=list)
    regression_diagnoses: list[RegressionDiagnosisItem] = Field(default_factory=list)
    evaluated_at: datetime


class BossHistoryItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    task_title: str
    task_type: str
    target_register: str
    overall_score: float
    verdict: str
    character_count: int
    duration_seconds: int
    evaluated_at: datetime


class WeaknessEvolutionItem(BaseModel):
    id: str
    category: str
    subtype: str
    description: str
    lifecycle_state: str
    status: str
    mastery_score: float
    days_since_last_error: float
    corrected_count: int
    recurrence_count: int
    first_seen_at: datetime
    last_seen_at: datetime


class EvolutionTrendPoint(BaseModel):
    date: str
    score: float
    session_type: str | None = None
    notes: str | None = None


class WritingEvolutionTimelineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weaknesses_eliminated: list[WeaknessEvolutionItem]
    weaknesses_reduced: list[WeaknessEvolutionItem]
    persistent_weaknesses: list[WeaknessEvolutionItem]
    newly_emerging_weaknesses: list[WeaknessEvolutionItem]
    register_progress: list[EvolutionTrendPoint]
    naturalness_progress: list[EvolutionTrendPoint]
    free_writing_progress: list[EvolutionTrendPoint]
    milestone_events: list[dict[str, Any]]
    ai_narrative_story: str | None = None
