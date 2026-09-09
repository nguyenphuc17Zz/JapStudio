"""Transfer attempt evaluation prompt.

Evaluates whether the learner successfully applied the target pattern
to the novel transfer scenario.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    TRANSFER_EVALUATION_PROMPT_VERSION,
)

TRANSFER_EVALUATION_SYSTEM = (
    "You are a Japanese writing evaluator assessing a transfer exercise.\n"
    "The learner was asked to write a new sentence for a specific scenario using "
    "a newly mastered grammar pattern.\n\n"
    "EVALUATION CRITERIA:\n"
    "1. Pattern Application: Did the learner correctly apply the target pattern?\n"
    "2. Naturalness & Meaning: Does the sentence fulfill the scenario prompt naturally?\n"
    "3. Feedback in Vietnamese: Provide positive reinforcement, clear strengths, "
    "and constructive refinement points.\n"
    "4. Exemplar: Provide an ideal, natural native exemplar sentence.\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Respond with a JSON object containing:\n"
    "- transferred_successfully (bool)\n"
    "- pattern_applied_correctly (bool)\n"
    "- score (int 0-100)\n"
    "- feedback_vi (string)\n"
    "- strengths (list of strings)\n"
    "- improvement_points (list of strings)\n"
    "- exemplar_sentence (string or null)\n"
)


def build_transfer_evaluation_prompt(
    scenario_prompt_vi: str,
    required_pattern: str,
    transfer_text: str,
) -> tuple[str, str]:
    """Return prompt for evaluating a transfer exercise attempt."""
    user_lines = [
        f"Scenario prompt: {scenario_prompt_vi}",
        f"Required pattern: {required_pattern}",
        f"Learner's transfer sentence: {transfer_text}",
        "",
        "Evaluate the sentence and verify whether the learner demonstrated pattern mastery.",
    ]
    return TRANSFER_EVALUATION_SYSTEM, "\n".join(user_lines).strip()


def transfer_evaluation_prompt_version() -> str:
    return TRANSFER_EVALUATION_PROMPT_VERSION
