"""Structured output schemas for AI-generated Writing Drills & Evaluations (Phase 18)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class WritingDrillOptionDraft(BaseModel):
    id: str = Field(description="Unique choice identifier, e.g., 'a', 'b', 'c'")
    text: str = Field(description="Option text in Japanese")
    is_correct: bool = Field(default=False, description="Whether this is the correct answer")
    explanation: str = Field(default="", description="Why this choice is correct or incorrect")


class WritingDrillItemDraft(BaseModel):
    drill_type: str = Field(
        description="One of: recognition, correction, rewrite, vietnamese_to_japanese, japanese_to_natural_rewrite, pattern_substitution, free_response, real_world_mini_task"
    )
    stage: int = Field(ge=1, le=4, description="Stage 1 (heavy), 2 (light), 3 (minimal), 4 (none)")
    guidance_level: str = Field(
        description="One of: heavy_guidance, light_guidance, minimal_guidance, no_guidance"
    )
    title_vi: str = Field(description="Short title in Vietnamese for this specific drill step")
    instructions_vi: str = Field(
        description="Clear instructions in Vietnamese guiding the learner what to do"
    )
    context_description: str = Field(
        description="Situational context (e.g. email to client, chat with colleague, diary note)"
    )
    source_text: str = Field(
        description="Prompt text in Vietnamese or sentence to correct/rewrite in Japanese"
    )
    scaffold: str | None = Field(
        default=None,
        description="Sentence blueprint, skeleton or starter (for stages 1 and 2)",
    )
    hints: list[str] = Field(
        default_factory=list,
        description="2-4 progressive hint strings ordered from subtle clue to specific rule",
    )
    options: list[WritingDrillOptionDraft] | None = Field(
        default=None,
        description="Options list if drill_type is recognition",
    )
    target_answer: str = Field(
        description="Exemplar natural Japanese target sentence / expected answer"
    )
    accepted_alternatives: list[str] = Field(
        default_factory=list,
        description="List of valid alternative natural Japanese sentences",
    )
    explanation: str = Field(
        description="Detailed explanation in Vietnamese of grammar/collocation/nuance"
    )
    target_focus: str = Field(
        description="Specific target point tested (e.g., 'Trợ từ に chỉ địa điểm tồn tại')"
    )


class WritingDrillDraft(BaseModel):
    title: str = Field(description="Session title in Vietnamese")
    target_focus: str = Field(description="Core grammar/collocation/register target focus")
    difficulty: int = Field(default=5, ge=1, le=10)
    jlpt_level: str = Field(default="N3")
    items: list[WritingDrillItemDraft] = Field(
        min_length=3,
        max_length=6,
        description="Sequence of 3-5 drill items moving through guided -> free stages",
    )


class DrillEvaluationResult(BaseModel):
    is_correct: bool = Field(description="True if answer is accurate and natural")
    score: int = Field(ge=0, le=100, description="Score 0-100")
    feedback_vi: str = Field(description="Detailed feedback in Vietnamese")
    nuance_contrast: str | None = Field(
        default=None,
        description="Comparison explaining why user choice sounds stiff/unnatural vs native phrasing",
    )
    corrected_text: str | None = Field(
        default=None,
        description="Corrected natural Japanese version if user had mistakes",
    )
    key_points_covered: list[str] = Field(
        default_factory=list,
        description="Grammar/vocabulary points correctly applied",
    )


class DrillDebriefResult(BaseModel):
    debrief_vi: str = Field(
        description="Summary in Vietnamese assessing how the learner overcame the specific weakness"
    )
    mastery_assessment: str = Field(
        description="One of: 'substantial_improvement', 'moderate_progress', 'needs_more_practice'"
    )
    next_step_vi: str = Field(description="Actionable next step recommendation in Vietnamese")
