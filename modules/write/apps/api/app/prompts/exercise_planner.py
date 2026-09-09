"""Planner prompt: decides what exercise to generate (topic, type, register,
difficulty, length)."""

from app.prompts.common import (
    EXERCISE_PLANNER_PROMPT_VERSION,
    MEANING_PRINCIPLE,
    format_recent_items,
)
from app.prompts.topics import format_topic_taxonomy
from app.schemas.exercise import ExerciseGenerationRequest

PLANNER_SYSTEM = (
    "You are the exercise planner of a Japanese writing tutor for Vietnamese "
    "learners. You decide WHAT to generate.\n"
    "Your job is to choose an exercise type, a topic and subtopic, a register, "
    "a JLPT level, a difficulty (1-10) and a target length.\n"
    f"{MEANING_PRINCIPLE}\n"
    "- Prefer varied, meaningful, realistic topics; avoid repeating recent topics "
    "when the user did not ask for a specific one.\n"
    "- The register must fit the kind of situation the topic suggests (casual "
    "talk with friends, polite talk with colleagues/elders, business language "
    "with customers or management). Only use 'mixed' when a situation genuinely "
    "mixes registers.\n"
    "- For free_writing exercises choose paragraph or long_writing.\n"
    "- The difficulty (1-10) must be coherent with the JLPT level: N5 ~ 1-3, "
    "N4 ~ 3-5, N3 ~ 5-7, N2 ~ 7-9, N1 ~ 8-10. Do not treat JLPT as the only "
    "difficulty axis.\n"
    "Respond with the JSON object only."
)


def build_planner_prompt(
    preferences: ExerciseGenerationRequest | None,
    *,
    recent_topics: list[str],
    memory_block: str = "",
) -> tuple[str, str]:
    """Return (system, user) prompt for the planner stage."""
    user_lines: list[str] = []
    if preferences and any(
        [
            preferences.exercise_type,
            preferences.topic,
            preferences.register,
            preferences.jlpt_level,
            preferences.difficulty,
            preferences.target_length,
        ]
    ):
        user_lines.append("The learner has these preferences (respect them):")
        if preferences.exercise_type:
            user_lines.append(f"- exercise_type: {preferences.exercise_type.value}")
        if preferences.topic:
            user_lines.append(f"- topic: {preferences.topic}")
        if preferences.register:
            user_lines.append(f"- register: {preferences.register.value}")
        if preferences.jlpt_level:
            user_lines.append(f"- jlpt_level: {preferences.jlpt_level.value}")
        if preferences.difficulty:
            user_lines.append(f"- difficulty: {preferences.difficulty}")
        if preferences.target_length:
            user_lines.append(f"- target_length: {preferences.target_length.value}")
    else:
        user_lines.append("The learner has no preferences. Choose appropriate values yourself.")
    user_lines.append("")
    user_lines.append(format_topic_taxonomy())
    user_lines.append("")
    recent = format_recent_items(
        "Topics used recently (avoid repeating them unless the learner asked for one)",
        recent_topics,
    )
    if recent:
        user_lines.append(recent)
    if memory_block:
        user_lines.append("")
        user_lines.append("Learner memories (context only):")
        user_lines.append(memory_block)
    user_lines.append(
        "Choose your plan and output the JSON object with fields: "
        "exercise_type, topic, subtopic, register, jlpt_level, difficulty, target_length."
    )
    return PLANNER_SYSTEM, "\n".join(user_lines).strip()


def planner_prompt_version() -> str:
    return EXERCISE_PLANNER_PROMPT_VERSION
