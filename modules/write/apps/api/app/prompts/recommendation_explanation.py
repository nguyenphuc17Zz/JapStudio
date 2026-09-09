"""Recommendation explanation prompt (Phase 6, stage 4).

Version: recommendation_explanation:v1

Produces a friendly, learner-facing explanation of why this exercise was
recommended. Purely informational: the deterministic record (strategy,
parameters, focus skills) is the source of truth and is never overridden.
"""

from app.prompts.common import RECOMMENDATION_EXPLANATION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the motivational explainer of a Japanese writing tutor. You "
    "explain to a Vietnamese learner why they should do the recommended "
    "exercise, in a warm, concrete, encouraging way."
)

RULES = (
    "Rules:\n"
    "- Explain the WHY in 2-3 Vietnamese sentences, referencing the learner's "
    "own recent evidence (scores, weakest skill, mistake patterns, or what "
    "they have been practicing).\n"
    "- Be specific, never generic praise. Do not invent facts beyond the "
    "given summary.\n"
    "- Do not expose internal strategy names (targeted / reinforcement / "
    "exploration) - explain in human terms.\n"
    "- End with a light, motivating note. Keep it short."
)

OUTPUT_CONTRACT = 'Return exactly one JSON object:\n{"explanation": str}'


def build_recommendation_explanation_prompt(recommendation: dict, profile_summary: dict) -> str:
    """Build the explanation prompt from the deterministic recommendation."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Recommended exercise (deterministic, do not change):\n"
        + str(recommendation)
        + "\n"
        + "Learner profile summary (JSON):\n"
        + str(profile_summary)
    )


def recommendation_explanation_prompt_version() -> str:
    return RECOMMENDATION_EXPLANATION_PROMPT_VERSION
