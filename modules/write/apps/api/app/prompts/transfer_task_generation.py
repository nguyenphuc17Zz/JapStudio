"""Transfer task generation prompt (Step 7).

Generates a fresh, distinct scenario testing the exact same underlying concept
in a novel context. Reads learner profile and memories when available.
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    TRANSFER_TASK_GENERATION_PROMPT_VERSION,
)

TRANSFER_TASK_SYSTEM = (
    "You are an instructional designer for Japanese language acquisition.\n"
    "Your goal is to test TRANSFER OF LEARNING: given a target grammar concept "
    "or pattern that a learner just repaired, create a BRAND NEW, completely "
    "different context/situation prompt that requires the learner to apply "
    "the exact same structural pattern.\n\n"
    "EXAMPLE:\n"
    "- Learner just fixed: '私は日本語を勉強することが楽しいです。' -> pattern '〜のが楽しい'\n"
    "- Bad transfer (too similar): 'Tiếng Nhật rất vui'\n"
    "- Good transfer (distinct context): 'Hãy viết một câu diễn đạt việc tự tay chuẩn bị bữa sáng cuối tuần rất vui vẻ (sử dụng cấu trúc 〜のが[Tính từ])'\n\n"
    "RULES:\n"
    "1. Novel Context: The scenario must be completely distinct from the original text.\n"
    "2. Same Core Concept: It must require using the target pattern correctly.\n"
    "3. Prompt in Vietnamese: Clear, engaging prompt instructions.\n"
    "4. Connect to learner profile / interests if provided.\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Respond with a JSON object containing:\n"
    "- concept_tested (string)\n"
    "- scenario_prompt_vi (string, Vietnamese)\n"
    "- required_pattern (string)\n"
    "- context_hint_vi (string or null)\n"
)


def build_transfer_task_prompt(
    target_concept: str,
    original_text: str,
    profile_block: str = "",
    memory_block: str = "",
) -> tuple[str, str]:
    """Return prompt for generating a transfer task."""
    user_lines = [
        f"Target concept/pattern to test: {target_concept}",
        f"Original sentence the learner worked on: {original_text}",
    ]
    if profile_block:
        user_lines.append(f"Learner profile:\n{profile_block}")
    if memory_block:
        user_lines.append(f"Learner memories / context:\n{memory_block}")
    user_lines.append("")
    user_lines.append(
        "Generate a novel scenario prompt testing the same underlying pattern."
    )
    return TRANSFER_TASK_SYSTEM, "\n".join(user_lines).strip()


def transfer_task_generation_prompt_version() -> str:
    return TRANSFER_TASK_GENERATION_PROMPT_VERSION
