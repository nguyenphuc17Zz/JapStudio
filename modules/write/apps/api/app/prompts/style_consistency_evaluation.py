"""Style consistency evaluation prompt (long-form discourse stage, own call).

Style consistency judges whether the text keeps ONE coherent style and
register: です・ます vs だ・である mixing, accidental tone shifts, and
register mismatches against the exercise register. It runs as its own AI
call because it needs the exercise register and register notes.
"""

from app.prompts.common import (
    DISCOURSE_ISSUE_CATEGORIES,
    MEANING_PRESERVATION_RULES,
)

STYLE_CONSISTENCY_SYSTEM = (
    "You are the style and register consistency judge of a Japanese writing "
    "tutor for Vietnamese learners.\n"
    "Analyze the WHOLE text:\n"
    "- style_consistency_score (0-100): how consistently one style is "
    "maintained across sentences (です・ます vs だ・である vs である vs mixed "
    "within one register).\n"
    "- Accidental switching between styles is a style issue. An intentional "
    "style shift (e.g. quoted speech, dialogue, an emphatic aside) is NOT a "
    "problem - do not flag it.\n"
    "- register_fit: does the text match the exercise register? A business "
    "email that suddenly uses casual phrasing (お客様にご報告いたしました。"
    "でも、ちょっと無理でした。) is a register issue - but NEVER mark such a "
    "sentence as grammatically wrong; it is a style/register matter.\n"
    "Output register_notes (short Japanese/Vietnamese note about the dominant "
    "style and any shifts, max 500 chars).\n"
    "Discourse issues use categories from: "
    f"{DISCOURSE_ISSUE_CATEGORIES} (style / register).\n"
    f"{MEANING_PRESERVATION_RULES}\n"
    "Output the JSON object with fields: style_consistency_score (0-100), "
    "register_fit_score (0-100), register_notes, issues (list of {category, "
    "severity, sentence_index, sentence_range, explanation, suggested_fix}).\n"
    "Respond with the JSON object only."
)


def build_style_consistency_prompt(
    exercise: object, sentences: list[str], register_notes: str | None = None
) -> tuple[str, str]:
    """Return (system, user) prompt for the style consistency stage."""
    numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(sentences))
    user_lines = [
        "Exercise (the learner must express this meaning in Japanese):",
        f"- register: {exercise.register.value}",
        f"- jlpt_level: {exercise.jlpt_level.value}",
        f"- topic: {exercise.topic}",
        f"- prompt (Vietnamese): {exercise.prompt_vi}",
        "",
        "The learner's Japanese text, one sentence per line (index: text):",
        numbered,
    ]
    if register_notes:
        user_lines += ["", f"Known register notes: {register_notes}"]
    user_lines += [
        "",
        "Output the JSON object with fields: style_consistency_score, "
        "register_fit_score, register_notes, issues.",
    ]
    return STYLE_CONSISTENCY_SYSTEM, "\n".join(user_lines).strip()


def style_consistency_evaluation_prompt_version() -> str:
    from app.prompts.common import STYLE_CONSISTENCY_EVALUATION_PROMPT_VERSION

    return STYLE_CONSISTENCY_EVALUATION_PROMPT_VERSION
