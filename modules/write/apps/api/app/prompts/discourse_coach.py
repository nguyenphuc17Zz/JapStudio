"""AI writing coach prompt (long-form discourse stage).

The coach is a contextual panel, not a general chatbot: it answers bounded
questions about the learner's own draft, its evaluation, the exercise and
the learner's profile. It never exposes chain-of-thought.
"""

from app.prompts.common import DISCOURSE_COACH_PROMPT_VERSION, MEANING_PRESERVATION_RULES

DISCOURSE_COACH_SYSTEM = (
    "You are the writing coach inside a Japanese writing tutor for "
    "Vietnamese learners. You help this learner improve THIS draft.\n"
    "Scope:\n"
    "- Answer ONLY questions about the learner's draft, the exercise, the "
    "evaluation feedback, or general Japanese writing technique relevant to "
    "this draft.\n"
    "- Keep answers concise (max 600 chars), educational, in Vietnamese "
    "(Japanese examples are fine).\n"
    "- NEVER reveal hidden reasoning or chain-of-thought; give the final, "
    "helpful answer directly.\n"
    "- If the question is off-topic (other subjects, code, news...), politely "
    "redirect to writing.\n"
    f"{MEANING_PRESERVATION_RULES}\n"
    "Output the JSON object with fields: answer (string, Vietnamese, max 600 "
    "chars), suggestions (list of 2-3 follow-up questions the learner could "
    "ask next).\n"
    "Respond with the JSON object only."
)


def build_discourse_coach_prompt(
    exercise: object,
    draft: str,
    summary: str,
    dimension_scores: dict[str, int],
    issue_summary: str,
    profile_block: str,
    vocabulary_block: str,
    question: str,
    memory_block: str = "",
) -> tuple[str, str]:
    """Return (system, user) prompt for the coach stage."""
    user_lines = [
        "Exercise:",
        f"- register: {exercise.register.value}",
        f"- topic: {exercise.topic}",
        f"- prompt (Vietnamese): {exercise.prompt_vi}",
        "",
        "The learner's current draft:",
        draft,
        "",
        "Evaluation summary:",
        f"- summary: {summary}",
        "- discourse dimensions: "
        + ", ".join(f"{k}={v}" for k, v in sorted(dimension_scores.items())),
        f"- key issues: {issue_summary or 'none'}",
    ]
    if profile_block:
        user_lines += ["", "Learner profile:", profile_block]
    if vocabulary_block:
        user_lines += ["", "Recently learned vocabulary:", vocabulary_block]
    if memory_block:
        user_lines += ["", "Learner memories (context only):", memory_block]
    user_lines += [
        "",
        f"The learner asks: {question}",
        "",
        "Output the JSON object with fields: answer, suggestions.",
    ]
    return DISCOURSE_COACH_SYSTEM, "\n".join(user_lines).strip()


def discourse_coach_prompt_version() -> str:
    return DISCOURSE_COACH_PROMPT_VERSION
