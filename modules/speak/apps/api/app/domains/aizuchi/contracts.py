"""Aizuchi domain contracts — DTOs for 2 sub-modes, assessments, and adaptive windows."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AizuchiSubMode(str, Enum):
    REACTION = "aizuchi_reaction"
    INTERRUPT = "warikomi_interrupt"


class AizuchiRelation(str, Enum):
    CASUAL = "casual_friend"
    BUSINESS = "business_polite"


class NPCTurnDTO(BaseModel):
    text: str
    pause_window_ms: int = 600
    expected_types: list[str] = Field(default_factory=lambda: ["continuer"])


class AizuchiExerciseGenerateRequest(BaseModel):
    sub_mode: AizuchiSubMode = AizuchiSubMode.REACTION
    relation: str = "casual_friend"  # casual_friend | business_polite
    speed: float = 1.0  # 0.9 | 1.0 | 1.25
    window_profile: str = "normal"  # infinite | relaxed | normal | fast | reflex
    window_ms: int | None = None  # overrides profile if set
    difficulty: str | None = None  # easy | normal | hard | challenge
    learning_item_key: str | None = None


class AizuchiExerciseDTO(BaseModel):
    id: str
    sub_mode: str
    title: str
    relation: str
    npc_turns: list[NPCTurnDTO] = Field(default_factory=list)
    instructions: str
    window_ms: int
    window_profile: str
    speed: float
    difficulty: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class AizuchiAttemptRequest(BaseModel):
    exercise_id: str
    user_transcript: str = ""
    # Timing from frontend (performance.now deltas, window_open -> first voiced frame)
    reaction_latency_ms: float | None = None
    window_ms: int | None = None
    timed_out: bool = False
    late_response: bool = False
    overlap_rude: bool = False
    bc_type: str | None = None
    speech_confidence: float | None = None
    relation: str | None = None
    independence: str = "independent"


class DimensionDTO(BaseModel):
    score: float
    confidence: float
    evidence: list[str] = Field(default_factory=list)


class AizuchiAssessmentDTO(BaseModel):
    timing: DimensionDTO
    variety: DimensionDTO
    appropriateness: DimensionDTO
    manner: DimensionDTO
    overall: DimensionDTO
    timed_out: bool = False
    overlap_rude: bool = False
    reaction_latency_ms: float | None = None
    window_ms: int | None = None


class AizuchiAttemptResultDTO(BaseModel):
    attempt_id: str
    exercise_id: str
    success: bool
    is_perfect: bool = False
    timed_out: bool = False
    overlap_rude: bool = False
    transcript: str
    normalized_transcript: str | None = None
    bc_type: str | None = None
    assessment: AizuchiAssessmentDTO
    feedback: str
    mastery_deltas: dict[str, float] = Field(default_factory=dict)
    xp_awarded: int | None = None


class AizuchiProgressDTO(BaseModel):
    user_id: str
    period: str = "30d"
    total_attempts: int = 0
    success_rate: float = 0.0
    avg_latency_ms: float | None = None
    p50_latency_ms: float | None = None
    p90_latency_ms: float | None = None
    miss_rate: float = 0.0
    rude_rate: float = 0.0
    variety_avg: float | None = None
    recommended_window_ms: int | None = None
