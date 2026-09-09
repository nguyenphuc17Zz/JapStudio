"""Memory resolution prompt (Phase 12).

Version: memory_resolution:v1

Final decision between two conflicting memories. The deterministic resolver
already guarantees explicit user memories win; this stage exists for the
registry and for optional AI-assisted resolution of inferred conflicts.
"""

from app.prompts.common import MEMORY_RESOLUTION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the memory resolver of a Japanese writing tutor. You choose the "
    "final disposition between two conflicting memories."
)

RULES = (
    "Rules:\n"
    "- final_decision values: keep_existing, replace (new wins), keep_both "
    "(both are true in different contexts).\n"
    "- Explicit user memories always outrank inferred memories.\n"
    "- reason: one concise Vietnamese sentence."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"final_decision": "keep_existing"|"replace"|"keep_both", '
    '"winning_memory_id": str|null, "reason": str}'
)


def build_memory_resolution_prompt(new_memory: dict, existing_memory: dict, conflict: dict) -> str:
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
        + "\n\n"
        + "Conflict classification (JSON):\n"
        + str(conflict)
    )


def memory_resolution_prompt_version() -> str:
    return MEMORY_RESOLUTION_PROMPT_VERSION
