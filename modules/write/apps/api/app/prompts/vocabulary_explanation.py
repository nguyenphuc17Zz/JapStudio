"""Vocabulary explanation prompt (Phase 5, stage 3).

Version: vocabulary_explanation:v1

Turns approved candidates into learner-oriented records: a personal "why you
should learn this" reason, usage notes, the final example sentence and
natural alternatives. Runs once per batch of approved candidates.
"""

from app.prompts.common import (
    VOCABULARY_EXPLANATION_PROMPT_VERSION,
)

SYSTEM_INSTRUCTION = (
    "You write the final learning record for vocabulary items that have just "
    "been approved for a Vietnamese learner's personal Vocabulary Bank."
)

EXPLANATION_RULES = (
    "For each item produce:\n"
    "- learning_reason: 1-3 Vietnamese sentences explaining why THIS learner "
    "should learn this item, referencing their own wording when provided "
    "(e.g. 'Bạn hay viết とても忙しい; trong ngữ cảnh công việc, 立て込む "
    "diễn tả tự nhiên hơn việc nhiều việc bị dồn lại.').\n"
    "- notes: optional Vietnamese usage notes (nuances, when to use, common "
    "mistakes).\n"
    "- example_sentence: a natural Japanese example sentence using the "
    "expression, close to the learner's context.\n"
    "- natural_alternatives: 0-3 natural Japanese alternatives.\n"
    "Never invent meanings or readings that were not in the candidate."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"explanations": [{"expression": str, "learning_reason": str, '
    '"notes": str|null, "example_sentence": str, "natural_alternatives": [str]}]}\n'
    "One entry per candidate, keyed by the exact expression given to you."
)


def build_vocabulary_explanation_prompt(candidates: list[dict]) -> str:
    """Build the stage-3 explanation prompt for approved candidates."""
    candidate_block = "\n".join(f"- {candidate}" for candidate in candidates)
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + EXPLANATION_RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\nApproved candidates to explain (JSON):\n"
        + candidate_block
    )


def vocabulary_explanation_prompt_version() -> str:
    return VOCABULARY_EXPLANATION_PROMPT_VERSION
