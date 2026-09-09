"""Validator prompt: quality gate for generated exercises."""

from app.prompts.common import (
    EXERCISE_VALIDATION_PROMPT_VERSION,
    MEANING_PRINCIPLE,
    OUTPUT_INSTRUCTION,
)
from app.schemas.exercise_ai import ExerciseDraft, ExercisePlan

VALIDATOR_SYSTEM = (
    "You are the quality gate of a Japanese writing tutor. You review a "
    "generated exercise before it is shown to a learner.\n"
    "Check:\n"
    "- Vietnamese quality: natural Vietnamese, no grammar mistakes, no awkward "
    "machine-translated style, meaning is understandable.\n"
    "- Target length conformance: check that prompt_vi matches target_length "
    "(if 'paragraph', prompt_vi must contain 3-5 sentences forming a coherent paragraph; "
    "if 'multi_sentence', it must contain 2-3 sentences; if 'short_sentence', it must be a single concise sentence). "
    "Reject if prompt_vi is too short or too long for the planned target length.\n"
    "- Exercise quality: clear instruction, appropriate length for the target "
    "length, difficulty sub-metrics match the planned difficulty, register "
    "matches the context, appropriate topic, sufficiently challenging, not "
    "trivial.\n"
    "- Learning quality: the exercise encourages meaningful Japanese production, "
    "not a mechanical one-to-one word substitution.\n"
    f"{MEANING_PRINCIPLE}\n"
    f"{OUTPUT_INSTRUCTION}\n"
    "Output the JSON object with fields: valid (true/false), issues (list of "
    "specific fixable problems in Vietnamese or English; empty when valid), "
    "suggestion (one sentence of guidance for the writer, or null).\n"
    "Respond with the JSON object only."
)


def build_validator_prompt(plan: ExercisePlan, draft: ExerciseDraft) -> tuple[str, str]:
    """Return (system, user) prompt for the validator stage."""
    user_lines = [
        "Review this exercise.",
        "",
        "Planned metadata:",
        f"- exercise_type: {plan.exercise_type.value}",
        f"- topic: {plan.topic}" + (f" / subtopic: {plan.subtopic}" if plan.subtopic else ""),
        f"- register: {plan.register.value}",
        f"- jlpt_level: {plan.jlpt_level.value}",
        f"- difficulty: {plan.difficulty}",
        f"- target_length: {plan.target_length.value}",
        "",
        "Generated content:",
        f"- context: {draft.context}",
        f"- prompt_vi: {draft.prompt_vi}",
        f"- grammar_complexity: {draft.grammar_complexity}",
        f"- vocabulary_complexity: {draft.vocabulary_complexity}",
        f"- context_complexity: {draft.context_complexity}",
        f"- naturalness_target: {draft.naturalness_target}",
        "",
        "Output the JSON object with fields: valid, issues, suggestion.",
    ]
    return VALIDATOR_SYSTEM, "\n".join(user_lines).strip()


def validator_prompt_version() -> str:
    return EXERCISE_VALIDATION_PROMPT_VERSION
