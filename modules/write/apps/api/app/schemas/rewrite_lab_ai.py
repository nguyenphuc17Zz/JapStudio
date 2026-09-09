"""Structured output schemas for AI-generated Self-Correction & Rewrite Lab (Phase 19)."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class IssueDetectionResult(BaseModel):
    """Step 1 & 2: Detects issues and explains ONLY the category pedagogically."""

    has_issue: bool = Field(description="True if the sentence has grammatical, naturalness, or register issues")
    category: str = Field(
        description="Standardized category, e.g.: particle_choice, verb_conjugation, word_order, register_mismatch, collocation_unnatural, redundancy, omission, nuance"
    )
    category_name_vi: str = Field(description="Vietnamese category label, e.g. 'Lỗi trợ từ (助詞の誤用)'")
    category_explanation_vi: str = Field(
        description="High-level pedagogical explanation in Vietnamese of why this category of error occurs. NEVER reveal the exact word/particle replacement or the corrected sentence here!"
    )
    target_concept: str = Field(
        description="Abstract underlying target grammar/particle/structure concept, e.g.: '〜のが楽しい (danh từ hóa cảm xúc)', 'に vs で', '丁寧語の統一'"
    )
    target_segment: str | None = Field(
        default=None,
        description="Learner's problematic phrase to focus attention on without revealing the fix (e.g. '勉強することが')"
    )


class SelfCorrectionAttemptResult(BaseModel):
    """Evaluates a learner's self-correction attempt with semantic delta check."""

    is_correct: bool = Field(description="True if the learner's corrected sentence successfully resolves the error and is natural")
    is_improved: bool = Field(description="True if the attempt is better than the original even if not 100% perfect")
    score: int = Field(ge=0, le=100, description="Score 0-100 of this attempt")
    improvement_status: Literal[
        "significantly_improved",
        "improved",
        "partially_improved",
        "unchanged",
        "regressed"
    ] = Field(description="Classification of the improvement delta")
    quality_delta: int = Field(description="Score difference compared to the original/previous attempt")
    feedback_vi: str = Field(
        description="Socratic feedback in Vietnamese explaining why the attempt works or what still needs adjustment"
    )
    remaining_issues: list[str] = Field(
        default_factory=list,
        description="List of remaining or newly introduced issues if any"
    )
    next_step_action: Literal[
        "proceed_to_transfer",
        "advance_to_clue",
        "advance_to_pattern",
        "advance_to_reveal"
    ] = Field(description="Recommended next step in the progressive ladder")
    next_clue: str | None = Field(
        default=None,
        description="Targeted clue for Step 4 if advancing to clue stage (guiding question without revealing the answer)"
    )
    next_pattern: str | None = Field(
        default=None,
        description="Structural pattern template & analogous example for Step 5 (e.g. 'Mẫu câu: [V-dic + の] + が + [Tính từ]. Ví dụ: 本を読むのが好きです。')"
    )


class RewriteVariantsResult(BaseModel):
    """Step 6: Controlled comparison variants and immediate synthesis requirement."""

    original: str = Field(description="Original sentence written by the learner")
    minimal_correction: str = Field(description="Grammatically correct version keeping the learner's words & structure as intact as possible")
    natural_japanese: str = Field(description="Idiomatic, smooth expression how a native speaker would naturally say it")
    formal_business: str | None = Field(
        default=None,
        description="Formal/Business Keigo alternative when applicable (Sonkeigo/Kenjougo/Teineigo)"
    )
    casual_variant: str | None = Field(default=None, description="Casual plain form (ため口) variant if relevant")
    synthesis_prompt_vi: str = Field(
        default="Hãy viết 1 câu mới hoàn chỉnh sử dụng cùng mẫu câu trên.",
        description="Instruction requiring the user to produce a brand new sentence with the pattern"
    )
    explanations: dict[str, str] = Field(
        default_factory=dict,
        description="Linguistic rationale for each variant explaining why it was written that way"
    )


