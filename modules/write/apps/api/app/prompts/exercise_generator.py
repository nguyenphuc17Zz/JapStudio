"""Generator prompt: produces the context, the natural Vietnamese prompt and
the difficulty sub-metrics for a planned exercise."""

from app.prompts.common import (
    EXERCISE_GENERATOR_PROMPT_VERSION,
    MEANING_PRINCIPLE,
    NATURAL_VIETNAMESE_RULES,
    OUTPUT_INSTRUCTION,
    STYLE_EXAMPLES,
)
from app.schemas.exercise_ai import ExercisePlan

GENERATOR_SYSTEM = (
    "You are the content writer of a Japanese writing tutor for Vietnamese "
    "learners. You generate the EXERCISE CONTENT in Vietnamese.\n"
    f"{NATURAL_VIETNAMESE_RULES}\n"
    f"{STYLE_EXAMPLES}\n"
    f"{MEANING_PRINCIPLE}\n"
    f"{OUTPUT_INSTRUCTION}\n"
    "Fields you must fill:\n"
    "- context: the situation in Vietnamese (1-3 short sentences) that makes the "
    "exercise meaningful.\n"
    "- prompt_vi: the actual Vietnamese prompt the learner must convert into "
    "Japanese. It MUST strictly adhere to the requested target_length and exercise_type "
    "(e.g., a full 3-5 sentence paragraph for 'paragraph', 2-3 connected sentences for 'multi_sentence', "
    "or a single concise sentence for 'short_sentence'). Naturally phrased in authentic Vietnamese.\n"
    "- grammar_complexity (1-10), vocabulary_complexity (1-10), "
    "context_complexity (1-10), naturalness_target (1-10): rate what the "
    "prompt really requires. These four scores must be consistent with the "
    "planned difficulty (roughly within +/-3).\n"
    "- key_vocabulary: list of 2-5 key Japanese vocabulary words/phrases (expression, reading, meaning_vi) "
    "needed to translate this prompt that the learner might need assistance with.\n"
    "Respond with the JSON object only."
)


def _length_guidance(target_length: str, exercise_type: str) -> str:
    if target_length == "paragraph" or exercise_type == "paragraph_translation":
        return (
            "CRITICAL INSTRUCTION - PARAGRAPH FORMAT REQUIRED:\n"
            "- Target Japanese length: ~260 characters (3 to 5 sentences).\n"
            "- The prompt_vi field MUST BE A FULL PARAGRAPH OF 3 TO 5 VIETNAMESE SENTENCES (around 120-220 Vietnamese words).\n"
            "- Structure: Opening context/greeting -> Main body/explanation -> Call to action or concluding sentence.\n"
            "- Example of a good paragraph prompt_vi:\n"
            "  \"Em chào anh Tanaka. Em gửi email này để báo cáo tiến độ tuần qua của dự án A. Về phần API thì nhóm em đã hoàn thành 90%, chỉ còn một số lỗi nhỏ liên quan đến phân quyền đang được xử lý. Dự kiến đến thứ Năm tuần sau sẽ hoàn tất kiểm thử và phát hành bản thử nghiệm. Nếu anh có thời gian, nhờ anh xem qua tài liệu đính kèm giúp em nhé. Em cảm ơn anh nhiều.\"\n"
            "- FORBIDDEN: Writing only 1 single short sentence or phrase is strictly prohibited."
        )
    elif target_length == "multi_sentence" or exercise_type == "multi_sentence_translation":
        return (
            "CRITICAL INSTRUCTION - MULTI-SENTENCE FORMAT REQUIRED:\n"
            "- Target Japanese length: ~160 characters (2 to 3 sentences).\n"
            "- The prompt_vi field MUST BE 2 TO 3 CONNECTED VIETNAMESE SENTENCES showing logical sequence or cause-and-effect.\n"
            "- FORBIDDEN: Generating only 1 single sentence."
        )
    elif target_length == "short_sentence":
        return (
            "CRITICAL INSTRUCTION - SHORT SENTENCE FORMAT REQUIRED:\n"
            "- Target Japanese length: ~40 characters.\n"
            "- The prompt_vi field MUST BE A SINGLE SHORT, CONCISE SENTENCE."
        )
    elif target_length == "sentence" or exercise_type == "sentence_translation":
        return (
            "CRITICAL INSTRUCTION - STANDARD SENTENCE FORMAT REQUIRED:\n"
            "- Target Japanese length: ~80 characters.\n"
            "- The prompt_vi field MUST BE A STANDARD FULL SENTENCE with appropriate clauses."
        )
    elif target_length == "long_writing" or exercise_type == "free_writing":
        return (
            "CRITICAL INSTRUCTION - LONG ESSAY / WRITING FORMAT REQUIRED:\n"
            "- Target Japanese length: 350+ characters.\n"
            "- The prompt_vi field MUST BE A DETAILED WRITING PROMPT WITH MULTIPLE GUIDELINES/QUESTIONS."
        )
    return ""


def build_generator_prompt(
    plan: ExercisePlan,
    *,
    issues: list[str] | None = None,
    similar_prompts: list[str] | None = None,
) -> tuple[str, str]:
    """Return (system, user) prompt for the generator stage.

    ``issues`` carries validator rejections and ``similar_prompts`` carries
    near-duplicate prompts from previous attempts, so regenerations avoid
    repeating rejected or duplicated content.
    """
    user_lines = [
        "Generate content for this plan:",
        f"- exercise_type: {plan.exercise_type.value}",
        f"- topic: {plan.topic}" + (f" / subtopic: {plan.subtopic}" if plan.subtopic else ""),
        f"- register: {plan.register.value}",
        f"- jlpt_level: {plan.jlpt_level.value}",
        f"- difficulty: {plan.difficulty}",
        f"- target_length: {plan.target_length.value}",
    ]
    length_note = _length_guidance(plan.target_length.value, plan.exercise_type.value)
    if length_note:
        user_lines.append("")
        user_lines.append(length_note)

    if issues:
        user_lines.append("")
        user_lines.append(
            "Previous attempt was rejected for these reasons (fix all of them):\n"
            + "\n".join(f"- {issue}" for issue in issues)
        )
    if similar_prompts:
        user_lines.append("")
        user_lines.append(
            "Your content must NOT be similar to these existing prompts:\n"
            + "\n".join(f"- {prompt}" for prompt in similar_prompts[:5])
        )
    user_lines.append("")
    user_lines.append(
        "Output the JSON object with fields: context, prompt_vi, "
        "grammar_complexity, vocabulary_complexity, context_complexity, naturalness_target, key_vocabulary."
    )
    return GENERATOR_SYSTEM, "\n".join(user_lines).strip()


def generator_prompt_version() -> str:
    return EXERCISE_GENERATOR_PROMPT_VERSION
