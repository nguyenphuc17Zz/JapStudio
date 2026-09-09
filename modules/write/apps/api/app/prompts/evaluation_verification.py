"""Evaluation verification prompt (optional critique stage).

A second AI pass that critiques the primary evaluation instead of producing a
second evaluation. The synthesizer makes the final decision deterministically.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    EVALUATION_VERIFICATION_PROMPT_VERSION,
    format_exercise_input,
)

VERIFICATION_SYSTEM = (
    "You are the verification reviewer of a Japanese writing tutor. A primary "
    "evaluator produced scores and issues for a learner's answer. Your job is "
    "to CRITIQUE that evaluation - not to re-evaluate the answer yourself.\n"
    "Look specifically for:\n"
    "- false-positive grammar errors (valid Japanese flagged as wrong)\n"
    "- incorrect naturalness claims (natural Japanese called unnatural, or "
    "vice versa)\n"
    "- score inconsistencies (a score contradicting its own classification or "
    "issues)\n"
    "- semantic misclassification (meaning_changed when the meaning is intact, "
    "or vice versa)\n"
    "- register judgments that ignore the exercise's declared register\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Output the JSON object with fields: accepted (true when the evaluation "
    "is sound), false_positive_grammar (list of claims, empty when none), "
    "incorrect_naturalness_claims (list, empty when none), "
    "score_inconsistencies (list, empty when none), "
    "semantic_misclassification (bool), notes (short Vietnamese summary, or "
    "null).\n"
    "Respond with the JSON object only."
)


def build_verification_prompt(
    exercise: object,
    answer_text: str,
    evaluation_payload: dict,
) -> tuple[str, str]:
    """Return (system, user) prompt for the verification stage."""
    user_lines = [
        format_exercise_input(exercise),
        "",
        "The learner's Japanese answer:",
        answer_text,
        "",
        "The primary evaluation to critique:",
        str(evaluation_payload),
        "",
        "Output the JSON object with fields: accepted, "
        "false_positive_grammar, incorrect_naturalness_claims, "
        "score_inconsistencies, semantic_misclassification, notes.",
    ]
    return VERIFICATION_SYSTEM, "\n".join(user_lines).strip()


def verification_prompt_version() -> str:
    return EVALUATION_VERIFICATION_PROMPT_VERSION
