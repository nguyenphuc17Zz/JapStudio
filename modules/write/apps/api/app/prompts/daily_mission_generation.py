"""Daily mission generation prompt (Phase 7, stage 1).

Version: daily_mission_generation:v1

Creates today's mission from the Phase 6 learner state. The target count is
clamped by code to the learner's daily target; the mission must be grounded
in real weaknesses/registers, never random.
"""

from app.prompts.common import DAILY_MISSION_GENERATION_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the daily mission module of a Japanese writing tutor. Based on "
    "the learner's deterministic profile, you design ONE focused mission for "
    "today for a Vietnamese learner."
)

RULES = (
    "Rules:\n"
    "- mission_type values: practice (general daily practice), "
    "weakness_focus (train the weakest skill), register_focus (practice a "
    "register the learner avoids), challenge_mix (mix exercises and challenges).\n"
    "- Ground everything in the learner state provided. Never invent progress, "
    "strengths or weaknesses.\n"
    "- target_count: propose a realistic number of exercises for today; it will "
    "be clamped to the learner's daily target by code.\n"
    "- focus_skills: 1-3 skills (grammar, vocabulary, naturalness, semantic, "
    "context_fit, register_fit).\n"
    "- register values: casual, polite, business, mixed.\n"
    "- difficulty: 1-10, close to the learner's current level.\n"
    "- reason: one or two concise Vietnamese sentences citing the learner's own "
    "evidence. Never expose internal reasoning.\n"
    "- title: short Vietnamese title (max ~8 words). description: 1-3 "
    "Vietnamese sentences explaining what to do and why."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"mission_type": "practice"|"weakness_focus"|"register_focus"|"challenge_mix", '
    '"title": str, "description": str, "target_count": int 1-20, '
    '"focus_skills": [str], "topic": str, "register": str, '
    '"difficulty": int 1-10, "reason": str}'
)


def build_daily_mission_prompt(profile_summary: dict, recent_missions: list[str]) -> str:
    """Build the mission prompt from deterministic learner state."""
    recent_block = ""
    if recent_missions:
        recent_block = (
            "Recent mission titles (do not repeat the same mission):\n"
            + "\n".join(f"- {title}" for title in recent_missions[:5])
            + "\n"
        )
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Learner profile summary (JSON):\n"
        + str(profile_summary)
        + "\n"
        + recent_block
    )


def daily_mission_prompt_version() -> str:
    return DAILY_MISSION_GENERATION_PROMPT_VERSION
