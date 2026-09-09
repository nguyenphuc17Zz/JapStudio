"""API schemas for the Vocabulary Bank (Phase 5)."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.vocabulary_ai import VocabularyConfidenceLevel, VocabularyItemType


class VocabularyListItem(BaseModel):
    id: str
    expression: str
    reading: str | None
    type: VocabularyItemType
    meaning_vi: str
    part_of_speech: str | None
    estimated_jlpt_level: str | None
    difficulty: int
    register: str | None
    usage_context: str | None
    example_sentence: str
    natural_alternatives: list[str]
    notes: str | None
    importance: int
    confidence: VocabularyConfidenceLevel
    familiarity: str
    discovered_count: int
    seen_count: int
    used_count: int
    incorrect_count: int
    correct_usage_count: int
    last_seen: datetime | None
    created_at: datetime


class VocabularyListResponse(BaseModel):
    items: list[VocabularyListItem]
    total: int
    skip: int
    limit: int


class VocabularyDiscoveryInfo(BaseModel):
    id: str
    attempt_id: str
    exercise_id: str
    attempt_number: int | None
    exercise_prompt_vi: str | None
    source_type: str
    user_expression: str | None
    learning_reason: str
    context_snippet: str | None
    example_sentence: str | None
    provider: str
    model: str
    prompt_version: str
    vocabulary_version: str
    created_at: datetime


class VocabularyDetail(VocabularyListItem):
    """Full learning view: entry + user state + discovery context + provenance."""

    source_attempt_id: str | None
    source_exercise_id: str | None
    user_expression: str | None
    learning_reason: str
    discovered_at: datetime | None
    updated_at: datetime
    provider: str
    model: str
    prompt_version: str
    vocabulary_version: str
    discoveries: list[VocabularyDiscoveryInfo] = Field(default_factory=list)


class AttemptVocabularyItem(BaseModel):
    """One entry discovered from a specific attempt."""

    id: str
    expression: str
    reading: str | None
    type: VocabularyItemType
    meaning_vi: str
    estimated_jlpt_level: str | None
    difficulty: int
    importance: int
    confidence: VocabularyConfidenceLevel
    source_type: str
    user_expression: str | None
    learning_reason: str
    example_sentence: str
    created_at: datetime


class AttemptVocabularyResponse(BaseModel):
    items: list[AttemptVocabularyItem]
    total: int


class VocabularyExtractResponse(BaseModel):
    """Result of one extraction run (idempotent; never creates duplicates)."""

    attempt_id: str
    created: int
    merged: int
    rejected: int
    skipped: int
    total: int


class VocabLookupRequest(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    context: str | None = Field(default=None, max_length=1000)
    direction: str = Field(default="auto")
    register_preference: str | None = Field(default=None, max_length=30)
    target_level: str | None = Field(default=None, pattern=r"^N[1-5]$")
    provider: str | None = None
    model: str | None = None


class VocabLookupResponse(BaseModel):
    query: str
    detected_direction: str
    context_used: str | None
    best_match: dict
    alternatives: list[dict] = Field(default_factory=list)
    provider: str | None = None
    model: str | None = None


class VocabSaveLookupRequest(BaseModel):
    expression: str = Field(min_length=1, max_length=100)
    reading: str | None = None
    meaning_vi: str = Field(min_length=1, max_length=500)
    part_of_speech: str | None = None
    estimated_jlpt_level: str | None = None
    difficulty: int = Field(default=5, ge=1, le=10)
    register: str | None = None
    nuance_explanation: str | None = None
    example_sentence: str | None = None
    notes: str | None = None


class VocabSaveLookupResponse(BaseModel):
    entry_id: str
    is_new: bool
    message: str

