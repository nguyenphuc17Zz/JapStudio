"""Contracts, Enums, and Pydantic schemas for Survival Speaking & Speech Recovery.

Inspired by EnglishSpeaking Function 7 (Survival Speaking & Circumlocution),
engineered specifically for Japanese speech recovery, repair strategies,
and taboo-based circumlocution.
"""

from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class SurvivalMode(str, Enum):
    CIRCUMLOCUTION = "circumlocution"
    SCENARIOS = "scenarios"


class RepairStrategy(str, Enum):
    BUYING_TIME = "buying_time"
    ASKING_REPETITION = "asking_repetition"
    ASKING_CLARIFICATION = "asking_clarification"
    SELF_CORRECTION = "self_correction"
    SIMPLIFICATION = "simplification"


class SurvivalDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class SocialRelationship(str, Enum):
    CASUAL = "casual"
    POLITE = "polite"
    BUSINESS = "business"


class SurvivalHintTier(BaseModel):
    tier: int = Field(..., ge=0, le=4, description="0=No hint, 1=Function, 2=Category/Context, 3=Starter, 4=Model answer")
    title: str
    content: str
    penalty_weight: float = Field(default=0.0, ge=0.0, le=1.0)


class SurvivalVocabularyItem(BaseModel):
    term: str
    reading: str | None = None
    romaji: str | None = None
    meaning_vi: str
    part_of_speech: str = "phrase"


class CircumlocutionTask(BaseModel):
    id: str
    target_word: str
    reading_hiragana: str
    romaji: str
    vietnamese_meaning: str
    category: str
    genus: str
    differentia: str
    forbidden_words: list[str] = Field(default_factory=list)
    taboo_lemmas: list[str] = Field(default_factory=list)
    difficulty: SurvivalDifficulty = SurvivalDifficulty.EASY
    topic: str = "daily"
    time_limit_seconds: int = 5
    tier_hints: list[SurvivalHintTier] = Field(default_factory=list)
    sample_explanations: list[str] = Field(default_factory=list)
    suggested_vocabulary: list[SurvivalVocabularyItem] = Field(default_factory=list)
    semantic_anchors: list[str] = Field(default_factory=list)
    source: str = Field(default="ai", description="'ai' | 'bank' | 'dynamic_procedural'")


class SurvivalScenarioTask(BaseModel):
    id: str
    context: str
    context_title_vi: str
    relationship: SocialRelationship = SocialRelationship.POLITE
    topic: str = "daily"
    problem_description_vi: str
    npc_utterance_ja: str
    npc_utterance_reading: str | None = None
    recommended_strategy: RepairStrategy
    suggested_repair_phrases: list[str] = Field(default_factory=list)
    difficulty: SurvivalDifficulty = SurvivalDifficulty.EASY
    time_limit_seconds: int = 5
    tier_hints: list[SurvivalHintTier] = Field(default_factory=list)
    suggested_vocabulary: list[SurvivalVocabularyItem] = Field(default_factory=list)
    source: str = Field(default="ai", description="'ai' | 'bank' | 'dynamic_procedural'")


class SayItBetterVariants(BaseModel):
    casual: str = Field(..., description="Cách nói thân mật đời thường (Tameguchi/Bạn bè)")
    professional: str = Field(..., description="Cách nói lịch sự công sở (Keigo/Cấp trên/Khách hàng)")
    idiomatic: str = Field(..., description="Cách nói khẩu ngữ tự nhiên chuẩn bản xứ")


class SurvivalEvaluationRequest(BaseModel):
    mode: SurvivalMode
    task_id: str
    spoken_text: str
    audio_duration_ms: float | None = None
    ttfw_ms: float | None = None
    hint_tier_used: int = 0
    relationship: SocialRelationship | None = None


class SurvivalEvaluationResult(BaseModel):
    is_successful: bool
    overall_score: int = Field(..., ge=0, le=100)
    taboo_violated: bool = False
    violated_words: list[str] = Field(default_factory=list)
    listener_guessed_correctly: bool = False
    listener_guessed_word: str | None = None
    listener_confidence: float = 0.0
    strategy_identified: RepairStrategy | None = None
    speed_rating: str = "normal"  # "instant" | "normal" | "slow"
    ttfw_ms: float | None = None
    ai_feedback_vi: str
    say_it_better: SayItBetterVariants | None = None
    suggested_corrections: list[str] = Field(default_factory=list)
    is_fast_pass: bool = False
    evaluation_source: str = "fast_pass"  # "fast_pass" | "ai_router"
    xp_earned: int = 25


class SOSHintRequest(BaseModel):
    last_ai_message: str
    user_draft_text: str | None = None
    relationship: SocialRelationship = SocialRelationship.POLITE
    detected_topic: str | None = None


class SOSSuggestionItem(BaseModel):
    strategy: RepairStrategy
    title: str
    japanese_phrase: str
    reading_hiragana: str
    meaning_vi: str


class SOSHintResponse(BaseModel):
    suggestions: list[SOSSuggestionItem]
