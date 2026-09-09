"""Prompt builders for targeted writing drill generation and evaluation (Phase 18).

Builds prompts for:
1. Generating an adaptive, multi-stage drill sequence testing transfer of learning.
2. Evaluating a learner's attempt with semantic, nuance, and contrastive feedback.
3. Debriefing a completed drill session with actionable insights.
"""

from __future__ import annotations

import json
from typing import Any

from app.models.writing_intelligence import WritingWeakness

WRITING_DRILL_GENERATOR_VERSION = "writing_drill_generation:v1"
DRILL_EVALUATION_VERSION = "drill_evaluation:v1"
DRILL_DEBRIEF_VERSION = "drill_debrief:v1"


def writing_drill_generator_prompt_version() -> str:
    return WRITING_DRILL_GENERATOR_VERSION


def drill_evaluation_prompt_version() -> str:
    return DRILL_EVALUATION_VERSION


def drill_debrief_prompt_version() -> str:
    return DRILL_DEBRIEF_VERSION


_SYSTEM_DRILL_GENERATOR = """You are an expert Japanese writing pedagogue specializing in targeted remedial drill design.
Your mission is to turn specific learner writing weaknesses into highly focused, adaptive practice sessions.

CRITICAL PEDAGOGICAL PRINCIPLES:
1. NEVER generic: The drill must zero in directly on the learner's specific weakness subtype and root cause.
2. GUIDED -> FREE PROGRESSION:
   - Stage 1 (Heavy Guidance): Provide structural blueprint, word choices, clear explanation, and progressive hints.
   - Stage 2 (Light Guidance): Provide partial skeleton and key pattern hint.
   - Stage 3 (Minimal Guidance): Provide target constraint only, no structural skeleton.
   - Stage 4 (No Guidance): Free production/application in a novel context to test independent transfer.
3. VARIETY & TRANSFER OF LEARNING:
   - DO NOT repeat identical sentences or vocabulary from prior mistakes.
   - Each item in the sequence MUST use new vocabulary, new subjects, and distinct situational contexts (e.g. workplace email, line chat, journal, customer reply) while testing the EXACT same underlying learning target.
4. NATURAL JAPANESE: All Japanese answers, alternatives, and options must be 100% natural native Japanese (no translationese).
5. VIETNAMESE EXPLANATIONS: All titles, instructions, explanations, and hints must be in Vietnamese.
"""

_SYSTEM_DRILL_EVALUATOR = """You are an expert Japanese writing coach evaluating a learner's targeted drill response.
Evaluate the learner's response with precision, empathy, and pedagogical depth:
1. Check if the learner accurately applied the target grammar/collocation/register constraint.
2. Do not reject valid, natural alternative phrasings; accept equivalent expressions.
3. Provide contrastive nuance analysis (nuance_contrast) explaining why any awkward phrasing sounds unnatural vs native usage.
4. Give constructive, encouraging feedback in Vietnamese.
"""

_SYSTEM_DRILL_DEBRIEF = """You are a Japanese writing coach reviewing a completed targeted drill session.
Synthesize the learner's attempts across the 4 stages, assess how effectively they broke their prior error habit, and provide an encouraging, actionable next step in Vietnamese.
"""


