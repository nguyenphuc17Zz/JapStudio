"""AI contracts for the adaptive learning engine (Phase 6).

Four AI stages, each schema-validated with deterministic code as the
authoritative layer:
1. learner_profile_synthesis - structured summary of deterministic evidence
2. mistake_clustering - group raw issue evidence into recurring patterns
3. learning_planner - pick strategy + exercise parameters (validated in code)
4. recommendation_explanation - learner-facing rationale (never source of
   truth, only enrichment of the deterministic recommendation)
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

JLPT_PATTERN = r"^N[1-5]$"
JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1"]
JLPT_LEVELS = Literal["N5", "N4", "N3", "N2", "N1"]
SKILL_NAMES = Literal[
    "grammar",
    "vocabulary",
    "naturalness",
    "semantic",
    "context_fit",
    "register_fit",
    "coherence",
    "cohesion",
    "organization",
    "flow",
    "style_consistency",
    "scenario_semantic_fit",
    "audience_fit",
    "purpose_fit",
    "tone_fit",
    "constraint_compliance",
]
CONFIDENCE = Literal["high", "medium", "low"]


class SkillScore(BaseModel):
    """One skill's score with its confidence and trend."""

    skill: SKILL_NAMES
    score: int = Field(ge=0, le=100)
    confidence: CONFIDENCE = "medium"
    trend: Literal["improving", "stable", "declining"] = "stable"


