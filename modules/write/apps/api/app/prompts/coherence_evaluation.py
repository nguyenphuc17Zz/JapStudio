"""Coherence evaluation prompt section (long-form discourse stage).

Coherence judges the text as a connected unit: one central topic, every
sentence contributing to it, a conclusion that follows, and no
contradictions. This section participates in the combined
``discourse_analysis`` call and can be replaced independently.
"""

from app.prompts.common import DISCOURSE_ISSUE_CATEGORIES

COHERENCE_EVALUATION_SECTION = (
    "Coherence - evaluate the WHOLE text as a connected unit, never as a "
    "list of independent sentences:\n"
    "- Is there one clear central topic, and does every sentence support it?\n"
    "- Do any sentences contradict each other or the exercise context?\n"
    "- Does the conclusion (if any) follow from what came before?\n"
    "- Detect topic drift: e.g. a paragraph about a busy workday that "
    "suddenly describes the weather. Drift lowers coherence/topic "
    "consistency; it is NOT a grammar problem.\n"
    "Score coherence_score (0-100) and pick coherence_classification from "
    "excellent (85-100), good (70-84), acceptable (50-69), weak (25-49), "
    "poor (0-24).\n"
    "Output topic_consistency_classification: consistent / minor_drift / "
    "major_drift.\n"
    "Discourse issues for this dimension use categories from: "
    f"{DISCOURSE_ISSUE_CATEGORIES}."
)


def build_coherence_section() -> str:
    return COHERENCE_EVALUATION_SECTION


def coherence_evaluation_prompt_version() -> str:
    from app.prompts.common import COHERENCE_EVALUATION_PROMPT_VERSION

    return COHERENCE_EVALUATION_PROMPT_VERSION
