"""Challenge generation prompt (Phase 7, stage 2).

Version: challenge_generation:v1

Produces ONE challenge grounded in the learner's weaknesses, recent errors,
recent vocabulary and session. The type is chosen deterministically in code
(rotating, avoiding recent repeats); the AI fills in the content.
"""

from app.prompts.common import CHALLENGE_GENERATION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the challenge module of a Japanese writing tutor. You create "
    "ONE short, focused writing challenge for a Vietnamese learner based on "
    "their actual learning state."
)

RULES = (
    "Rules:\n"
    "- challenge types:\n"
    "  * naturalness: 'Rewrite this sentence more naturally.'\n"
    "  * register: 'Convert this casual sentence into business/polite Japanese.'\n"
    "  * vocabulary: 'Write a sentence using <expression>.' (required_expression "
    "must come from the learner's recent vocabulary list)\n"
    "  * compression: 'Express the same meaning more concisely.'\n"
    "  * expansion: 'Turn this sentence into a more detailed sentence.'\n"
    "  * nuance: 'Express \"not necessarily...\" naturally.'\n"
    "  * error_fix: 'Correct the specific mistake detected in your previous "
    "answer.' (source_text must be the learner's own mistaken answer)\n"
    "- instruction_vi: one or two Vietnamese sentences telling the learner "
    "exactly what to do.\n"
    "- source_text: Japanese text the learner works from (a natural sentence, "
    "a casual sentence, a vocabulary expression context, or the learner's own "
    "mistaken answer).\n"
    "- objective: short Vietnamese description of what success looks like.\n"
    "- target_skill: grammar, vocabulary, naturalness, semantic, context_fit, "
    "or register_fit - the skill this challenge trains.\n"
    "- difficulty: 1-10 aligned with the learner's level.\n"
    "- Never invent vocabulary expressions; for vocabulary challenges use "
    "required_expression from the provided list."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"type": "naturalness"|"register"|"vocabulary"|"compression"|"expansion"|'
    '"nuance"|"error_fix", "instruction_vi": str, "source_text": str, '
    '"target_skill": str, "difficulty": int 1-10, "objective": str, '
    '"required_expression": str|null}'
)


def build_challenge_generation_prompt(
    *,
    challenge_type: str,
    weaknesses: list[str],
    recent_errors: list[str],
    recent_vocabulary: list[str],
    recent_challenges: list[str],
    profile_summary: dict,
) -> str:
    """Build the challenge prompt from the deterministic selection."""

    def block(label: str, items: list[str]) -> str:
        if not items:
            return ""
        return f"{label}:\n" + "\n".join(f"- {item}" for item in items[:8]) + "\n"

    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + f"Challenge type to create: {challenge_type}\n\n"
        + "Learner profile summary (JSON):\n"
        + str(profile_summary)
        + "\n"
        + block("Learner's recent mistakes (for error_fix)", recent_errors)
        + block("Learner's recent vocabulary (use for vocabulary challenges)", recent_vocabulary)
        + block("Recently completed challenge types (avoid repeating the same)", recent_challenges)
    )


def challenge_generation_prompt_version() -> str:
    return CHALLENGE_GENERATION_PROMPT_VERSION