def build_writing_drill_prompt(
    weakness: WritingWeakness | dict[str, Any],
    mastery_score: float = 0.0,
    user_level: str = "N3",
    prior_evidence: list[str] | None = None,
    register: str = "polite",
    context_domain: str | None = None,
    recent_mistakes: list[str] | None = None,
    vocabulary_profile: list[str] | None = None,
    selected_drill_types: list[str] | None = None,
) -> tuple[str, str]:
    """Builds (system_prompt, user_prompt) for generating a targeted drill sequence."""
    category = getattr(weakness, "category", None) or (
        weakness.get("category") if isinstance(weakness, dict) else "grammar"
    )
    subtype = getattr(weakness, "subtype", None) or (
        weakness.get("subtype") if isinstance(weakness, dict) else "particles"
    )
    description = getattr(weakness, "description", None) or (
        weakness.get("description") if isinstance(weakness, dict) else ""
    )
    examples = getattr(weakness, "examples", None) or (
        weakness.get("examples") if isinstance(weakness, dict) else []
    )

    drill_types_str = (
        ", ".join(selected_drill_types)
        if selected_drill_types
        else "recognition, correction, rewrite, free_response"
    )
    prior_ev_str = (
        "\n".join(f"- {e}" for e in (prior_evidence or examples or [])[:5])
        or "Chưa có ví dụ trước đó."
    )
    recent_mistakes_str = "\n".join(f"- {m}" for m in (recent_mistakes or [])[:3]) or "Không có."
    vocab_str = ", ".join((vocabulary_profile or [])[:10]) or "Từ vựng cấp độ " + user_level

    user_prompt = f"""Tạo một chuỗi bài tập luyện viết mục tiêu (Targeted Writing Drill) cho học viên tiếng Nhật:

THÔNG TIN ĐIỂM YẾU:
- Nhóm: {category}
- Phân loại lỗi cụ thể: {subtype}
- Mô tả: {description}
- Điểm tinh thông hiện tại: {mastery_score:.2f} / 1.00
- Cấp độ JLPT mục tiêu: {user_level}
- Thể văn phong ưu tiên: {register}
- Bối cảnh gợi ý: {context_domain or "Giao tiếp công việc & Đời sống Nhật Bản"}

BẰNG CHỨNG LỖI CŨ (Tránh lặp lại nguyên văn câu này, dùng để hiểu bẫy tư duy của học viên):
{prior_ev_str}

LỖI GẦN ĐÂY:
{recent_mistakes_str}

TỪ VỰNG THAM KHẢO CHO NGƯỜI HỌC:
{vocab_str}

CÁC DẠNG BÀI TẬP CẦN SỬ DỤNG CHO CHUỖI NÀY (theo thứ tự 4 giai đoạn):
{drill_types_str}

YÊU CẦU ĐẦU RA:
Sinh đúng 3 đến 5 bài tập nhỏ (items) theo đúng trình tự từ Stage 1 (Heavy Guidance) đến Stage 4 (No Guidance / Free Production).
Mỗi bài phải có bối cảnh mới, từ vựng mới nhưng giữ nguyên quy tắc cần rèn luyện ({subtype}).
"""
    return _SYSTEM_DRILL_GENERATOR, user_prompt


def build_drill_evaluation_prompt(
    item: dict[str, Any],
    user_answer: str,
    attempt_number: int = 1,
) -> tuple[str, str]:
    """Builds (system_prompt, user_prompt) for evaluating a single drill response."""
    user_prompt = f"""Đánh giá câu trả lời bài tập luyện viết mục tiêu của học viên:

THÔNG TIN BÀI TẬP:
- Dạng bài: {item.get("drill_type")}
- Giai đoạn (Stage): {item.get("stage")} ({item.get("guidance_level")})
- Trọng tâm rèn luyện: {item.get("target_focus")}
- Yêu cầu bài tập: {item.get("instructions_vi")}
- Bối cảnh: {item.get("context_description")}
- Đề bài / Câu nguồn: {item.get("source_text")}
- Câu đáp án chuẩn mẫu: {item.get("target_answer")}
- Các biến thể tự nhiên chấp nhận được: {json.dumps(item.get("accepted_alternatives", []), ensure_ascii=False)}
- Giải thích chuẩn: {item.get("explanation")}

CÂU TRẢ LỜI CỦA HỌC VIÊN (Lượt thử #{attempt_number}):
"{user_answer}"

YÊU CẦU:
1. Đánh giá xem học viên có áp dụng đúng trọng tâm ({item.get("target_focus")}) không.
2. Chấm điểm từ 0 đến 100 (>= 75 là is_correct = True).
3. Đưa ra nhận xét phản hồi (feedback_vi), đối chiếu sắc thái (nuance_contrast) nếu học viên dùng từ chưa tự nhiên, và câu sửa mẫu (corrected_text).
"""
    return _SYSTEM_DRILL_EVALUATOR, user_prompt


def build_drill_debrief_prompt(
    weakness_info: dict[str, Any],
    items_summary: list[dict[str, Any]],
    attempts_summary: list[dict[str, Any]],
    average_score: float,
) -> tuple[str, str]:
    """Builds (system_prompt, user_prompt) for debriefing a completed session."""
    user_prompt = f"""Tổng kết phiên luyện viết mục tiêu:

ĐIỂM YẾU MỤC TIÊU:
- Phân loại: {weakness_info.get("category")} / {weakness_info.get("subtype")}
- Mô tả: {weakness_info.get("description")}

KẾT QUẢ CÁC BÀI ĐÃ LÀM:
- Điểm trung bình: {average_score:.1f}/100
- Tóm tắt các bài: {json.dumps(items_summary, ensure_ascii=False)}
- Các lượt nộp bài: {json.dumps(attempts_summary, ensure_ascii=False)}

YÊU CẦU:
Tạo bản nhận xét tổng kết (debrief_vi) đánh giá sự chuyển biến tư duy của học viên qua 4 giai đoạn và gợi ý bước tiếp theo (next_step_vi).
"""
    return _SYSTEM_DRILL_DEBRIEF, user_prompt
