"""Organization evaluation prompt section (long-form discourse stage).

Organization judges the macro-structure: opening / development /
conclusion (intro / body / conclusion for long writing). This section
participates in the combined ``discourse_analysis`` call.
"""

from app.prompts.common import DISCOURSE_ISSUE_CATEGORIES

ORGANIZATION_EVALUATION_SECTION = (
    "Organization - the macro-structure of the text:\n"
    "- Short texts (multi_sentence / paragraph): check for a clear opening, "
    "a development, and a closing thought. Missing or misplaced parts lower "
    "organization_score.\n"
    "- Long writing (long_writing): additionally check intro / body / "
    "conclusion balance and paragraph-level arrangement.\n"
    "- Is the order of ideas logical? Would reordering (e.g. A -> C -> B "
    "becomes A -> B -> C) make it clearly better? If so, describe it in "
    "structure_reorder_advice (sentence indexes, 0-based) without requiring "
    "it.\n"
    "- Do NOT require a rigid template: an excellent text may omit an "
    "explicit opening as long as the reader is not lost.\n"
    "Score organization_score (0-100).\n"
    "Discourse issues for this dimension use categories from: "
    f"{DISCOURSE_ISSUE_CATEGORIES}."
)


def build_organization_section() -> str:
    return ORGANIZATION_EVALUATION_SECTION


def organization_evaluation_prompt_version() -> str:
    from app.prompts.common import ORGANIZATION_EVALUATION_PROMPT_VERSION

    return ORGANIZATION_EVALUATION_PROMPT_VERSION
