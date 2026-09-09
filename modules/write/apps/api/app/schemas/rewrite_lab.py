"""REST API Schemas for Self-Correction & Rewrite Lab endpoints (Phase 19)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field

from app.schemas.rewrite_lab_ai import (
    DiffChunkResult,
    DiffExplanationResult,
    IssueDetectionResult,
    RewriteModeResult,
    RewriteVariantsResult,
    SelfCorrectionAttemptResult,
    SocraticCoachResult,
    TransferEvaluationResult,
    TransferTaskResult,
)


class SelfCorrectionSessionCreate(BaseModel):
    """Payload to initiate a self-correction / rewrite session."""

    text: str = Field(min_length=1, max_length=2000, description="Original Japanese text to analyze/correct")
    context_vi: str | None = Field(default=None, description="Optional Vietnamese translation or exercise context")
    source_type: str = Field(default="standalone", description="Source: 'standalone', 'exercise', 'submission'")
    source_id: str | None = Field(default=None, description="Optional ID of associated exercise or submission")
    provider: str | None = Field(default=None, description="AI provider override")
    model: str | None = Field(default=None, description="AI model override")


class SelfCorrectionAttemptRequest(BaseModel):
    """Payload for submitting a self-correction attempt at Step 3, 4, or 5."""

    attempt_text: str = Field(min_length=1, max_length=2000, description="The learner's self-corrected Japanese text")
    provider: str | None = None
    model: str | None = None


class TransferAttemptRequest(BaseModel):
    """Payload for submitting a transfer exercise sentence."""

    transfer_text: str = Field(min_length=1, max_length=2000, description="The learner's transfer sentence")
    provider: str | None = None
    model: str | None = None


class RewriteTransformRequest(BaseModel):
    """Payload to transform text according to a specific rewrite mode."""

    text: str = Field(min_length=1, max_length=2000, description="Japanese text to rewrite")
    mode: Literal[
        "minimal",
        "natural",
        "register",
        "concision",
        "expansion",
        "native"
    ] = Field(description="Rewrite mode")
    target_register: Literal["casual", "polite", "business"] | None = Field(
        default=None,
        description="Target register for register conversion mode"
    )
    provider: str | None = None
    model: str | None = None


class DiffExplainRequest(BaseModel):
    """Payload to explain differences between two Japanese sentences."""

    before: str = Field(min_length=1, max_length=2000, description="Original sentence")
    after: str = Field(min_length=1, max_length=2000, description="Modified sentence")
    provider: str | None = None
    model: str | None = None


class SocraticCoachRequest(BaseModel):
    """Payload to ask the Socratic coach for guidance on the current session/pattern."""

    question: str = Field(min_length=1, max_length=1000, description="The learner's question")
    session_id: str | None = Field(default=None, description="Optional rewrite session ID for context")
    current_weakness: str | None = Field(default=None, description="Optional weakness category / subtype")
    provider: str | None = None
    model: str | None = None


class RewriteLabSessionOut(BaseModel):
    """Complete session representation returned to the client."""

    id: str
    user_id: str | None
    source_type: str
    source_id: str | None
    original_text: str
    context_vi: str | None
    has_issue: bool
    issue_category: str | None
    issue_category_name_vi: str | None
    issue_explanation_vi: str | None
    target_concept: str | None
    target_segment: str | None
    current_step: int  # 1..6
    status: str  # active, self_corrected, revealed, transferred, completed
    clue: str | None
    pattern: str | None
    attempts: list[dict[str, Any]]
    revealed_variants: RewriteVariantsResult | None
    transfer_task: TransferTaskResult | None
    transfer_attempts: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class RecentSnippetItem(BaseModel):
    """A recent Japanese sentence snippet from learner practice history."""

    id: str
    text: str
    source_type: Literal["practice", "challenge", "free_writing", "simulation", "weakness"]
    source_title: str
    context_vi: str | None = None
    issue_preview: str | None = None
    created_at: datetime


class RecentSnippetsResponse(BaseModel):
    """List of recent Japanese snippets available for quick import into Rewrite Lab."""

    snippets: list[RecentSnippetItem]
    total: int
