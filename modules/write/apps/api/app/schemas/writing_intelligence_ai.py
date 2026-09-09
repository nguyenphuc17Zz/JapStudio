"""AI-structured response schemas for Writing Intelligence Diagnosis & Synthesis (Phase 16)."""

from pydantic import BaseModel, Field


class WeaknessRootCause(BaseModel):
    category: str = Field(description="grammar | lexicon | naturalness | register | discourse")
    subtype: str = Field(description="Subtype identifier, e.g. particles, conjugation, literal_translation")
    root_cause_vi: str = Field(description="Root cause explanation in Vietnamese (e.g. L1 interference, thinking in Vietnamese first)")
    japanese_pattern_tip: str = Field(description="Recommended Japanese grammar/pattern structure or native habit to adopt")
    example_bad_vs_good: str | None = Field(default=None, description="Example comparison, e.g. ❌ 猫は好きです -> ⭕ 猫が好きです")


class WritingDiagnosisResult(BaseModel):
    overall_assessment_vi: str = Field(description="Comprehensive evaluation of the learner's Japanese writing style and tendencies")
    strengths_assessment_vi: str = Field(description="Positive aspects and strengths observed in learner's Japanese writing")
    root_causes: list[WeaknessRootCause] = Field(default_factory=list, description="Deep root-cause analysis for recurring/persistent weaknesses")
    action_plan_vi: list[str] = Field(default_factory=list, description="Specific step-by-step actions to improve writing quality")
    recommended_grammar_focus: list[str] = Field(default_factory=list, description="Target grammar points/expressions to review")
    encouragement_vi: str = Field(description="Motivational closing message tailored to Japanese writing journey")
    estimated_writing_level: str = Field(default="N4-N3", description="Estimated JLPT writing mastery level")


class MasteryNarrativeResult(BaseModel):
    why_it_matters: str = Field(
        description="Friendly explanation in Vietnamese of why this weakness matters and how it appears in writing"
    )
    current_mastery: str = Field(
        description="Current mastery evaluation across guided vs free writing contexts in Vietnamese"
    )
    evidence_text: str = Field(
        description="Summary of evidence (contexts passed, days since error) in friendly Vietnamese"
    )
    next_step: str = Field(
        description="Next concrete recommended action or scheduled retest context in Vietnamese"
    )

