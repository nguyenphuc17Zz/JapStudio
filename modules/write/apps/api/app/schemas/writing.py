"""API schemas for the long-form writing workspace (Phase 8).

Submissions own a chain of immutable revisions (Draft 1, Draft 2, ...);
each revision carries one DiscourseEvaluation (persisted, never recomputed
on read). Composite scores are deterministic: sentence quality from the
per-sentence Phase 4 evaluations, discourse quality from the weighted
dimensions, overall writing from the configured blend.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.discourse_ai import Rewrites


class WritingSubmissionCreate(BaseModel):
    exercise_id: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=5000)
    mode: str = Field(default="long_form", pattern=r"^(long_form|scenario)$")
    provider: str | None = None
    model: str | None = None


class WritingRevisionCreate(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    provider: str | None = None
    model: str | None = None


class DiscourseIssueOut(BaseModel):
    category: str
    severity: str
    sentence_index: int | None = None
    sentence_range: list[int] | None = None
    explanation: str
    suggested_fix: str


class SentenceScore(BaseModel):
    index: int
    text: str
    overall_score: int
    semantic_score: int
    grammar_score: int
    vocabulary_score: int
    naturalness_score: int
    context_fit_score: int
    register_fit_score: int
    issues: list[dict[str, Any]] = Field(default_factory=list, max_length=15)
    summary: str = Field(default="", max_length=2000)


class WritingScores(BaseModel):
    sentence_quality: int = Field(ge=0, le=100)
    discourse_quality: int = Field(ge=0, le=100)
    overall_writing: int = Field(ge=0, le=100)
    coherence_score: int = Field(ge=0, le=100)
    cohesion_score: int = Field(ge=0, le=100)
    organization_score: int = Field(ge=0, le=100)
    flow_score: int = Field(ge=0, le=100)
    style_consistency_score: int = Field(ge=0, le=100)
    redundancy_score: int = Field(ge=0, le=100)
    scenario_fit: int | None = Field(default=None, ge=0, le=100)
    scenario_semantic_fit: int | None = Field(default=None, ge=0, le=100)
    audience_fit: int | None = Field(default=None, ge=0, le=100)
    purpose_fit: int | None = Field(default=None, ge=0, le=100)
    tone_fit: int | None = Field(default=None, ge=0, le=100)
    constraint_compliance: int | None = Field(default=None, ge=0, le=100)


class Provenance(BaseModel):
    provider: str
    model: str
    evaluation_version: str
    stages: list[dict[str, Any]] = Field(default_factory=list, max_length=10)
    created_at: datetime


class WritingEvaluationResponse(BaseModel):
    submission_id: str
    revision_number: int
    revision_id: str
    attempt_id: str
    exercise_id: str
    exercise_type: str
    target_length: str
    register: str
    text: str
    sentence_count: int
    scores: WritingScores
    strengths: list[str] = Field(default_factory=list)
    summary: str
    issues: list[DiscourseIssueOut] = Field(default_factory=list)
    sentence_scores: list[SentenceScore] = Field(default_factory=list)
    improved_structure: str | None = None
    rewrites: Rewrites | None = None
    structure_suggestion: dict[str, Any] | None = None
    scenario_required_points: list[dict[str, Any]] | None = None
    scenario_format_sections: list[dict[str, Any]] | None = None
    scenario_unavailable: bool | None = None
    learning_mode: dict[str, Any] | None = None
    discourse_available: bool = True
    status: str
    created_at: datetime
    provenance: Provenance | None = None


class WritingRevisionListItem(BaseModel):
    id: str
    revision_number: int
    sentence_count: int
    overall_writing: int | None
    status: str
    created_at: datetime


class WritingSubmissionResponse(BaseModel):
    id: str
    exercise_id: str
    exercise_type: str
    target_length: str
    register: str
    topic: str
    prompt_vi: str
    mode: str
    status: str
    revision_count: int
    revisions: list[WritingRevisionListItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class WritingRevisionResponse(BaseModel):
    submission_id: str
    revision_number: int
    text: str
    scores: WritingScores
    deltas: dict[str, int] = Field(default_factory=dict)
    created_at: datetime


class SentenceDiff(BaseModel):
    added: list[str] = Field(default_factory=list)
    removed: list[str] = Field(default_factory=list)
    changed: list[str] = Field(default_factory=list)


class RevisionCompareResponse(BaseModel):
    submission_id: str
    from_revision: int
    to_revision: int
    deltas: dict[str, int] = Field(default_factory=dict)
    sentence_diff: SentenceDiff
    guidance: str | None = None
    guidance_version: str | None = None


class WritingCoachRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    provider: str | None = None
    model: str | None = None


class WritingCoachResponse(BaseModel):
    answer: str
    suggestions: list[str] = Field(default_factory=list)


class WritingHintResponse(BaseModel):
    hint: str
    hints_revealed_count: int
    hints_total: int
    reveal_available: bool


class WritingRevealResponse(BaseModel):
    submission_id: str
    revision_number: int
    rewrites: Rewrites
    corrections: dict[str, Any] | None = None
    revealed: bool
