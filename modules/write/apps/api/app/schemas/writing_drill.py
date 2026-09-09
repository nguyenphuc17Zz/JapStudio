"""Pydantic schemas for Writing Drill API (Phase 18)."""

from __future__ import annotations

import enum
from datetime import datetime

from pydantic import BaseModel, Field


class WritingDrillType(str, enum.Enum):
    RECOGNITION = "recognition"
    CORRECTION = "correction"
    REWRITE = "rewrite"
    VIETNAMESE_TO_JAPANESE = "vietnamese_to_japanese"
    JAPANESE_TO_NATURAL_REWRITE = "japanese_to_natural_rewrite"
    PATTERN_SUBSTITUTION = "pattern_substitution"
    FREE_RESPONSE = "free_response"
    REAL_WORLD_MINI_TASK = "real_world_mini_task"


class DrillGuidanceLevel(str, enum.Enum):
    HEAVY_GUIDANCE = "heavy_guidance"
    LIGHT_GUIDANCE = "light_guidance"
    MINIMAL_GUIDANCE = "minimal_guidance"
    NO_GUIDANCE = "no_guidance"


class DrillOption(BaseModel):
    id: str
    text: str
    is_correct: bool = False
    explanation: str = ""


class DrillItemOut(BaseModel):
    id: str
    drill_type: WritingDrillType
    stage: int = Field(ge=1, le=4)
    guidance_level: DrillGuidanceLevel
    title_vi: str
    instructions_vi: str
    context_description: str
    source_text: str
    scaffold: str | None = None
    hints: list[str] = Field(default_factory=list)
    options: list[DrillOption] | None = None
    target_focus: str
    explanation: str = ""
    target_answer: str | None = None
    accepted_alternatives: list[str] = Field(default_factory=list)


class DrillAttemptRecord(BaseModel):
    item_id: str
    item_index: int
    user_answer: str
    is_correct: bool
    score: int = Field(ge=0, le=100)
    feedback_vi: str
    nuance_contrast: str | None = None
    corrected_text: str | None = None
    hints_revealed_count: int = 0
    revealed: bool = False
    evaluated_at: str


class DrillOutcomeOut(BaseModel):
    total_items: int
    passed_items: int
    average_score: float
    completion_rate: float
    mastery_delta: float
    debrief_vi: str | None = None
    next_step_vi: str | None = None


class DrillSessionOut(BaseModel):
    id: str
    user_id: str | None = None
    weakness_id: str | None = None
    weakness_category: str
    weakness_subtype: str
    title: str
    target_focus: str
    jlpt_level: str
    difficulty: int
    status: str
    current_item_index: int
    total_items: int
    items: list[DrillItemOut] | None = None
    attempts: list[DrillAttemptRecord] | None = None
    outcome: DrillOutcomeOut | None = None
    mastery_delta: float = 0.0
    created_at: datetime
    completed_at: datetime | None = None


class DrillGenerateRequest(BaseModel):
    weakness_id: str | None = None
    category: str | None = None
    subtype: str | None = None
    jlpt_level: str | None = "N3"
    difficulty: int | None = Field(default=5, ge=1, le=10)
    context_domain: str | None = None
    provider: str | None = None
    model: str | None = None


class DrillAttemptRequest(BaseModel):
    item_id: str | None = None
    item_index: int | None = None
    answer_text: str = Field(min_length=1)
    provider: str | None = None
    model: str | None = None


class DrillAttemptResultOut(BaseModel):
    is_correct: bool
    score: int
    feedback_vi: str
    nuance_contrast: str | None = None
    corrected_text: str | None = None
    item_index: int
    next_item_index: int
    session_status: str
    outcome: DrillOutcomeOut | None = None
    mastery_delta: float = 0.0


class DrillHintOut(BaseModel):
    hint: str | None = None
    hints_revealed_count: int
    hints_total: int


class DrillRevealOut(BaseModel):
    target_answer: str
    explanation: str
    accepted_alternatives: list[str] = Field(default_factory=list)


class DueDrillWeaknessOut(BaseModel):
    weakness_id: str
    category: str
    subtype: str
    description: str
    mastery_score: float
    lifecycle_state: str
    severity: str
    recommended_drill_types: list[str]
    priority_reason: str
    retest_due: bool = False


class DueDrillListResponse(BaseModel):
    items: list[DueDrillWeaknessOut]
    total: int


class DrillSessionListResponse(BaseModel):
    items: list[DrillSessionOut]
    total: int
    skip: int
    limit: int
