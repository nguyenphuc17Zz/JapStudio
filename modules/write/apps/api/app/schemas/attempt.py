"""API schemas for exercise attempts and their evaluations."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.evaluation_ai import (
    Corrections,
    EvaluationIssue,
    EvaluationScores,
    NaturalnessClassification,
    SemanticClassification,
)


class AttemptSubmitRequest(BaseModel):
    answer_text: str = Field(min_length=1, max_length=5000)
    provider: str | None = None
    model: str | None = None


class LearningModeState(BaseModel):
    enabled: bool
    hints_revealed_count: int = Field(ge=0)
    hints_total: int = Field(ge=0)
    reveal_available: bool


class AttemptEvaluationResponse(BaseModel):
    id: str
    exercise_id: str
    attempt_number: int
    answer_text: str
    scores: EvaluationScores
    semantic_classification: SemanticClassification
    naturalness_classification: NaturalnessClassification
    issues: list[EvaluationIssue]
    summary: str
    hints: list[str]
    learning_mode: LearningModeState
    corrections: Corrections | None = None
    evaluation_metadata: dict[str, Any] | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class HintResponse(BaseModel):
    hint: str
    hints_revealed_count: int
    hints_total: int
    reveal_available: bool


class RevealResponse(BaseModel):
    attempt_id: str
    attempt_number: int
    corrections: Corrections
    revealed: bool


class AttemptListItem(BaseModel):
    id: str
    attempt_number: int
    answer_text: str
    overall_score: int | None
    status: str
    created_at: datetime


class AttemptListResponse(BaseModel):
    items: list[AttemptListItem]
    total: int
    skip: int
    limit: int
