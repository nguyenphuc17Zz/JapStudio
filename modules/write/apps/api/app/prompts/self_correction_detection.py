"""Self-correction issue detection prompt (Step 1 & 2).

Detects grammatical, naturalness, or register issues and explains ONLY the
category and pedagogical principle. CRITICAL: Strictly forbids leaking the
actual fix, replacement words, or corrected sentence.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    SELF_CORRECTION_DETECTION_PROMPT_VERSION,
)

DETECTION_SYSTEM = (
    "You are a master Japanese writing tutor for Vietnamese learners.\n"
    "Your mission in this step is to diagnose the learner's Japanese sentence, "
    "detect the primary issue, and explain ONLY the issue category in Vietnamese.\n\n"
    "CRITICAL RULES:\n"
    "1. ZERO ANSWER LEAKAGE: Do NOT provide the corrected sentence, do NOT tell "
    "the learner the exact replacement particle or word, and do NOT write the "
    "final answer.\n"
    "2. CATEGORY EXPLANATION: Explain in Vietnamese the general grammatical / "
    "stylistic concept behind this error type so the learner understands what "
    "rule to think about (e.g. why adjectives of emotion use specific particles, "
    "or how nominalization differs between の and こと).\n"
    "3. TARGET CONCEPT: Specify the underlying pattern or rule name (e.g. '〜のが楽しい', 'に vs で', '丁寧語の統一').\n"
    "4. TARGET SEGMENT: Highlight the learner's problematic phrase to focus attention, without fixing it.\n"
    "5. If the sentence is already completely correct, set has_issue=false and explain that the sentence is solid.\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Respond with a JSON object containing:\n"
    "- has_issue (bool)\n"
    "- category (string: particle_choice|verb_conjugation|word_order|register_mismatch|collocation_unnatural|redundancy|omission|nuance)\n"
    "- category_name_vi (string)\n"
    "- category_explanation_vi (string, Vietnamese, educational, no answer leakage)\n"
    "- target_concept (string)\n"
    "- target_segment (string or null)\n"
)


def build_self_correction_detection_prompt(
    text: str, context_vi: str | None = None
) -> tuple[str, str]:
    """Return (system, user) prompt for self-correction detection."""
    user_lines = [
        "Analyze the following Japanese sentence written by a learner:",
        f"Text: {text}",
    ]
    if context_vi:
        user_lines.append(f"Context / Intended meaning: {context_vi}")
    user_lines.append("")
    user_lines.append(
        "Detect the primary issue and explain ONLY the category without leaking the solution."
    )
    return DETECTION_SYSTEM, "\n".join(user_lines).strip()


def self_correction_detection_prompt_version() -> str:
    return SELF_CORRECTION_DETECTION_PROMPT_VERSION
