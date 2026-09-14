"""Builder domain contracts — DTOs for 3 sub-modes and clause assessments."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class BuilderSubMode(str, Enum):
    ASSEMBLE = "sentence_assemble"
    EXPAND = "sentence_expand"
    REPAIR = "sentence_repair"


class BuilderSkill(str, Enum):
    TE_CHAIN = "te_chain"
    RELATIVE_CLAUSE = "relative_clause"
    CONDITIONAL = "conditional"
    NOMINALIZATION = "nominalization"
    CONTRACTION = "contraction"


class BuilderExerciseGenerateRequest(BaseModel):
    sub_mode: BuilderSubMode = BuilderSubMode.ASSEMBLE
    focus_skill: str = "te_chain"
    relation: str = "casual_friend"  # casual_friend | business_polite
    scaffold: str = "keyword_hint"  # none(blind) | keyword_hint | sentence_starter | structured_options
    timer_limit_ms: int | None = None
    difficulty: str | None = None
    learning_item_key: str | None = None


class BuilderExerciseDTO(BaseModel):
    id: str
    sub_mode: str
    title: str
    focus_skill: str
    relation: str
    scaffold: str
    keywords: list[str] = Field(default_factory=list)
    starter: str | None = None
    source_sentence: str | None = None  # repair mode: awkward sentence; expand: seed sentence
    situation_vi: str | None = None  # blind mode: Vietnamese situation
    expand_requirement: str | None = None  # expand mode: required clause type
    instructions: str
    timer_limit_ms: int
    difficulty: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class BuilderAttemptRequest(BaseModel):
    exercise_id: str
    user_transcript: str = ""
    reaction_latency_ms: float | None = None
    timer_limit_ms: int | None = None
    timed_out: bool = False
    late_response: bool = False
    speech_confidence: float | None = None
    independence: str = "independent"


class DimensionDTO(BaseModel):
    score: float
    confidence: float
    evidence: list[str] = Field(default_factory=list)


class ClauseSpanDTO(BaseModel):
    text: str
    kind: str  # keyword | connector | nominalizer | ending | other
    ok: bool = True


class BuilderAssessmentDTO(BaseModel):
    coverage: DimensionDTO
    connection: DimensionDTO
    naturalness: DimensionDTO
    fluency: DimensionDTO
    overall: DimensionDTO
    timed_out: bool = False
    reaction_latency_ms: float | None = None
    keywords_used: list[str] = Field(default_factory=list)
    clauses: list[ClauseSpanDTO] = Field(default_factory=list)


class BuilderProgressDTO(BaseModel):
    user_id: str
    period: str = "30d"
    total_attempts: int = 0
    success_rate: float = 0.0
    blind_success_rate: float = 0.0
    avg_coverage: float | None = None
    avg_connection: float | None = None
    by_skill: dict[str, Any] = Field(default_factory=dict)
    by_sub_mode: dict[str, Any] = Field(default_factory=dict)
