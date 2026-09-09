"""Naturalness + register evaluation prompt (combined stage 3).

Naturalness is the product differentiator: grammatical Japanese that a native
speaker would phrase differently. Register judges formality fit separately -
it never changes the grammar score.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    CATEGORY_GUIDANCE,
    NATURALNESS_REGISTER_EVALUATION_PROMPT_VERSION,
    SEVERITY_GUIDANCE,
    format_exercise_input,
)

NATURALNESS_REGISTER_SYSTEM = (
    "You are the naturalness and register judge of a Japanese writing tutor "
    "for Vietnamese learners.\n"
    "Naturalness - decide whether a Japanese native speaker would naturally "
    "phrase the sentence this way:\n"
    "- natural: would be said naturally by a native speaker.\n"
    "- acceptable: understandable and fine, though a native might phrase it a "
    "bit differently.\n"
    "- slightly_unnatural: noticeable but not seriously wrong.\n"
    "- unnatural: a native speaker would find it awkward.\n"
    "- very_unnatural: would sound clearly foreign or strange.\n"
    "Explain WHY, and when useful give what a native would more likely say. "
    "Use probabilistic language. Never invent absolute rules such as 'Japanese "
    "never says X'.\n"
    "Register - the exercise declares a target register (casual / polite / "
    "business / mixed). Judge whether the answer's formality fits:\n"
    "- A grammatically perfect answer can still be wrong for the register "
    "(e.g. casual Japanese in a business exercise).\n"
    "- 'mixed' exercises accept a mixture consistent with the situation.\n"
    "- The register score is SEPARATE: do not lower grammar or naturalness "
    "scores because of register, and do not lower register because of "
    "grammar.\n"
    f"{CATEGORY_GUIDANCE}\n"
    f"{SEVERITY_GUIDANCE}\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Score bands for naturalness_classification: natural 85-100, acceptable "
    "70-90, slightly_unnatural 50-80, unnatural 25-60, very_unnatural 0-40.\n"
    "Consistency requirement: If register_fit_score <= 40 (or there is a register mismatch), "
    "you MUST include at least one issue with category: 'register' in the issues list detailing "
    "the exact formality mismatch and suggested fix. Conversely, if there are no register issues, "
    "register_fit_score must be > 40.\n"
    "Context fit - judge whether the answer fits the exercise situation "
    "(topic, context, target length, difficulty): e.g. an off-topic sentence, "
    "an answer that ignores the context, or content that does not match what "
    "the prompt asks for.\n"
    "Output the JSON object with fields: naturalness_classification, "
    "naturalness_score (0-100), context_fit_score (0-100), "
    "register_fit_score (0-100), issues (list of "
    "{category, severity, original_text, explanation, suggested_fix, "
    "reason?}), register_notes (short Vietnamese explanation of register "
    "fit, or null), confidence (high/medium/low).\n"
    "Respond with the JSON object only."
)


def build_naturalness_register_prompt(exercise: object, answer_text: str) -> tuple[str, str]:
    """Return (system, user) prompt for the naturalness/register stage."""
    user_lines = [
        format_exercise_input(exercise),
        "",
        "The learner's Japanese answer:",
        answer_text,
        "",
        "Output the JSON object with fields: naturalness_classification, "
        "naturalness_score, context_fit_score, register_fit_score, issues, "
        "register_notes, confidence.",
    ]
    return NATURALNESS_REGISTER_SYSTEM, "\n".join(user_lines).strip()


def naturalness_register_prompt_version() -> str:
    return NATURALNESS_REGISTER_EVALUATION_PROMPT_VERSION
