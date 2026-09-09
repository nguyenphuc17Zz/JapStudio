"""Structure suggestion prompt (long-form discourse stage).

Optional writing templates for long writing (Opinion / Business report /
Experience story) and paragraph-level reordering advice. The template is a
suggestion, never a requirement; this module is independently replaceable
and feeds the synthesis stage.
"""

from app.prompts.common import STRUCTURE_SUGGESTION_PROMPT_VERSION

STRUCTURE_SUGGESTION_SYSTEM = (
    "You are the structure advisor of a Japanese writing tutor for Vietnamese "
    "learners.\n"
    "Given the learner's text and its organization analysis:\n"
    "- If a clear reorder would help, describe it with sentence indexes "
    "(0-based), e.g. 'Đưa câu 2 xuống cuối làm kết luận, mở đầu bằng câu 3.'\n"
    "- If the target_length is long_writing AND a template genuinely fits the "
    "content, suggest ONE of: opinion (quan điểm - lý do - phản biện - kết "
    "luận), business_report (bối cảnh - diễn biến - kết quả - đề xuất), "
    "experience_story (bối cảnh - sự kiện chính - cảm nhận - kết luận).\n"
    "- Return null when the structure is already fine or a template would be "
    "forced.\n"
    "Output the JSON object with fields: reorder_advice (string|null), "
    "template (string|null), template_reason (string|null).\n"
    "Respond with the JSON object only."
)


def build_structure_suggestion_prompt(
    sentences: list[str], organization_notes: str | None
) -> tuple[str, str]:
    """Return (system, user) prompt for the structure suggestion stage."""
    numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(sentences))
    user_lines = ["The learner's Japanese text (index: text):", numbered]
    if organization_notes:
        user_lines += ["", f"Organization notes: {organization_notes}"]
    user_lines += [
        "",
        "Output the JSON object with fields: reorder_advice, template, template_reason.",
    ]
    return STRUCTURE_SUGGESTION_SYSTEM, "\n".join(user_lines).strip()


def structure_suggestion_prompt_version() -> str:
    return STRUCTURE_SUGGESTION_PROMPT_VERSION
