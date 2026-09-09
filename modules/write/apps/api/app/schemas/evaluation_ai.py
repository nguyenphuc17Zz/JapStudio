"""Structured AI-pipeline contracts for writing evaluation.

Stage outputs (semantic -> grammar/vocabulary -> naturalness/register ->
corrections -> hints) are validated by the Phase 2 gateway before the
evaluation service ever sees them. ``WritingEvaluation`` is the synthesized,
persisted payload combining every stage plus deterministic scores.
"""

import enum
from datetime import datetime

from pydantic import BaseModel, Field


class SemanticClassification(str, enum.Enum):
    FULLY_EQUIVALENT = "fully_equivalent"
    MOSTLY_EQUIVALENT = "mostly_equivalent"
    PARTIALLY_EQUIVALENT = "partially_equivalent"
    MEANING_CHANGED = "meaning_changed"


class NaturalnessClassification(str, enum.Enum):
    NATURAL = "natural"
    ACCEPTABLE = "acceptable"
    SLIGHTLY_UNNATURAL = "slightly_unnatural"
    UNNATURAL = "unnatural"
    VERY_UNNATURAL = "very_unnatural"


class IssueCategory(str, enum.Enum):
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"
    NATURALNESS = "naturalness"
    REGISTER = "register"
    SEMANTIC = "semantic"


class IssueSeverity(str, enum.Enum):
    INFO = "info"
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


class Confidence(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EvaluationIssue(BaseModel):
    """One feedback item. Category is the single primary classification."""

    category: str = Field(pattern=r"^(grammar|vocabulary|naturalness|register|semantic)$")
    severity: str = Field(pattern=r"^(info|minor|major|critical)$")
    original_text: str = Field(min_length=1, max_length=500)
    explanation: str = Field(min_length=1, max_length=1000)
    suggested_fix: str = Field(min_length=1, max_length=1000)
    reason: str | None = Field(default=None, max_length=1000)


class SemanticEvaluation(BaseModel):
    """Stage 1 output: does the Japanese convey the intended meaning?"""

    classification: str = Field(
        pattern=r"^(fully_equivalent|mostly_equivalent|partially_equivalent|meaning_changed)$"
    )
    score: int = Field(ge=0, le=100)
    omissions: list[str] = Field(default_factory=list, max_length=10)
    additions: list[str] = Field(default_factory=list, max_length=10)
    meaning_changes: list[str] = Field(default_factory=list, max_length=10)
    confidence: str = Field(pattern=r"^(high|medium|low)$")


class GrammarVocabularyEvaluation(BaseModel):
    """Stage 2 output: grammar errors and vocabulary suitability."""

    grammar_score: int = Field(ge=0, le=100)
    vocabulary_score: int = Field(ge=0, le=100)
    issues: list[EvaluationIssue] = Field(default_factory=list, max_length=15)
    confidence: str = Field(pattern=r"^(high|medium|low)$")


class NaturalnessRegisterEvaluation(BaseModel):
    """Stage 3 output: how a native speaker would phrase it + context/register fit."""

    naturalness_classification: str = Field(
        pattern=r"^(natural|acceptable|slightly_unnatural|unnatural|very_unnatural)$"
    )
    naturalness_score: int = Field(ge=0, le=100)
    context_fit_score: int = Field(ge=0, le=100)
    register_fit_score: int = Field(ge=0, le=100)
    issues: list[EvaluationIssue] = Field(default_factory=list, max_length=15)
    register_notes: str | None = Field(default=None, max_length=1000)
    confidence: str = Field(pattern=r"^(high|medium|low)$")


class CorrectionResult(BaseModel):
    """Stage 4 output: three refinement levels plus register variants."""

    correct_version: str = Field(min_length=1, max_length=2000)
    natural_version: str = Field(min_length=1, max_length=2000)
    native_version: str = Field(min_length=1, max_length=2000)
    casual_version: str | None = Field(default=None, max_length=2000)
    polite_version: str | None = Field(default=None, max_length=2000)
    business_version: str | None = Field(default=None, max_length=2000)


class HintResult(BaseModel):
    """Stage 5 output: progressively more explicit hints."""

    hints: list[str] = Field(min_length=1, max_length=6)


class EvaluationVerificationResult(BaseModel):
    """Optional critique pass over the primary evaluation stages."""

    accepted: bool
    false_positive_grammar: list[str] = Field(default_factory=list, max_length=10)
    incorrect_naturalness_claims: list[str] = Field(default_factory=list, max_length=10)
    score_inconsistencies: list[str] = Field(default_factory=list, max_length=10)
    semantic_misclassification: bool = False
    notes: str | None = Field(default=None, max_length=1000)


class EvaluationScores(BaseModel):
    """Deterministic, validated 0-100 scores."""

    overall_score: int = Field(ge=0, le=100)
    semantic_score: int = Field(ge=0, le=100)
    grammar_score: int = Field(ge=0, le=100)
    vocabulary_score: int = Field(ge=0, le=100)
    naturalness_score: int = Field(ge=0, le=100)
    context_fit_score: int = Field(ge=0, le=100)
    register_fit_score: int = Field(ge=0, le=100)


class Corrections(BaseModel):
    """Exposed only through reveal (or when learning mode is disabled)."""

    correct_version: str
    natural_version: str
    native_version: str
    casual_version: str | None = None
    polite_version: str | None = None
    business_version: str | None = None


class WritingEvaluation(BaseModel):
    """The complete persisted evaluation payload (stored as JSON)."""

    scores: EvaluationScores
    semantic_classification: str
    semantic_omissions: list[str] = Field(default_factory=list, max_length=10)
    semantic_additions: list[str] = Field(default_factory=list, max_length=10)
    semantic_meaning_changes: list[str] = Field(default_factory=list, max_length=10)
    semantic_confidence: str = Field(pattern=r"^(high|medium|low)$")
    grammar_confidence: str = Field(pattern=r"^(high|medium|low)$")
    vocabulary_confidence: str = Field(pattern=r"^(high|medium|low)$")
    naturalness_confidence: str = Field(pattern=r"^(high|medium|low)$")
    naturalness_classification: str
    register_notes: str | None = Field(default=None, max_length=1000)
    issues: list[EvaluationIssue] = Field(default_factory=list, max_length=15)
    corrections: Corrections
    hints: list[str] = Field(min_length=1, max_length=6)
    summary: str = Field(min_length=1, max_length=2000)


class EvaluationStageMetadata(BaseModel):
    """Provenance for one AI stage call. Never contains credentials."""

    stage: str
    provider: str
    model: str
    prompt_version: str
    timestamp: datetime
    retries: int = 0


class EvaluationMetadata(BaseModel):
    """Overall provenance for one evaluation (stage-level detail)."""

    evaluation_version: str
    stages: list[EvaluationStageMetadata] = Field(default_factory=list, max_length=10)
