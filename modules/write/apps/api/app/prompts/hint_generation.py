"""Hint generation prompt (stage 5).

Progressive hints that guide the learner toward noticing their own issues.
Hints become progressively more explicit; the full correction is NEVER
revealed here (the reveal endpoint owns that).
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    HINT_GENERATION_PROMPT_VERSION,
    format_exercise_input,
)

HINT_SYSTEM = (
    "You are the hint writer of a Japanese writing tutor for Vietnamese "
    "learners. Given the learner's answer and the detected issues, write 3-5 "
    "progressive hints that help the learner find their own mistakes.\n"
    "Rules:\n"
    "- Hint 1: vague - point to the area to examine (e.g. 'Hãy kiểm tra trợ "
    'từ trước "会社".\').\n'
    '- Each next hint is more explicit, e.g. \'Suy nghĩ xem "は" đang làm '
    "gì trong câu này.' then 'Hãy thử đánh dấu \"昨日\" làm chủ đề.'\n"
    "- The LAST hint still must NOT contain the complete corrected sentence.\n"
    "- Focus on the most meaningful issues only; skip trivial ones.\n"
    "- Hints in Vietnamese, referencing the learner's actual answer.\n"
    "- If the answer is excellent, hints can be small polish suggestions or "
    "encouragement plus one refinement point.\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Output the JSON object with field: hints (list of 3-5 strings).\n"
    "Respond with the JSON object only."
)


def build_hint_prompt(
    exercise: object,
    answer_text: str,
    *,
    issues: list[object],
    scores: object | None = None,
) -> tuple[str, str]:
    """Return (system, user) prompt for the hint stage."""
    issue_lines = []
    for issue in issues:
        issue_lines.append(
            f"- [{issue.severity} / {issue.category}] {issue.original_text}: {issue.explanation}"
        )
    user_lines = [
        format_exercise_input(exercise),
        "",
        "The learner's Japanese answer:",
        answer_text,
        "",
        "Detected issues (write hints around these, without giving away the full correction):",
    ]
    user_lines.extend(issue_lines or ["- no significant issues"])
    user_lines.append("")
    user_lines.append("Output the JSON object with field: hints (list of 3-5 strings).")
    return HINT_SYSTEM, "\n".join(user_lines).strip()


def hint_prompt_version() -> str:
    return HINT_GENERATION_PROMPT_VERSION
