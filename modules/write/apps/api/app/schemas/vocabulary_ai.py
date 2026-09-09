"""AI contracts for the vocabulary intelligence pipeline (Phase 5).

Three AI stages: extraction (candidates) -> validation (approve / deduplicate
/ correct) -> explanation (learner-oriented rationale). Every stage is schema
validated; deterministic code only normalizes and merges afterwards.
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

VocabularyItemType = Literal["word", "expression", "collocation"]
VocabularySourceType = Literal[
    "user_answer",
    "ai_correction",
    "ai_natural",
    "ai_native",
    "ai_register_variant",
    "ai_explanation",
]
VocabularyConfidenceLevel = Literal["high", "medium", "low"]

JLPT_PATTERN = r"^N[1-5]$"

SOURCE_TYPE_FALLBACK = "ai_natural"


class VocabularyCandidate(BaseModel):
    """One vocabulary item the AI thinks is worth learning from an attempt."""

    expression: str = Field(min_length=1, max_length=100)
    reading: str | None = Field(default=None, max_length=200)
    type: VocabularyItemType
    meaning_vi: str = Field(min_length=1, max_length=500)
    part_of_speech: str | None = Field(default=None, max_length=50)
    estimated_jlpt_level: str | None = Field(default=None, pattern=JLPT_PATTERN)
    difficulty: int = Field(ge=1, le=10)
    register: str | None = Field(default=None, max_length=20)
    usage_context: str | None = Field(default=None, max_length=100)
    example_sentence: str = Field(min_length=1, max_length=500)
    natural_alternatives: list[str] = Field(default_factory=list, max_length=5, min_length=0)
    learning_reason: str = Field(min_length=1, max_length=500)
    importance: int = Field(ge=1, le=10)
    confidence: VocabularyConfidenceLevel
    source_type: VocabularySourceType
    user_expression: str | None = Field(default=None, max_length=200)

    @field_validator("source_type", mode="before")
    @classmethod
    def _coerce_source_type(cls, value: object) -> object:
        """Real models sometimes invent source-type labels; fall back to ai_natural."""
        if isinstance(value, str) and value not in VocabularySourceType.__args__:
            return SOURCE_TYPE_FALLBACK
        return value


class VocabularyExtractionResult(BaseModel):
    """Stage 1 output: up to 10 candidates from one attempt."""

    candidates: list[VocabularyCandidate] = Field(default_factory=list, max_length=10)


class VocabularyValidationResult(BaseModel):
    """Stage 2 output: approve, reject or deduplicate one candidate.

    ``duplicate_of`` is the normalized expression of an existing entry the AI
    considers the same lexical item; deterministic normalized-equality is
    checked first, this field handles inflected-form / variant equivalence.
    """

    approved: bool
    duplicate_of: str | None = Field(default=None, max_length=255)
    rejected_reason: str | None = Field(default=None, max_length=500)
    corrected_expression: str | None = Field(default=None, max_length=100)
    corrected_reading: str | None = Field(default=None, max_length=200)
    corrected_meaning_vi: str | None = Field(default=None, max_length=500)
    corrected_jlpt_level: str | None = Field(default=None, pattern=JLPT_PATTERN)
    corrected_difficulty: int | None = Field(default=None, ge=1, le=10)
    corrected_register: str | None = Field(default=None, max_length=20)
    confidence: VocabularyConfidenceLevel = "medium"

    @model_validator(mode="after")
    def check_rejection_consistency(self) -> "VocabularyValidationResult":
        if not self.approved and not self.duplicate_of and not self.rejected_reason:
            raise ValueError("rejected_reason is required when rejected for a real reason")
        if self.duplicate_of and self.approved:
            raise ValueError("duplicate_of implies approved=false")
        return self


class VocabularyExplanation(BaseModel):
    """Stage 3 output: final learner-oriented rationale for one approved item."""

    expression: str = Field(min_length=1, max_length=100)
    learning_reason: str = Field(min_length=1, max_length=800)
    notes: str | None = Field(default=None, max_length=1000)
    example_sentence: str = Field(min_length=1, max_length=500)
    natural_alternatives: list[str] = Field(default_factory=list, max_length=5)


class VocabularyExplanationResult(BaseModel):
    """Stage 3 output: explanations aligned with the approved candidates."""

    explanations: list[VocabularyExplanation] = Field(default_factory=list, max_length=10)


class VocabLookupAlternative(BaseModel):
    expression: str = Field(min_length=1, max_length=200)
    reading: str | None = Field(default=None, max_length=300)
    meaning_vi: str = Field(min_length=1, max_length=2000)
    estimated_jlpt_level: str | None = Field(default=None, pattern=JLPT_PATTERN)
    register: str | None = Field(default=None, max_length=50)
    difference_explanation: str = Field(min_length=1, max_length=4000)


class VocabLookupExampleSentence(BaseModel):
    ja: str = Field(min_length=1, max_length=2000, description="Natural authentic Japanese example sentence")
    vi: str = Field(min_length=1, max_length=2000, description="Natural and accurate Vietnamese translation")
    situation: str = Field(
        default="Tình huống thực tế",
        max_length=300,
        description="Context tag (e.g. 'Giao tiếp hàng ngày', 'Công sở & Báo cáo', 'Email trao đổi', 'Đời sống thường nhật')",
    )


class VocabLookupBestMatch(BaseModel):
    expression: str = Field(min_length=1, max_length=200)
    reading: str | None = Field(default=None, max_length=300)
    meaning_vi: str = Field(min_length=1, max_length=2000)
    part_of_speech: str | None = Field(default=None, max_length=100)
    estimated_jlpt_level: str | None = Field(default=None, pattern=JLPT_PATTERN)
    difficulty: int = Field(default=5, ge=1, le=10)
    register: str | None = Field(default=None, max_length=50)
    nuance_explanation: str = Field(min_length=1, max_length=5000)
    usage_collocation: str | None = Field(default=None, max_length=2000)
    example_sentence: str = Field(min_length=1, max_length=2000)
    example_sentence_vi: str = Field(min_length=1, max_length=2000)
    examples: list[VocabLookupExampleSentence] = Field(
        default_factory=list,
        description="List of 2 to 3 practical example sentences demonstrating authentic real-world usage in different situations",
    )


class VocabLookupAiResult(BaseModel):
    query: str
    detected_direction: Literal["vi_to_ja", "ja_to_vi"]
    context_analysis: str | None = Field(default=None, max_length=5000)
    best_match: VocabLookupBestMatch
    alternatives: list[VocabLookupAlternative] = Field(default_factory=list, max_length=10)

