"""Curriculum Enrichment prompts (Phase 22).

Three prompt builders for the AI Enrichment Layer:
  1. build_task_enrichment_prompt    — generate concrete writing task descriptions
  2. build_priority_reason_prompt    — rewrite terse priority reasons as learner-friendly text
  3. build_session_debrief_prompt    — generate a short post-session summary

All prompts are compact (≤ 800 tokens context), structured-output friendly,
and version-tagged for telemetry.
"""

from __future__ import annotations

from typing import Any

CURRICULUM_ENRICHMENT_TASK_VERSION = "curriculum_enrichment_task:v1"
CURRICULUM_ENRICHMENT_REASON_VERSION = "curriculum_enrichment_reason:v1"
CURRICULUM_ENRICHMENT_DEBRIEF_VERSION = "curriculum_enrichment_debrief:v1"


# ---------------------------------------------------------------------------
# 1. Task description enrichment
# ---------------------------------------------------------------------------


def build_task_enrichment_prompt(
    tasks: list[dict[str, Any]],
    profile_summary: dict[str, Any],
) -> str:
    """Build a prompt that asks the AI to generate concrete task descriptions.

    The AI receives the deterministic task skeleton and must return a
    ``task_description`` and ``reason`` for each task in JSON format.

    Args:
        tasks:           List of serialised PlanTask dicts (without AI content).
        profile_summary: Learner profile summary (JLPT, goal, weaknesses …).
    """
    jlpt = (
        profile_summary.get("estimated_jlpt", {}).get("max_level")
        or profile_summary.get("target_jlpt")
        or "N4"
    )
    goal = profile_summary.get("goal") or "giao tiếp tiếng Nhật tự nhiên"

    task_lines = []
    for i, t in enumerate(tasks, start=1):
        task_lines.append(
            f"{i}. task_id={t.get('task_id','')} | type={t.get('task_type','')} "
            f"| category={t.get('category','')} | subtype={t.get('subtype','')} "
            f"| context={t.get('context_type','')} | register={t.get('register','')} "
            f"| jlpt={t.get('jlpt_level','')} | bucket={t.get('bucket','')}"
        )
    tasks_text = "\n".join(task_lines)

    return f"""Bạn là một giáo viên tiếng Nhật chuyên thiết kế bài luyện viết cá nhân hóa.

Hồ sơ học viên:
- Mục tiêu: {goal}
- JLPT hiện tại: {jlpt}

Dưới đây là danh sách nhiệm vụ viết đã được hệ thống xác định (theo logic deterministic).
Nhiệm vụ của bạn là sinh ra nội dung THỰC TẾ, CỤ THỂ cho mỗi nhiệm vụ.

{tasks_text}

Yêu cầu:
- Mỗi task_description phải là một bài viết cụ thể (tình huống, độ dài, trọng tâm).
- Ví dụ tốt: "Viết email xin nghỉ phép gửi trưởng phòng, 3 câu, tránh lẫn ます và だ."
- Ví dụ xấu (quá chung): "Luyện viết về văn phong."
- reason phải giải thích ngắn gọn TẠI SAO nhiệm vụ này được chọn cho học viên này.
- Viết bằng tiếng Việt, tự nhiên, thân thiện.
- Độ dài task_description: 1–2 câu. Độ dài reason: 1 câu.

Trả về JSON array (không markdown):
[
  {{"task_id": "...", "task_description": "...", "reason": "..."}},
  ...
]

Chỉ trả về JSON array, không giải thích thêm.
"""


# ---------------------------------------------------------------------------
# 2. Priority reason enrichment
# ---------------------------------------------------------------------------


