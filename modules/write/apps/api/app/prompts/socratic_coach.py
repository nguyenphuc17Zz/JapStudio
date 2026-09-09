"""Socratic AI Writing Coach prompt (Phase 19).

Provides contextual, pattern-oriented coaching that teaches the underlying
grammar rule rather than simply handing over the answer. References learner
weaknesses, failed attempts, and mastery level.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    SOCRATIC_COACH_PROMPT_VERSION,
)

SOCRATIC_COACH_SYSTEM = (
    "You are a master Socratic Japanese Writing Coach for Vietnamese learners.\n"
    "Your objective is to help the learner discover and master the underlying "
    "Japanese pattern or rule, NOT simply give away direct answers.\n\n"
    "COACHING PRINCIPLES:\n"
    "1. Socratic method: Ask guiding questions, point out nuances, and explain "
    "why certain structures or particles clash in Japanese thinking.\n"
    "2. Context Awareness: Address the learner's specific weakness, reference "
    "their previous failed attempts to explain why those attempts missed the mark, "
    "and tailor explanations to their current JLPT level.\n"
    "3. Conciseness: Keep responses under 600 characters, in clear, engaging Vietnamese.\n"
    "4. Pattern Highlight: Provide an abstract formula/pattern when helpful.\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Respond with a JSON object containing:\n"
    "- answer (string, max 600 chars, Vietnamese)\n"
    "- pattern_highlight (string or null)\n"
    "- why_previous_failed_vi (string or null)\n"
    "- suggestions (list of 2-3 follow-up question strings)\n"
)


def build_socratic_coach_prompt(
    question: str,
    original_text: str | None = None,
    target_concept: str | None = None,
    current_weakness: str | None = None,
    failed_attempts: list[str] | None = None,
    mastery_level: str | None = None,
    profile_block: str = "",
    memory_block: str = "",
) -> tuple[str, str]:
    """Return prompt for Socratic coach."""
    user_lines = [f"Learner's Question: {question}"]
    if original_text:
        user_lines.append(f"Sentence under discussion: {original_text}")
    if target_concept:
        user_lines.append(f"Target concept/pattern: {target_concept}")
    if current_weakness:
        user_lines.append(f"Learner's current weakness area: {current_weakness}")
    if mastery_level:
        user_lines.append(f"Target JLPT level / mastery: {mastery_level}")
    if failed_attempts:
        user_lines.append("Learner's recent failed attempts:")
        for idx, fa in enumerate(failed_attempts, 1):
            user_lines.append(f"  Attempt {idx}: {fa}")
    if profile_block:
        user_lines.append(f"Learner Profile:\n{profile_block}")
    if memory_block:
        user_lines.append(f"Context Memories:\n{memory_block}")
    user_lines.append("")
    user_lines.append("Teach the underlying pattern and guide the learner Socratically.")
    return SOCRATIC_COACH_SYSTEM, "\n".join(user_lines).strip()


def socratic_coach_prompt_version() -> str:
    return SOCRATIC_COACH_PROMPT_VERSION
