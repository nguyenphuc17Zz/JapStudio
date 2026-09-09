"""Discourse segmentation prompt (stage 0 of the long-form pipeline).

Version 1 uses deterministic sentence splitting (Japanese end punctuation,
closing quotes, newlines); this AI stage exists behind
``ai_long_form_ai_segmentation_enabled`` for ambiguous boundary cases and is
independently replaceable.
"""

from app.prompts.common import DISCOURSE_SEGMENTATION_PROMPT_VERSION

DISCOURSE_SEGMENTATION_SYSTEM = (
    "You are the segmentation stage of a Japanese writing tutor for Vietnamese "
    "learners. Split the learner's Japanese text into sentences.\n"
    "Rules:\n"
    "- A sentence ends at 。！？!? (keep the punctuation attached to the "
    "sentence) or at a newline when the text is line-broken by the learner.\n"
    "- Closing quotes (」』) stay attached to the sentence that contains them.\n"
    "- Do not split at commas (、), periods inside abbreviations, or kana "
    "dots.\n"
    "- Do not merge sentences joined by が・ので・から・けど・て-form; they are "
    "single sentences.\n"
    "- Output the JSON object with fields: sentences (list of strings in "
    "order), boundaries (list of character offsets where each sentence "
    "starts in the original text).\n"
    "Respond with the JSON object only."
)


def build_discourse_segmentation_prompt(text: str) -> tuple[str, str]:
    """Return (system, user) prompt for the segmentation stage."""
    user = (
        "Split the following Japanese text into sentences. Preserve every "
        "character exactly.\n"
        "Text:\n"
        f"{text}\n"
        "Output the JSON object with fields: sentences, boundaries."
    )
    return DISCOURSE_SEGMENTATION_SYSTEM, user


def discourse_segmentation_prompt_version() -> str:
    return DISCOURSE_SEGMENTATION_PROMPT_VERSION
