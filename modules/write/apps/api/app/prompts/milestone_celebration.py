"""Milestone celebration prompt (Phase 7, stage 4).

Version: milestone_celebration:v1

Personalized celebration for an achieved milestone. The milestone metric is
real and passed in; the AI must not invent progress.
"""

from app.prompts.common import MILESTONE_CELEBRATION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the celebration narrator of a Japanese writing tutor. You write "
    "a short, warm Vietnamese celebration message when a learner reaches a "
    "milestone. You reference ONLY real metrics passed to you."
)

RULES = (
    "Rules:\n"
    "- Reference the milestone and the real metrics provided (counts, streak "
    "days, score deltas). Never invent numbers.\n"
    "- 1-3 Vietnamese sentences. Adult, encouraging, specific - never generic "
    "cheerleading ('Great job! Keep going!' is forbidden).\n"
    "- If a real improvement metric is provided, mention it specifically."
)

OUTPUT_CONTRACT = 'Return exactly one JSON object:\n{"message": str}'


def build_milestone_celebration_prompt(milestone: dict, real_metrics: dict) -> str:
    """Build the celebration prompt from the milestone + real metrics."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Milestone:\n"
        + str(milestone)
        + "\n\n"
        + "Real metrics (JSON):\n"
        + str(real_metrics)
    )


def milestone_celebration_prompt_version() -> str:
    return MILESTONE_CELEBRATION_PROMPT_VERSION
