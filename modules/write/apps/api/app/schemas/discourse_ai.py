"""Structured AI-pipeline contracts for long-form discourse evaluation.

Stage outputs (segmentation -> discourse analysis -> style consistency ->
synthesis -> coach/revision guidance) are validated by the Phase 2 gateway
before the discourse service ever sees them. Composite scores (sentence
quality, discourse quality, overall writing) are computed deterministically
by the service; the AI only supplies dimension scores and qualitative
content.
"""

import enum

from pydantic import BaseModel, Field


class CoherenceClassification(str, enum.Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    WEAK = "weak"
    POOR = "poor"


class TopicConsistencyClassification(str, enum.Enum):
    CONSISTENT = "consistent"
    MINOR_DRIFT = "minor_drift"
    MAJOR_DRIFT = "major_drift"


class DiscourseIssueCategory(str, enum.Enum):
    COHERENCE = "coherence"
    COHESION = "cohesion"
    ORGANIZATION = "organization"
    FLOW = "flow"
    REDUNDANCY = "redundancy"
    STYLE = "style"
    REGISTER = "register"
    TOPIC_CONSISTENCY = "topic_consistency"


class DiscourseIssueSeverity(str, enum.Enum):
    INFO = "info"
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


DISCOURSE_ISSUE_CATEGORY_VALUES = {c.value for c in DiscourseIssueCategory}
DISCOURSE_ISSUE_SEVERITY_VALUES = {s.value for s in DiscourseIssueSeverity}


class DiscourseIssue(BaseModel):
    """One cross-sentence feedback item with a sentence-level location.

    ``sentence_index`` is the primary identifier (0-based); ``sentence_range``
    covers multi-sentence problems. Both refer to the deterministic
    segmentation of the draft.
    """

    category: str = Field(
        pattern=r"^(coherence|cohesion|organization|flow|redundancy|style|register|topic_consistency)$"
    )
    severity: str = Field(pattern=r"^(info|minor|major|critical)$")
    sentence_index: int | None = Field(default=None, ge=0)
    sentence_range: tuple[int, int] | None = None
    explanation: str = Field(min_length=1, max_length=1000)
    suggested_fix: str = Field(min_length=1, max_length=1000)


class DiscourseSegmentationResult(BaseModel):
    """Stage 0 output: sentence boundaries for ambiguous texts."""

    sentences: list[str] = Field(min_length=1, max_length=40)
    boundaries: list[int] = Field(default_factory=list, max_length=40)


class DiscourseAnalysisResult(BaseModel):
    """Combined discourse stage: coherence, cohesion, organization, flow,
    redundancy and topic consistency in ONE call (stages stay replaceable)."""

    coherence_score: int = Field(ge=0, le=100)
    coherence_classification: str = Field(pattern=r"^(excellent|good|acceptable|weak|poor)$")
    topic_consistency_classification: str = Field(pattern=r"^(consistent|minor_drift|major_drift)$")
    cohesion_score: int = Field(ge=0, le=100)
    flow_score: int = Field(ge=0, le=100)
    organization_score: int = Field(ge=0, le=100)
    redundancy_score: int = Field(ge=0, le=100)
    structure_reorder_advice: str | None = Field(default=None, max_length=1000)
    issues: list[DiscourseIssue] = Field(default_factory=list, max_length=20)


class StyleConsistencyResult(BaseModel):
    """Style/register consistency stage output (own call, register-aware)."""

    style_consistency_score: int = Field(ge=0, le=100)
    register_fit_score: int = Field(ge=0, le=100)
    register_notes: str | None = Field(default=None, max_length=500)
    issues: list[DiscourseIssue] = Field(default_factory=list, max_length=10)


class Rewrites(BaseModel):
    """Meaning-preserving rewrite levels.

    ``professional_rewrite`` is only produced when the scenario register
    warrants it (Phase 9); the three core levels are always required.
    """

    minimal_fix: str = Field(min_length=1, max_length=4000)
    natural_rewrite: str = Field(min_length=1, max_length=4000)
    native_rewrite: str = Field(min_length=1, max_length=4000)
    professional_rewrite: str | None = Field(default=None, max_length=4000)


class StructureSuggestionResult(BaseModel):
    """Optional structure template for long writing."""

    reorder_advice: str | None = Field(default=None, max_length=1000)
    template: str | None = Field(default=None, max_length=32)
    template_reason: str | None = Field(default=None, max_length=500)


class DiscourseSynthesisResult(BaseModel):
    """Final stage: learner-facing report + meaning-preserving rewrites."""

    strengths: list[str] = Field(min_length=1, max_length=5)
    summary: str = Field(min_length=1, max_length=1000)
    improved_structure: str | None = Field(default=None, max_length=1000)
    rewrites: Rewrites


class DiscourseCoachResult(BaseModel):
    """Bounded coaching answer; never reveals chain-of-thought."""

    answer: str = Field(min_length=1, max_length=1200)
    suggestions: list[str] = Field(default_factory=list, max_length=4)


class RevisionGuidanceResult(BaseModel):
    """Pedagogical framing of a draft-to-draft comparison."""

    summary: str = Field(min_length=1, max_length=1000)
    per_dimension_notes: dict[str, str] = Field(default_factory=dict, max_length=20)
