"""Cohesion, flow and redundancy evaluation prompt section (long-form).

Cohesion: how sentences connect (discourse markers, reference chains,
clause relationships). Flow: reading rhythm and pacing. Redundancy: whether
the same meaning is repeated without adding value. These three dimensions
participate in the combined ``discourse_analysis`` call.
"""

from app.prompts.common import (
    DISCOURSE_ISSUE_CATEGORIES,
    DISCOURSE_MARKER_GUIDANCE,
)

COHESION_EVALUATION_SECTION = (
    "Cohesion - how smoothly sentences connect:\n"
    f"{DISCOURSE_MARKER_GUIDANCE}\n"
    "- Flag a missing transition ONLY when the jump genuinely hurts "
    "understanding; never demand connectors.\n"
    "- Check pronoun/reference continuity and は/が selection across "
    "sentence boundaries.\n"
    "Flow - reading rhythm and pacing:\n"
    "- Choppy sentence rhythm, abrupt idea jumps, information dumped without "
    "buildup, or sentences of monotonous identical shape lower flow.\n"
    "- Flow issues are about pacing, not grammar.\n"
    "Redundancy - unnecessary repetition of the same meaning:\n"
    "- Example: とても忙しかったです。 followed by 仕事がたくさんあって、"
    "とても忙しかったです。 repeats the same information.\n"
    "- Do NOT penalize rhetorical or emphatic repetition (e.g. an intentional "
    "parallel structure).\n"
    "- A higher redundancy_score means LESS unnecessary repetition.\n"
    "Score cohesion_score, flow_score, redundancy_score (each 0-100).\n"
    "Discourse issues for these dimensions use categories from: "
    f"{DISCOURSE_ISSUE_CATEGORIES}."
)


def build_cohesion_section() -> str:
    return COHESION_EVALUATION_SECTION


def cohesion_evaluation_prompt_version() -> str:
    from app.prompts.common import COHESION_EVALUATION_PROMPT_VERSION

    return COHESION_EVALUATION_PROMPT_VERSION
