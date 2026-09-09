"""Memory context selection prompt (Phase 12).

Version: memory_context_selection:v1

Optional AI refinement of deterministic retrieval. The deterministic
``DeterministicMemoryRetriever`` ranks memories by importance + confidence +
recency + frequency + task relevance and is the default path (Phase 12 does
not use vector search). This stage is available for future opt-in refinement
and is registered so provenance is complete.
"""

from app.prompts.common import MEMORY_CONTEXT_SELECTION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the memory context selector of a Japanese writing tutor. From a "
    "ranked list of the learner's memories, you select only the ones relevant "
    "to the current AI task."
)

RULES = (
    "Rules:\n"
    "- Keep the selection small and task-specific; never return the whole list.\n"
    "- Prefer explicit preferences and recurring patterns over one-off events.\n"
    "- selected_memory_ids: the ids that are relevant, in priority order."
)

OUTPUT_CONTRACT = (
    'Return exactly one JSON object:\n{"selected_memory_ids": [str], "rationale": str}'
)


def build_memory_context_selection_prompt(task_type: str, memories: list[dict]) -> str:
    memory_block = (
        "\n".join(
            f"- [{memory.get('id')}] ({memory.get('category')}/{memory.get('type')}, "
            f"importance={memory.get('importance')}) {memory.get('content')}"
            for memory in memories
        )
        if memories
        else "(none)"
    )
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + f"Current task type: {task_type}\n\n"
        + "Ranked memories:\n"
        + memory_block
    )


def memory_context_selection_prompt_version() -> str:
    return MEMORY_CONTEXT_SELECTION_PROMPT_VERSION
