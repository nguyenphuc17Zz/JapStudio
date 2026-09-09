"""Structured AI-pipeline contracts for exercise generation.

These Pydantic models are the validated output of every AI stage in the
generation pipeline (planner -> generator -> validator). They are also used
as the response_model for the Phase 2 gateway's generate_structured calls,
so the gateway guarantees they validate before the service ever sees them.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.exercise import ExerciseType, JlptLevel, Register, TargetLength


class ExercisePlan(BaseModel):
    """Stage 1 output: what to generate."""

    exercise_type: ExerciseType
    topic: str = Field(min_length=1, max_length=100)
    subtopic: str | None = Field(default=None, max_length=100)
    register: Register = Field()
    jlpt_level: JlptLevel
    difficulty: int = Field(ge=1, le=10)
    target_length: TargetLength


class VocabularyHintItem(BaseModel):
    """Vocabulary hint/keyword for an exercise prompt."""

    expression: str = Field(description="Japanese word or phrase in Kanji/Kana")
    reading: str | None = Field(default=None, description="Hiragana / Furigana reading")
    meaning_vi: str = Field(description="Vietnamese meaning")
    level: str | None = Field(default=None, description="Suggested JLPT level")


class ExerciseDraft(BaseModel):
    """Stage 2 output: the actual content plus difficulty sub-metrics."""

    context: str = Field(min_length=1, max_length=500)
    prompt_vi: str = Field(min_length=1, max_length=2000)
    grammar_complexity: int = Field(ge=1, le=10)
    vocabulary_complexity: int = Field(ge=1, le=10)
    context_complexity: int = Field(ge=1, le=10)
    naturalness_target: int = Field(ge=1, le=10)
    key_vocabulary: list[VocabularyHintItem] = Field(
        default_factory=list,
        description="Key vocabulary keywords that learners at this level might need help with",
    )


class ExerciseValidationResult(BaseModel):
    """Stage 3 output: quality gate result."""

    valid: bool
    issues: list[str] = Field(default_factory=list, max_length=10)
    suggestion: str | None = Field(default=None, max_length=2000)


class GenerationMetadata(BaseModel):
    """Provenance data stored on every generated exercise.

    Never contains credentials or raw provider responses.
    """

    provider: str
    model: str
    generation_version: str
    prompt_version: str
    generation_timestamp: datetime
    regeneration_attempts: int = 0
