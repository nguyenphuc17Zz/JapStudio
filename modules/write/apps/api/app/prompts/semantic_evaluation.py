"""Semantic evaluation prompt: does the Japanese convey the intended meaning?

Stage 1 of the evaluation pipeline. Judges meaning ONLY - never grammar or
style (those have their own stages).
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    MEANING_PRINCIPLE,
    SEMANTIC_EVALUATION_PROMPT_VERSION,
    format_exercise_input,
)

SEMANTIC_SYSTEM = (
    "You are the semantic judge of a Japanese writing tutor for Vietnamese "
    "learners. You compare the MEANING the exercise asks the learner to "
    "express with the MEANING of the learner's Japanese answer.\n"
    f"{MEANING_PRINCIPLE}\n"
    "Judge only whether the Japanese conveys the intended meaning. Do not "
    "judge grammar, vocabulary choice, naturalness or register - other "
    "specialists handle those.\n"
    "Check systematically:\n"
    "- Was any important information omitted?\n"
    "- Was extra meaning introduced?\n"
    "- Did tense or aspect change the meaning?\n"
    "- Did modality or certainty change?\n"
    "- Did subject/object relationships change?\n"
    "- Did negation change the meaning?\n"
    "- Did the relationship between clauses change?\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Classification:\n"
    "- fully_equivalent: same meaning, nothing important lost or added.\n"
    "- mostly_equivalent: minor differences that do not change the core "
    "message.\n"
    "- partially_equivalent: some important information missing/added/changed, "
    "but the core message survives.\n"
    "- meaning_changed: the core message is lost or contradicted.\n"
    "Score (0-100) must match the classification: fully_equivalent 85-100, "
    "mostly_equivalent 70-90, partially_equivalent 40-75, meaning_changed "
    "0-50.\n"
    "Output the JSON object with fields: classification, score, omissions "
    "(list), additions (list), meaning_changes (list), confidence "
    "(high/medium/low).\n"
    "Respond with the JSON object only."
)


def build_semantic_prompt(exercise: object, answer_text: str) -> tuple[str, str]:
    """Return (system, user) prompt for the semantic stage."""
    user_lines = [
        format_exercise_input(exercise),
        "",
        "The learner's Japanese answer:",
        answer_text,
        "",
        "Output the JSON object with fields: classification, score, omissions, "
        "additions, meaning_changes, confidence.",
    ]
    return SEMANTIC_SYSTEM, "\n".join(user_lines).strip()


def semantic_prompt_version() -> str:
    return SEMANTIC_EVALUATION_PROMPT_VERSION
