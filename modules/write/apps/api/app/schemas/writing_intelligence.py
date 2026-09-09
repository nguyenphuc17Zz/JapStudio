"""Strict Pydantic schemas for Writing Intelligence Foundation (Phase 16)."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class WritingWeaknessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    category: str
    subtype: str
    description: str
    examples: list[str] | None = None
    frequency: int = 1
    first_seen_at: datetime
    last_seen_at: datetime
    severity: str = "minor"
    recurrence_count: int = 1
    corrected_count: int = 0
    exposure_count: int = 1
    mastery_score: float = 0.0
    confidence: str = "low"
    status: str = "new"  # new | recurring | persistent | improving | mastered | regressed
    lifecycle_state: str = "new"  # new | observed | recurring | targeted | improving | stable | mastered | recurrent
    correct_count_by_context: dict[str, int] | None = None
    incorrect_count_by_context: dict[str, int] | None = None
    context_generalization_score: float = 0.0
    register_diversity_score: float = 0.0
    last_correct_at: datetime | None = None
    last_incorrect_at: datetime | None = None
    days_since_last_error: float = 0.0
    retest_due_at: datetime | None = None
    retest_interval_days: int = 0
    retest_passed_count: int = 0
    mastery_evidence: dict[str, Any] | None = None
    mastery_history: list[dict[str, Any]] | None = None
    mastery_narrative: dict[str, Any] | None = None
    narrative_generated_at: datetime | None = None
    affected_registers: list[str] | None = None
    affected_contexts: list[str] | None = None
    affected_jlpt_levels: list[str] | None = None
    related_expressions: list[str] | None = None
    related_grammar_patterns: list[str] | None = None
    evidence_refs: list[dict[str, Any]] | None = None
    created_at: datetime
    updated_at: datetime


class MasteryEvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    exposures: int = 0
    correct_uses: int = 0
    incorrect_uses: int = 0
    recurrences: int = 0
    days_since_last_error: float = 0.0
    context_scores: dict[str, float] | None = None
    context_diversity: float = 0.0
    register_diversity: float = 0.0
    free_writing_pass_rate: float = 0.0
    contexts_passed: list[str] | None = None
    contexts_failed: list[str] | None = None
    mastery_score: float = 0.0


class MasteryNarrativeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    why_it_matters: str
    current_mastery: str
    evidence_text: str
    next_step: str


class MasteryStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weakness_id: str
    category: str
    subtype: str
    lifecycle_state: str
    status: str
    mastery_score: float
    confidence: str
    retest_due_at: datetime | None = None
    retest_interval_days: int = 0
    retest_passed_count: int = 0
    evidence: MasteryEvidenceOut | None = None
    narrative: MasteryNarrativeOut | None = None


class MasteryHistoryEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    from_state: str | None = None
    to_state: str
    timestamp: datetime | str
    trigger: str
    details: dict[str, Any] = Field(default_factory=dict)


class WeaknessDetailOut(WritingWeaknessOut):
    model_config = ConfigDict(from_attributes=True)

    evidence_summary: MasteryEvidenceOut | None = None
    narrative: MasteryNarrativeOut | None = None
    is_retest_due: bool = False
    target_retest_context: str | None = None


class DueRetestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    weakness_id: str
    category: str
    subtype: str
    description: str
    lifecycle_state: str
    retest_due_at: datetime
    retest_interval_days: int
    target_context_type: str
    is_overdue: bool
    days_overdue: float
    narrative: MasteryNarrativeOut | None = None


class DueRetestListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[DueRetestOut] = Field(default_factory=list)
    total: int = 0


class EvidenceSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_weaknesses: int
    by_lifecycle_state: dict[str, int] = Field(default_factory=dict)
    contexts_tracked: list[str] = Field(default_factory=list)
    average_context_diversity: float = 0.0
    average_mastery_score: float = 0.0
    due_retests_count: int = 0
    mastered_count: int = 0
    recurrent_count: int = 0
    top_improving: list[WritingWeaknessOut] = Field(default_factory=list)
    top_at_risk: list[WritingWeaknessOut] = Field(default_factory=list)


class WeaknessListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[WritingWeaknessOut] = Field(default_factory=list)
    total: int = 0
    skip: int = 0
    limit: int = 50


class DimensionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: str
    total_weaknesses: int
    mastered_count: int
    recurring_count: int
    persistent_count: int
    average_mastery: float


class WritingFingerprintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    strongest_dimensions: list[str] = Field(default_factory=list)
    weakest_dimensions: list[str] = Field(default_factory=list)
    top_recurring: list[WritingWeaknessOut] = Field(default_factory=list)
    emerging: list[WritingWeaknessOut] = Field(default_factory=list)
    declining: list[WritingWeaknessOut] = Field(default_factory=list)
    persistent: list[WritingWeaknessOut] = Field(default_factory=list)
    register_weaknesses: list[WritingWeaknessOut] = Field(default_factory=list)
    naturalness_weaknesses: list[WritingWeaknessOut] = Field(default_factory=list)
    discourse_weaknesses: list[WritingWeaknessOut] = Field(default_factory=list)
    dimensions: list[DimensionSummary] = Field(default_factory=list)
    total_tracked_weaknesses: int = 0
    active_weakness_count: int = 0
    mastered_weakness_count: int = 0
    overall_mastery_rate: float = 0.0


class WritingIntelligenceProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fingerprint: WritingFingerprintOut
    top_recurring_weaknesses: list[WritingWeaknessOut] = Field(default_factory=list)
    persistent_weaknesses: list[WritingWeaknessOut] = Field(default_factory=list)
    recent_improvements: list[WritingWeaknessOut] = Field(default_factory=list)
    recommended_focus: list[str] = Field(default_factory=list)
    total_evaluations_analyzed: int = 0
    last_analyzed_at: datetime | None = None


class WritingIntelligenceSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    top_recurring: list[WritingWeaknessOut] = Field(default_factory=list)
    persistent: list[WritingWeaknessOut] = Field(default_factory=list)
    recent_improvements: list[WritingWeaknessOut] = Field(default_factory=list)
    recommended_focus: list[str] = Field(default_factory=list)
    overall_mastery_rate: float = 0.0
    active_weaknesses_count: int = 0
    strongest_dimensions: list[str] = Field(default_factory=list)
    weakest_dimensions: list[str] = Field(default_factory=list)

