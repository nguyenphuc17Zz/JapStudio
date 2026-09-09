"""Vocabulary candidate validation prompt (Phase 5, stage 2).

Version: vocabulary_validation:v1

Approves or rejects one candidate, corrects unreliable fields, and detects
whether the candidate is the same lexical item as an existing bank entry
(inflected forms, variant spellings) - deterministic normalized-equality is
handled in code, this stage covers what code cannot decide.
"""

from app.prompts.common import (
    VOCABULARY_VALIDATION_PROMPT_VERSION,
    format_recent_items,
)

SYSTEM_INSTRUCTION = (
    "You are the quality gate of a Japanese vocabulary bank. A candidate "
    "vocabulary item extracted from a learner's writing attempt must be "
    "checked before it is saved."
)

VALIDATION_RULES = (
    "Check the candidate against these rules and approve only if ALL hold:\n"
    "- The expression is real, correctly written Japanese (no invented words, "
    "no wrong kanji, no broken collocations).\n"
    "- The reading (if provided) matches the expression.\n"
    "- The Vietnamese meaning is accurate.\n"
    "- The register label (if any) is justified by the usage context.\n"
    "- The JLPT estimate and difficulty are plausible.\n"
    "- The item is genuinely useful for a Vietnamese learner, not trivial.\n"
    "- The example sentence is natural and uses the expression correctly.\n"
    "When a field is wrong, fix it via the corrected_* fields instead of "
    "rejecting the whole item, UNLESS the core item itself is wrong.\n"
    "If the candidate is the same lexical item as one of the existing bank "
    "expressions (an inflected form, variant spelling, or the same word inside "
    "a collocation), set duplicate_of to that existing expression (write it "
    "exactly as stored) and approved=false. Do NOT set duplicate_of for "
    "distinct items that merely share a stem.\n"
    "rejected_reason must be a short Vietnamese explanation when rejecting.\n"
    "confidence: how confident you are after checking - use low when you "
    "cannot verify the reading/meaning."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"approved": bool, "duplicate_of": str|null, '
    '"rejected_reason": str|null, "corrected_expression": str|null, '
    '"corrected_reading": str|null, "corrected_meaning_vi": str|null, '
    '"corrected_jlpt_level": "N5"|"N4"|"N3"|"N2"|"N1"|null, '
    '"corrected_difficulty": int 1-10|null, "corrected_register": str|null, '
    '"confidence": "high"|"medium"|"low"}'
)


def build_vocabulary_validation_prompt(
    candidate: dict, existing_expressions: list[str], max_existing: int = 40
) -> str:
    """Build the stage-2 validation prompt for one candidate."""
    existing_block = format_recent_items(
        "Existing vocabulary bank expressions (for duplicate detection)",
        existing_expressions,
        max_items=max_existing,
    )
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + VALIDATION_RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + existing_block
        + "Candidate to validate (JSON):\n"
        + str(candidate)
    )


def vocabulary_validation_prompt_version() -> str:
    return VOCABULARY_VALIDATION_PROMPT_VERSION
