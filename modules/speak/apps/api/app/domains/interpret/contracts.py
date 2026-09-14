"""Interpret domain contracts — DTOs for 3 sub-modes and fidelity assessments."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class InterpretSubMode(str, Enum):
    WORD = "interpret_word"
    SENTENCE = "interpret_sentence"
    SITUATION = "interpret_situation"


class InterpretExerciseGenerateRequest(BaseModel):
    sub_mode: InterpretSubMode = InterpretSubMode.WORD
    relation: str = "casual_friend"  # casual_friend | business_polite
    scaffold: str = "keyword_hint"  # none(blind) | keyword_hint | sentence_starter
    timer_limit_ms: int | None = None
    difficulty: str | None = None
    topic: str | None = None  # tet_holiday | workplace | daily_life | family | travel
    learning_item_key: str | None = None


class InterpretExerciseDTO(BaseModel):
    id: str
    sub_mode: str
    title: str
    prompt_vi: str
    expected_ja_keywords: list[str] = Field(default_factory=list)
    reference_ja: str | None = None
    situation_vi: str | None = None
    starter_ja: str | None = None
    topic: str | None = None
    relation: str
    scaffold: str
    blind: bool = False
    instructions: str
    timer_limit_ms: int
    difficulty: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class InterpretAttemptRequest(BaseModel):
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


class FidelityItemDTO(BaseModel):
    idea_vi: str
    hit: bool = False
    evidence: str = ""


class InterpretAssessmentDTO(BaseModel):
    fidelity: DimensionDTO
    word_order: DimensionDTO
    naturalness: DimensionDTO
    fluency: DimensionDTO
    overall: DimensionDTO
    timed_out: bool = False
    reaction_latency_ms: float | None = None
    keywords_hit: list[str] = Field(default_factory=list)
    vietglish_flags: list[str] = Field(default_factory=list)
    fidelity_map: list[FidelityItemDTO] = Field(default_factory=list)


class InterpretProgressDTO(BaseModel):
    user_id: str
    period: str = "30d"
    total_attempts: int = 0
    success_rate: float = 0.0
    blind_success_rate: float = 0.0
    vietglish_rate: float = 0.0
    by_sub_mode: dict[str, Any] = Field(default_factory=dict)
