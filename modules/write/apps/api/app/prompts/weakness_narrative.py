"""Weakness Mastery Narrative Prompt (Phase 17).

Version: weakness_mastery_narrative:v1

Generates friendly, encouraging, learner-facing Vietnamese explanations
for a writing weakness's mastery status, context diversity, and next steps
based on deterministic evidence metrics.
"""

from typing import Any

from app.prompts.common import WEAKNESS_MASTERY_NARRATIVE_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are an encouraging, expert Japanese writing coach at Japanese Writing Studio. "
    "Your goal is to explain a learner's writing weakness and current mastery state in "
    "clear, supportive, non-intimidating Vietnamese. Do NOT show dry technical statistics; "
    "instead, translate the evidence into intuitive progress feedback."
)

RULES = (
    "NARRATIVE GUIDELINES:\n"
    "1. why_it_matters:\n"
    "   - State in 1 concise sentence why mastering this aspect matters for Japanese writing.\n"
    "   - E.g., 'Lỗi trợ từ khiến người đọc dễ hiểu sai vai trò chủ ngữ và tân ngữ trong câu.'\n"
    "2. current_mastery:\n"
    "   - Explain the current mastery status across guided exercises vs free writing contexts.\n"
    "   - E.g., 'Đúng trong bài tập dịch có hướng dẫn, nhưng chưa ổn định trong viết tự do.'\n"
    "3. evidence_text:\n"
    "   - Summarize the evidence in a human-friendly way (e.g. contexts attempted, days since error).\n"
    "   - E.g., 'Đã vượt qua 2/5 bối cảnh · 3 ngày không mắc lại lỗi này.'\n"
    "4. next_step:\n"
    "   - Recommend the next specific writing context or scheduled retest.\n"
    "   - E.g., 'Thử sức trong bài viết tự do hoặc tình huống thực tế tiếp theo.'\n"
    "5. Return strictly valid JSON conforming to the schema."
)


def build_weakness_narrative_prompt(
    category: str,
    subtype: str,
    description: str,
    lifecycle_state: str,
    evidence_data: dict[str, Any],
) -> str:
    """Build the AI prompt for weakness mastery narrative generation."""
    return (
        f"{SYSTEM_INSTRUCTION}\n\n"
        f"{RULES}\n\n"
        f"=== WEAKNESS & EVIDENCE DATA ===\n"
        f"- Category: {category}\n"
        f"- Subtype: {subtype}\n"
        f"- Description: {description}\n"
        f"- Lifecycle State: {lifecycle_state}\n"
        f"- Evidence Breakdown: {evidence_data}\n\n"
        f"Generate the 4-part learner-friendly Vietnamese narrative as JSON."
    )


def weakness_narrative_prompt_version() -> str:
    return WEAKNESS_MASTERY_NARRATIVE_PROMPT_VERSION