class JLPTEstimate(BaseModel):
    min_level: JLPT_LEVELS = "N5"
    max_level: JLPT_LEVELS = "N5"
    confidence: CONFIDENCE = "low"

    @field_validator("min_level", "max_level")
    @classmethod
    def _normalize_level(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.upper()
            if normalized in JLPT_ORDER:
                return normalized
            raise ValueError(f"invalid JLPT level: {value}")
        return value

    @model_validator(mode="after")
    def _check_min_le_max(self) -> "JLPTEstimate":
        if JLPT_ORDER.index(self.min_level) > JLPT_ORDER.index(self.max_level):
            raise ValueError("min_level must be <= max_level")
        return self


class TrendSummary(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    improvement: float = Field(ge=-100, le=100)
    last_7d_attempts: int = Field(default=0, ge=0)


class LearnerProfileSynthesisResult(BaseModel):
    """Stage 1 output: structured profile derived from deterministic evidence.

    Deterministic code computes the numbers first; this AI output must stay
    consistent with them (same magnitude) and adds learner-friendly framing
    only. Code overwrites anything conflicting with computed evidence.
    """

    strengths: list[str] = Field(default_factory=list, max_length=6)
    weaknesses: list[str] = Field(default_factory=list, max_length=6)
    estimated_jlpt: JLPTEstimate = JLPTEstimate()
    recent_trends: TrendSummary = Field(
        default_factory=lambda: TrendSummary(overall_score=0, improvement=0)
    )


class MistakeClusterItem(BaseModel):
    """One clustered mistake pattern (Stage 2 output)."""

    canonical_label: str = Field(min_length=1, max_length=255)
    description_vi: str = Field(min_length=1, max_length=1000)
    example_snippets: list[str] = Field(default_factory=list, max_length=5)
    severity: Literal["critical", "major", "minor", "info"] = "minor"


class MistakeClusteringResult(BaseModel):
    """Stage 2 output: all mistake evidence from one attempt, clustered."""

    clusters: list[MistakeClusterItem] = Field(default_factory=list, max_length=10)


class PlannedExercise(BaseModel):
    """Stage 3 output: one exercise plan (validated + adjusted in code)."""

    exercise_type: str = Field(min_length=1, max_length=32)
    topic: str = Field(min_length=1, max_length=100)
    register: str = Field(min_length=1, max_length=16)
    jlpt_level: str = Field(pattern=JLPT_PATTERN)
    difficulty: int = Field(ge=1, le=10)
    target_length: str = Field(min_length=1, max_length=32)
    focus_skills: list[SKILL_NAMES] = Field(default_factory=list, max_length=3)


class LearningRecommendationResult(BaseModel):
    """Stage 3 output: full plan, incl. a learner-facing reason.

    ``reason`` is written in Vietnamese, concise and concrete, citing the
    learner's own evidence. The strategy itself is chosen deterministically
    in code; the AI only proposes exercise parameters.
    """

    strategy: Literal["targeted", "reinforcement", "exploration", "scenario_practice"] = "targeted"
    planned_exercise: PlannedExercise
    reason: str = Field(min_length=1, max_length=1000)


class RecommendationExplanationResult(BaseModel):
    """Stage 4 output: enrichment of the deterministic recommendation.

    Only informational; the deterministic record (strategy, parameters,
    focus skills) is never overridden by this stage.
    """

    explanation: str = Field(min_length=1, max_length=2000)


# ---------------------------------------------------------------------------
# Phase 13 - AI Curriculum & Learning Journey Engine
# ---------------------------------------------------------------------------

GOAL_TYPES = Literal[
    "general",
    "daily_conversation",
    "business",
    "it",
    "brse",
    "jlpt",
    "natural_japanese",
    "writing_fluency",
]

COMPETENCY_NAMES = Literal[
    "grammar",
    "vocabulary",
    "semantic_accuracy",
    "naturalness",
    "coherence",
    "cohesion",
    "organization",
    "flow",
    "casual_register",
    "polite_register",
    "business_register",
    "clarification",
    "requesting",
    "refusing",
    "apologizing",
    "negotiating",
    "explaining",
    "reporting",
    "sentence_writing",
    "multi_sentence_writing",
    "paragraph_writing",
    "email_writing",
    "chat_writing",
    "report_writing",
    "proposal_writing",
    "simulation",
]

EXERCISE_MODE_NAMES = Literal[
    "sentence_translation",
    "multi_sentence_translation",
    "paragraph_translation",
    "free_writing",
    "register_challenge",
    "scenario_response",
    "email_writing",
    "chat_writing",
    "report_writing",
    "ticket_writing",
    "opinion_writing",
    "simulation",
]


class GoalInterpretationResult(BaseModel):
    """Stage 5a output: interpret the learner's free-form goal statement.

    Always derives from the deterministic goal taxonomy; the free-form goal
    stays as-is for display.
    """

    goal_type: GOAL_TYPES = "general"
    suggested_goal: str = Field(min_length=1, max_length=50)
    focus_competencies: list[COMPETENCY_NAMES] = Field(min_length=1, max_length=8)
    rationale_vi: str = Field(min_length=1, max_length=500)


class CurriculumMilestonePlan(BaseModel):
    """One planned milestone (Stage 5b output)."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=500)
    entry_criteria: dict = Field(default_factory=dict)


class CurriculumObjectivePlan(BaseModel):
    """One planned objective (Stage 5b output)."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=500)
    target_competencies: list[COMPETENCY_NAMES] = Field(min_length=1, max_length=4)
    exercise_modes: list[EXERCISE_MODE_NAMES] = Field(min_length=1, max_length=4)
    target_level: str = Field(min_length=1, max_length=32)
    priority: int = Field(default=1, ge=1, le=5)
    success_criteria: dict = Field(default_factory=dict)


class CurriculumPlanningResult(BaseModel):
    """Stage 5b output: the full long-term curriculum plan.

    Milestones and objectives are validated against the taxonomy in code;
    entry criteria are always deterministic (computed), never AI-proposed.
    """

    title: str = Field(min_length=1, max_length=200)
    overview_vi: str = Field(min_length=1, max_length=1000)
    milestones: list[CurriculumMilestonePlan] = Field(min_length=2, max_length=8)
    objectives: list[CurriculumObjectivePlan] = Field(min_length=4, max_length=48)


class CurriculumReplanningResult(BaseModel):
    """Stage 5c output: replanning proposal grounded in evidence.

    Only triggers accepted; the engine applies the plan and re-validates
    deterministically.
    """

    objective_changes: list[dict] = Field(default_factory=list, max_length=12)
    rationale_vi: str = Field(min_length=1, max_length=1000)


class ObjectiveProgressAnalysisResult(BaseModel):
    """Stage 5e output: interpretation of one objective's progress.

    Strictly informational - mastery state and completion are computed in
    code; this only adds a learner-facing narrative.
    """

    summary_vi: str = Field(min_length=1, max_length=1000)
    recommended_focus_vi: str = Field(min_length=1, max_length=500)
