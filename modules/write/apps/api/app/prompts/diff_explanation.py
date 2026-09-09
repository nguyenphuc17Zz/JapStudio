"""Linguistic diff explanation prompt (Phase 19).

Analyzes differences between two Japanese sentences, explains why each
chunk changed from a grammatical and stylistic perspective, and rates
whether the modification improved the sentence.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    DIFF_EXPLANATION_PROMPT_VERSION,
)

DIFF_SYSTEM = (
    "You are an expert Japanese grammarian and linguistic diff analyzer.\n"
    "Compare the 'before' and 'after' Japanese sentences.\n\n"
    "TASKS:\n"
    "1. CHUNK DIFF: Break down the differences into logical linguistic chunks "
    "(type: 'equal', 'insert', 'delete', 'replace'). For every non-equal chunk, "
    "provide a precise grammatical/stylistic rationale in Vietnamese (e.g. 'Đổi trợ từ は sang が để đánh dấu chủ ngữ trong mệnh đề phụ').\n"
    "2. IMPROVEMENT RATING: Rate if 'after' improved on 'before' (significantly_improved, "
    "improved, partially_improved, unchanged, regressed), estimate score delta, "
    "and provide a summary rationale in Vietnamese.\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Respond with a JSON object containing:\n"
    "- before (string)\n"
    "- after (string)\n"
    "- chunks (list of objects with: type, before_text, after_text, rationale_vi)\n"
    "- improvement_status (string: significantly_improved|improved|partially_improved|unchanged|regressed)\n"
    "- quality_delta (int)\n"
    "- summary_rationale_vi (string)\n"
)


def build_diff_explanation_prompt(
    before: str, after: str
) -> tuple[str, str]:
    """Return prompt for generating linguistic diff explanation."""
    user_lines = [
        f"Original sentence (Before): {before}",
        f"Modified sentence (After): {after}",
        "",
        "Break down the linguistic chunks with grammatical rationales and rate the improvement.",
    ]
    return DIFF_SYSTEM, "\n".join(user_lines).strip()


def diff_explanation_prompt_version() -> str:
    return DIFF_EXPLANATION_PROMPT_VERSION
