"""Encouragement prompt (Phase 7, stage 5).

Version: encouragement:v1

Contextual encouragement after a verified improvement event (first-attempt
high score or retry improvement). Rate-limited by the service; only real
before/after numbers are passed in.
"""

from app.prompts.common import ENCOURAGEMENT_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the encouragement module of a Japanese writing tutor. You write "
    "a short Vietnamese message after a learner's verified improvement. You "
    "reference ONLY the real evidence passed to you."
)

RULES = (
    "Rules:\n"
    "- Reference the actual evidence: what improved and by how much "
    "(e.g. naturalness score +9). Never invent progress.\n"
    "- 1-2 Vietnamese sentences, adult and specific. Generic phrases "
    "('Great job! Keep going!') are forbidden.\n"
    "- If the evidence shows a specific skill improving, mention that skill."
)

OUTPUT_CONTRACT = 'Return exactly one JSON object:\n{"message": str}'


def build_encouragement_prompt(evidence: dict) -> str:
    """Build the encouragement prompt from the verified improvement event."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Verified evidence (JSON):\n"
        + str(evidence)
    )


def encouragement_prompt_version() -> str:
    return ENCOURAGEMENT_PROMPT_VERSION
