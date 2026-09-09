"""Memory conflict detection prompt (Phase 12).

Version: memory_conflict_detection:v1

Classifies a conflict between a new candidate and an existing memory. An
explicit user memory always wins over AI inference deterministically (before
this stage runs); this stage only disambiguates inferred-vs-inferred and
preference-change vs contextual differences.
"""

from app.prompts.common import MEMORY_CONFLICT_DETECTION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the memory conflict detector of a Japanese writing tutor. You "
    "classify whether a new memory contradicts an existing one, refines it, "
    "is merely a different context, or reflects a genuine preference change."
)

RULES = (
    "Rules:\n"
    "- verdict values: contradiction (one is wrong), refinement (new is a more "
    "precise/correct version), contextual (both are true in different "
    "situations), preference_change (the learner genuinely changed).\n"
    "- 'Prefers business Japanese for work' vs 'Prefers casual Japanese with "
    "friends' is contextual, NOT a contradiction.\n"
    "- winning_memory_id: the existing memory id that should win, or null to "
    "let the deterministic resolver decide.\n"
    "- resolution_note: one concise Vietnamese sentence."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"verdict": "contradiction"|"refinement"|"contextual"|"preference_change", '
    '"winning_memory_id": str|null, "resolution_note": str}'
)


def build_memory_conflict_prompt(new_memory: dict, existing_memory: dict) -> str:
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "New memory (JSON):\n"
        + str(new_memory)
        + "\n\n"
        + "Existing memory (JSON):\n"
        + str(existing_memory)
    )


def memory_conflict_detection_prompt_version() -> str:
    return MEMORY_CONFLICT_DETECTION_PROMPT_VERSION
