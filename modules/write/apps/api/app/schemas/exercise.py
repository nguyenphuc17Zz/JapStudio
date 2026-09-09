from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.exercise import ExerciseStatus, ExerciseType, JlptLevel, Register, TargetLength


class ExerciseGenerationRequest(BaseModel):
    """Optional generation preferences. An empty body is valid: the AI
    planner decides every value."""

    exercise_type: ExerciseType | None = None
    topic: str | None = Field(default=None, min_length=1, max_length=100)
    register: Register | None = Field(default=None)
    jlpt_level: JlptLevel | None = None
    difficulty: int | None = Field(default=None, ge=1, le=10)
    target_length: TargetLength | None = None
    provider: str | None = None
    model: str | None = None


class VocabularyHintSchema(BaseModel):
    expression: str
    reading: str | None = None
    meaning_vi: str
    level: str | None = None


class ExerciseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    exercise_type: ExerciseType
    topic: str
    subtopic: str | None
    context: str
    prompt_vi: str
    target_length: TargetLength
    register: Register = Field()
    jlpt_level: JlptLevel
    difficulty: int
    grammar_complexity: int
    vocabulary_complexity: int
    context_complexity: int
    naturalness_target: int
    status: ExerciseStatus
    generation_metadata: dict[str, Any] | None
    key_vocabulary: list[VocabularyHintSchema] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @classmethod
    def model_validate(cls, obj: Any, *args: Any, **kwargs: Any) -> "ExerciseSchema":
        if hasattr(obj, "generation_metadata") and isinstance(obj.generation_metadata, dict):
            vocab = obj.generation_metadata.get("key_vocabulary", [])
            instance = super().model_validate(obj, *args, **kwargs)
            if not instance.key_vocabulary and vocab:
                instance.key_vocabulary = [
                    VocabularyHintSchema(**v) if isinstance(v, dict) else v for v in vocab
                ]
            return instance
        return super().model_validate(obj, *args, **kwargs)


class ExerciseListResponse(BaseModel):
    items: list[ExerciseSchema]
    total: int
    skip: int
    limit: int