def build_priority_reason_prompt(
    ranked: list[dict[str, Any]],
    profile_summary: dict[str, Any],
) -> str:
    """Build a prompt that rewrites terse priority reasons as learner-friendly text.

    Args:
        ranked:          List of serialised RankedWeakness dicts.
        profile_summary: Learner profile summary.
    """
    goal = profile_summary.get("goal") or "giao tiếp tiếng Nhật tự nhiên"

    weakness_lines = []
    for i, w in enumerate(ranked, start=1):
        weakness_lines.append(
            f"{i}. weakness_id={w.get('weakness_id','')} | "
            f"category={w.get('category','')} | subtype={w.get('subtype','')} | "
            f"recurrence={w.get('recurrence_count',0)} | "
            f"mastery={w.get('mastery_score',0.0):.0%} | "
            f"severity={w.get('severity','')} | "
            f"score={w.get('priority_score',0):.1f} | "
            f"current_reason={w.get('priority_reason','')}"
        )
    weaknesses_text = "\n".join(weakness_lines)

    return f"""Bạn là một giáo viên tiếng Nhật am hiểu tâm lý học viên.

Mục tiêu học viên: {goal}

Dưới đây là danh sách điểm yếu được hệ thống xác định với lý do ưu tiên dạng kỹ thuật.
Hãy viết lại mỗi priority_reason thành văn xuôi THÂN THIỆN, RÕ RÀNG cho học viên đọc hiểu.

{weaknesses_text}

Yêu cầu:
- 1–2 câu, tiếng Việt tự nhiên.
- Giải thích cụ thể vì sao lỗi này quan trọng với MỤC TIÊU của học viên.
- Không dùng từ kỹ thuật như "recurrence_count", "mastery_score".
- Ví dụ tốt: "Trong 4 bài gần nhất bạn vẫn trộn ます và だ khi viết email — lỗi dễ bị nhà tuyển dụng chú ý nhất."
- Ví dụ xấu: "Độ ưu tiên cao vì recurrence=4 và mastery=0.2."

Trả về JSON array:
[
  {{"weakness_id": "...", "priority_reason": "..."}},
  ...
]

Chỉ trả về JSON array, không giải thích thêm.
"""


# ---------------------------------------------------------------------------
# 3. Session debrief
# ---------------------------------------------------------------------------


def build_session_debrief_prompt(
    completed_tasks: list[dict[str, Any]],
    profile_summary: dict[str, Any],
) -> str:
    """Build a prompt for a short post-session summary.

    Args:
        completed_tasks: List of completed PlanTask dicts.
        profile_summary: Learner profile summary.
    """
    goal = profile_summary.get("goal") or "giao tiếp tiếng Nhật tự nhiên"
    completed_count = len(completed_tasks)

    task_lines = []
    for t in completed_tasks:
        cat = t.get("category") or "khám phá"
        sub = t.get("subtype") or ""
        ctx = t.get("context_type", "")
        label = f"{cat}/{sub}" if sub else cat
        task_lines.append(f"- {label} trong ngữ cảnh {ctx}")
    tasks_text = "\n".join(task_lines) if task_lines else "- (không có nhiệm vụ hoàn thành)"

    return f"""Bạn là một giáo viên tiếng Nhật đang tổng kết buổi học.

Học viên vừa hoàn thành {completed_count} nhiệm vụ viết:
{tasks_text}

Mục tiêu của học viên: {goal}

Viết một đoạn tổng kết ngắn (2–4 câu, tiếng Việt tự nhiên) bao gồm:
1. Xác nhận những gì học viên đã làm được.
2. Điểm cải thiện đáng chú ý (nếu có pattern).
3. Gợi ý tập trung cho ngày mai (một điểm cụ thể).

Ngắn gọn, khích lệ, thực tế. Không hoa mỹ quá.

Trả về JSON object:
{{"debrief": "..."}}

Chỉ trả về JSON object, không giải thích thêm.
"""


# ---------------------------------------------------------------------------
# Version helpers
# ---------------------------------------------------------------------------


def curriculum_enrichment_task_version() -> str:
    return CURRICULUM_ENRICHMENT_TASK_VERSION


def curriculum_enrichment_reason_version() -> str:
    return CURRICULUM_ENRICHMENT_REASON_VERSION


def curriculum_enrichment_debrief_version() -> str:
    return CURRICULUM_ENRICHMENT_DEBRIEF_VERSION
