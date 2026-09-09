"""Learning planner prompt (Phase 6, stage 3).

Version: learning_planner:v1

Proposes exercise parameters for the next recommended practice. The
strategy itself is chosen deterministically in code; the AI proposes the
exercise details, which the code then validates and adjusts (difficulty/JLPT
stepping limits, recent-topic variety, duplicate prevention).
"""

from app.prompts.common import LEARNING_PLANNER_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the planning module of a Japanese writing tutor. Based on a "
    "learner profile and a chosen learning strategy, you propose the next "
    "practice exercise for a Vietnamese learner."
)

RULES = (
    "Rules:\n"
    "- The strategy is fixed (targeted / reinforcement / exploration); you "
    "propose exercise parameters that best serve it.\n"
    "- targeted: target the learner's weakest skill with a focused exercise; "
    "difficulty slightly above current (but within max difficulty step).\n"
    "- reinforcement: consolidate recently improved skills; difficulty at or "
    "just below current comfort; reuse a register/topic the learner has "
    "recently practiced.\n"
    "- exploration: broaden range; pick a register or topic NOT in the "
    "recently practiced list; difficulty no higher than current.\n"
    "- exercise_type values: sentence_translation, multi_sentence_translation, "
    "paragraph_translation, free_writing, register_challenge.\n"
    "- register values: casual, polite, business, mixed.\n"
    "- jlpt_level: one of N5/N4/N3/N2/N1 (keep within max JLPT step).\n"
    "- target_length values: short_sentence, sentence, multi_sentence, "
    "paragraph, long_writing.\n"
    "- focus_skills: 1-3 skills this exercise should train (grammar, "
    "vocabulary, naturalness, semantic, context_fit, register_fit).\n"
    "- reason: one or two concise Vietnamese sentences citing the learner's "
    "own evidence (their recent scores, weakest skill, or patterns). Never "
    "expose internal reasoning, only the conclusion.\n"
    "- Never propose a topic from the recently practiced list unless no "
    "alternative remains."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"strategy": "targeted"|"reinforcement"|"exploration", '
    '"planned_exercise": {"exercise_type": str, "topic": str, "register": str, '
    '"jlpt_level": "N5"|"N4"|"N3"|"N2"|"N1", "difficulty": int 1-10, '
    '"target_length": str, "focus_skills": [str]}, '
    '"reason": str}'
)


def build_learning_planner_prompt(
    strategy: str, profile_summary: dict, recent_topics: list[str], memory_block: str = ""
) -> str:
    """Build the planner prompt from the deterministic strategy + profile."""
    recent_block = (
        "Recently practiced topics (avoid these):\n"
        + "\n".join(f"- {topic}" for topic in recent_topics[:10])
        + "\n"
        if recent_topics
        else ""
    )
    memory_section = (
        "Learner memories (context only):\n" + memory_block + "\n" if memory_block else ""
    )
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + f"Chosen strategy: {strategy}\n\n"
        + "Learner profile summary (JSON):\n"
        + str(profile_summary)
        + "\n"
        + recent_block
        + memory_section
    )


def learning_planner_prompt_version() -> str:
    return LEARNING_PLANNER_PROMPT_VERSION