class TransferTaskResult(BaseModel):
    """Step 7: Novel context prompt testing the same underlying concept."""

    concept_tested: str = Field(description="Target pattern/concept tested (e.g. '〜のが楽しい')")
    scenario_prompt_vi: str = Field(
        description="Fresh, distinct situation prompt in Vietnamese testing the exact same concept (e.g. 'Hãy viết một câu diễn đạt việc tự tay chuẩn bị bữa sáng cuối tuần rất vui vẻ')"
    )
    required_pattern: str = Field(description="Specific pattern requirement (e.g. '〜のが[Tính từ]')")
    context_hint_vi: str | None = Field(
        default=None,
        description="Optional helpful hint or vocabulary cue"
    )


class TransferEvaluationResult(BaseModel):
    """Evaluates whether the transfer sentence correctly applies the target pattern in the new context."""

    transferred_successfully: bool = Field(description="True if the concept was accurately and naturally applied")
    pattern_applied_correctly: bool = Field(description="True if the required grammar pattern was used properly")
    score: int = Field(ge=0, le=100, description="Overall score 0-100")
    feedback_vi: str = Field(description="Pedagogical feedback in Vietnamese assessing the transfer capability")
    strengths: list[str] = Field(default_factory=list, description="Points the learner executed well")
    improvement_points: list[str] = Field(default_factory=list, description="Suggestions for further polish")
    exemplar_sentence: str | None = Field(
        default=None,
        description="Exemplar natural Japanese sentence for this transfer prompt"
    )


class RewriteModeResult(BaseModel):
    """Single mode rewrite transformation with linguistic reasoning."""

    mode: Literal[
        "minimal",
        "natural",
        "register",
        "concision",
        "expansion",
        "native"
    ] = Field(description="Transformation mode")
    mode_label_vi: str = Field(description="Vietnamese title for the mode")
    rewritten_text: str = Field(description="Transformed Japanese text")
    explanation_vi: str = Field(description="Linguistic explanation of why this transformation was made")
    key_changes: list[str] = Field(
        default_factory=list,
        description="Specific grammar, lexical, or stylistic changes applied"
    )


class DiffChunkResult(BaseModel):
    """Individual chunk in a linguistic diff."""

    type: Literal["equal", "insert", "delete", "replace"] = Field(description="Diff operation type")
    before_text: str = Field(default="", description="Original segment")
    after_text: str = Field(default="", description="Revised segment")
    rationale_vi: str = Field(description="Grammatical / stylistic explanation of why this specific chunk changed")


class DiffExplanationResult(BaseModel):
    """Semantic and linguistic diff analysis between two Japanese sentences."""

    before: str = Field(description="Before text")
    after: str = Field(description="After text")
    chunks: list[DiffChunkResult] = Field(description="List of explained diff chunks")
    improvement_status: Literal[
        "significantly_improved",
        "improved",
        "partially_improved",
        "unchanged",
        "regressed"
    ] = Field(description="Whether the modification improved the sentence")
    quality_delta: int = Field(description="Estimated score delta (+/- points)")
    summary_rationale_vi: str = Field(description="Comprehensive summary in Vietnamese of the linguistic changes")


class SocraticCoachResult(BaseModel):
    """Context-aware Socratic coach response focusing on teaching the pattern."""

    answer: str = Field(description="Socratic pedagogical guidance in Vietnamese (max 600 chars) teaching the underlying pattern")
    pattern_highlight: str | None = Field(
        default=None,
        description="Abstract pattern formula, e.g. '[Danh từ hóa の] + が + [Tính từ]'"
    )
    why_previous_failed_vi: str | None = Field(
        default=None,
        description="Brief explanation of why the learner's previous attempt was off-target without revealing the exact fix"
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="2-3 recommended follow-up questions or reflection prompts"
    )
