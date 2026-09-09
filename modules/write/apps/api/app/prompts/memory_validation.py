"""Memory validation prompt (Phase 12).

Version: memory_validation:v1

Decides how one candidate memory should be handled relative to existing
memories: accept as new, reject (unsupported category / weak evidence /
unsound), merge into an existing memory, or update it. Code enforces the
decision and always respects the deterministic taxonomy and confidence rules.
"""

from app.prompts.common import MEMORY_VALIDATION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the memory validator of a Japanese writing tutor. You decide how "
    "a proposed memory candidate should be handled relative to the learner's "
    "existing memories."
)

RULES = (
    "Rules:\n"
    "- action values: accept (new memory), reject (unsupported / weak / "
    "unsound), merge (fold into the matched existing memory), update (refresh "
    "an existing memory).\n"
    "- Reject a candidate whose content is not supported by its evidence, is a "
    "strong overgeneralization from a single weak event, or duplicates what "
    "the learner profile already tracks numerically.\n"
    "- Propose merge when the candidate clearly repeats an existing memory in "
    "the same category/type.\n"
    "- adjusted_confidence / adjusted_importance are optional overrides; leave "
    "them null to keep the code's deterministic confidence rules.\n"
    "- reason: one concise Vietnamese sentence explaining the decision."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"action": "accept"|"reject"|"merge"|"update", '
    '"matched_memory_id": str|null, "reason": str, '
    '"adjusted_confidence": "high"|"medium"|"low"|null, '
    '"adjusted_importance": int|null}'
)


def build_memory_validation_prompt(candidate: dict, existing_memories: list[dict]) -> str:
    """Build the validation prompt for one candidate vs existing memories."""
    existing_block = (
        "\n".join(
            f"- [{memory.get('id')}] ({memory.get('category')}/{memory.get('type')}) "
            f"{memory.get('content')}"
            for memory in existing_memories
        )
        if existing_memories
        else "(none)"
    )
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Candidate memory (JSON):\n"
        + str(candidate)
        + "\n\n"
        + "Existing memories in the same category/type:\n"
        + existing_block
    )


def memory_validation_prompt_version() -> str:
    return MEMORY_VALIDATION_PROMPT_VERSION
