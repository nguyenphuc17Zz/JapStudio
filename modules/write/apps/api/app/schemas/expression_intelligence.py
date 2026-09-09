"""Pydantic schemas for Expression Intelligence API (Phase 21)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field



class ExpressionRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str | None = None
    expression: str
    base_word: str | None = None
    expression_type: str
    used_count: int = 1
    misused_count: int = 0
    avoided_count: int = 0
    natural_use_count: int = 0
    registers_used: list[str] = Field(default_factory=list)
    naturalness_avg: float = 75.0
    is_overused: bool = False
    overuse_count: int = 0
    vietnamese_literal: bool = False
    transfer_classification: str = "natural"
    native_alternatives: list[str] = Field(default_factory=list)
    collocations: list[str] = Field(default_factory=list)
    example_contexts: list[str] = Field(default_factory=list)
    nuance_notes: str | None = None
    first_used_at: datetime
    last_used_at: datetime
    created_at: datetime
    updated_at: datetime


class ExpressionBankSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_expressions: int = 0
    overused_count: int = 0
    literal_count: int = 0
    collocations_count: int = 0
    discourse_markers_count: int = 0
    sentence_endings_count: int = 0
    average_naturalness: float = 0.0
    by_transfer_classification: dict[str, int] = Field(default_factory=dict)
    top_overused: list[ExpressionRecordOut] = Field(default_factory=list)
    top_transfers: list[ExpressionRecordOut] = Field(default_factory=list)


class ExpressionBankListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[ExpressionRecordOut] = Field(default_factory=list)
    total: int = 0
    skip: int = 0
    limit: int = 50


class AnalyzeExpressionsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000, description="Japanese text to analyze")
    context_vi: str | None = Field(default=None, description="Optional Vietnamese translation or context")
    target_register: str | None = Field(default=None, description="casual | polite | formal | business | highly_formal")
    provider: str | None = None
    model: str | None = None


class GenerateVariationsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000, description="Japanese expression or sentence to generate 3 variations for")
    context_vi: str | None = Field(default=None, description="Intended Vietnamese meaning")
    provider: str | None = None
    model: str | None = None


class RegisterTransformRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000, description="Japanese sentence to transform")
    source_register: str = Field(default="polite", description="casual | polite | formal | business | highly_formal")
    target_register: str = Field(description="Target register to rewrite into: casual | polite | formal | business | highly_formal")
    provider: str | None = None
    model: str | None = None


class CollocationSuggestionsRequest(BaseModel):
    base_word: str = Field(min_length=1, max_length=100, description="Word/verb/noun to fetch native collocations for")
    provider: str | None = None
    model: str | None = None
