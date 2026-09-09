"""Memory extraction prompt (Phase 12).

Version: memory_extraction:v1

Proposes candidate memories from one learning event (an evaluation, a
vocabulary result, a scenario outcome or a simulation summary). The AI only
proposes structured candidates; deterministic code validates the taxonomy,
rejects weak observations and merges duplicates — the model never writes
directly to the learner's memory.
"""

from app.prompts.common import MEMORY_EXTRACTION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the memory module of a Japanese writing tutor. From a single "
    "learning event you propose durable, useful memories about a Vietnamese "
    "learner. You never invent facts that the event does not support."
)

CATEGORIES = (
    "category values (pick the closest; never invent a new one):\n"
    "- preference: a stable learner preference (register, topic, style).\n"
    "- learning_pattern: a repeated way the learner approaches writing.\n"
    "- mistake_pattern: a recurring error or weakness.\n"
    "- successful_pattern: something the learner now does well consistently.\n"
    "- vocabulary_memory: a useful qualitative note about a word/expression.\n"
    "- expression_memory: a note about a specific expression or phrasing.\n"
    "- scenario_memory: insight from a scenario practice.\n"
    "- simulation_memory: insight from a conversation simulation.\n"
    "- goal_memory: the learner's current goal or target.\n"
    "- style_preference: a preferred writing style.\n"
    "- milestone_memory: a notable achievement or turning point."
)

RULES = (
    "Rules:\n"
    "- type values: semantic (stable fact), episodic (a specific dated event), "
    "pattern (a repeated behavior), preference (an explicit preference).\n"
    "- content: ONE concise Vietnamese sentence (max ~200 chars), concrete and "
    "evidence-based. Never 'User is bad at X' — prefer 'User showed a "
    "business-register issue in one exercise.'\n"
    "- confidence: high only with strong, unambiguous evidence; medium for a "
    "single clear observation; low for weak signals (low-confidence memories "
    "are usually dropped).\n"
    "- importance (1-10): 7-10 for recurring mistakes, explicit preferences or "
    "strong patterns; 4-6 for useful context; 1-3 for one-off weak events.\n"
    "- evidence: list the source identifiers provided in the input. Never "
    "include raw learner writing, full text or private data.\n"
    "- Do not duplicate the learner profile numbers (scores, JLPT band) as "
    "memory; memory holds qualitative context only.\n"
    "- Return an empty candidate_memories list when nothing noteworthy is "
    "supported by the event."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"candidate_memories": [{"category": str, "type": str, "content": str, '
    '"confidence": "high"|"medium"|"low", "importance": int 1-10, '
    '"evidence": [{"source_type": str, "source_id": str|null}]}]}'
)


def build_memory_extraction_prompt(source_type: str, source_id: str | None, context: dict) -> str:
    """Build the extraction prompt from one learning event."""
    context_block = (
        "\n".join(f"- {key}: {value}" for key, value in (context or {}).items())
        if context
        else "(no additional context)"
    )
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + CATEGORIES
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + f"Event source type: {source_type}\n"
        + f"Event source id: {source_id or 'n/a'}\n\n"
        + "Learning event context (JSON):\n"
        + context_block
    )


def memory_extraction_prompt_version() -> str:
    return MEMORY_EXTRACTION_PROMPT_VERSION
