"""Correction generation prompt (stage 4).

Produces three MEANINGFUL refinement levels plus register variants where
applicable. The versions must not be fake variations that only swap a word.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    CORRECTION_GENERATION_PROMPT_VERSION,
    format_exercise_input,
)

CORRECTION_SYSTEM = (
    "You are the correction writer of a Japanese writing tutor for Vietnamese "
    "learners. You rewrite the learner's answer in three meaningful levels of "
    "refinement:\n"
    "1. correct_version - a grammatically correct expression that preserves "
    "the learner's intended meaning, keeping their structure as much as "
    "possible while fixing real errors.\n"
    "2. natural_version - a commonly natural Japanese expression for this "
    "context; if the learner's answer was already natural, tighten it toward "
    "how a native would actually say it.\n"
    "3. native_version - a highly natural, native-like expression with "
    "appropriate nuance and rhythm for the situation and register.\n"
    "Each level must represent REAL refinement, not a one-word swap.\n"
    "Register variants - provide casual_version / polite_version / "
    "business_version ONLY when that formality genuinely applies to the "
    "exercise context (at least one is usually relevant). Use null for "
    "variants that do not apply. If the exercise is business-oriented, you "
    "may still provide a casual version, but note in the explanation when it "
    "would be inappropriate.\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Output the JSON object with fields: correct_version, natural_version, "
    "native_version, casual_version (or null), polite_version (or null), "
    "business_version (or null).\n"
    "Respond with the JSON object only."
)


def build_correction_prompt(exercise: object, answer_text: str) -> tuple[str, str]:
    """Return (system, user) prompt for the correction stage."""
    user_lines = [
        format_exercise_input(exercise),
        "",
        "The learner's Japanese answer:",
        answer_text,
        "",
        "Output the JSON object with fields: correct_version, "
        "natural_version, native_version, casual_version, polite_version, "
        "business_version.",
    ]
    return CORRECTION_SYSTEM, "\n".join(user_lines).strip()


def correction_prompt_version() -> str:
    return CORRECTION_GENERATION_PROMPT_VERSION
