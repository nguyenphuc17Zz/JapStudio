"""Simulation taxonomy and deterministic mappings (Phase 10).

No second taxonomy: every simulation type is DERIVED from the Phase 9
scenario dimensions (genre + audience + purpose). The AI never returns a
simulation type; ``simulation_type_for`` computes it deterministically in
code.

The module also owns the deterministic fallback materials used when the
planner or the turn generator fail: stage sequences, pressure conditions,
difficulty mapping and Japanese fallback messages.
"""

from __future__ import annotations

from typing import Any

SIMULATION_TYPES: list[str] = [
    "business_client",
    "business_internal",
    "customer_support",
    "meeting",
    "requirement_clarification",
    "bug_investigation",
    "deadline_negotiation",
    "apology_recovery",
    "casual_conversation",
    "opinion_discussion",
]

SIMULATION_TURN_TYPES: list[str] = [
    "opening",
    "question",
    "clarification",
    "objection",
    "negotiation",
    "confirmation",
    "correction",
    "escalation",
    "resolution",
    "closing",
]

PRESSURE_CONDITIONS: list[str] = [
    "normal",
    "time_pressure",
    "difficult_client",
    "unclear_requirement",
    "conflicting_request",
    "high_formality",
]

# Deterministic time-pressure difficulty level per pressure condition.
PRESSURE_TIME_PRESSURE: dict[str, int] = {
    "normal": 3,
    "time_pressure": 6,
    "difficult_client": 5,
    "unclear_requirement": 5,
    "conflicting_request": 6,
    "high_formality": 4,
}

# Simulation difficulty dimensions (distinct from the scenario difficulty
# metadata keys; values are derived from them, never created by the AI).
SIMULATION_DIFFICULTY_DIMENSIONS: list[str] = [
    "language_complexity",
    "context_complexity",
    "social_complexity",
    "negotiation_complexity",
    "ambiguity",
    "time_pressure",
]

# scenario difficulty_metadata key -> simulation dimension.
_SCENARIO_TO_SIMULATION_DIFFICULTY: dict[str, str] = {
    "language": "language_complexity",
    "context": "context_complexity",
    "audience": "social_complexity",
    "purpose": "negotiation_complexity",
    "constraint": "ambiguity",
}


def initial_difficulty(scenario: Any, pressure_condition: str) -> dict[str, int]:
    """Derive the initial simulation difficulty from the scenario metadata.

    Each dimension is clamped to 1..10; time_pressure comes from the
    pressure condition.
    """
    metadata = _attr(scenario, "difficulty_metadata") or {}
    result: dict[str, int] = {}
    for scenario_key, dimension in _SCENARIO_TO_SIMULATION_DIFFICULTY.items():
        value = _as_int(metadata.get(scenario_key), 5)
        result[dimension] = max(1, min(10, value))
    result["time_pressure"] = max(1, min(10, PRESSURE_TIME_PRESSURE.get(pressure_condition, 3)))
    return result


def simulation_type_for(scenario: Any) -> str:
    """Deterministically derive the simulation type from a WritingScenario.

    Ordered rules (first match wins); the scenario dimensions are always
    Phase 9 taxonomy values, so no new taxonomy exists.
    """
    genre = _attr(scenario, "genre") or ""
    audience = _attr(scenario, "audience") or ""
    purpose = _attr(scenario, "purpose") or ""
    if genre == "opinion":
        return "opinion_discussion"
    if audience in ("friend", "family"):
        return "casual_conversation"
    if genre == "requirement_clarification":
        return "requirement_clarification"
    if genre == "bug_report":
        return "bug_investigation"
    if genre == "apology":
        return "apology_recovery"
    if genre == "customer_response":
        return "customer_support"
    if genre == "meeting_followup":
        return "meeting"
    if audience in ("client", "vendor"):
        if purpose in ("persuade", "negotiate", "refuse", "request"):
            return "deadline_negotiation"
        return "business_client"
    return "business_internal"


# Deterministic stage sequences used when the AI planner fails (or as the
# baseline the planner may refine). Keys are simulation types; the shared
# fallback covers any unmapped type.
_DEFAULT_STAGES = [
    {"name": "opening", "goal": "Mở đầu cuộc trao đổi và nêu nhu cầu ban đầu."},
    {"name": "probe", "goal": "Trao đổi thông tin cần thiết để đạt mục tiêu."},
    {"name": "negotiate", "goal": "Xử lý phản đối, xác nhận hoặc thương lượng."},
    {"name": "confirm", "goal": "Chốt lại kết quả và bước tiếp theo."},
    {"name": "close", "goal": "Kết thúc cuộc trao đổi một cách tự nhiên."},
]

STAGE_SEQUENCES: dict[str, list[dict[str, str]]] = {
    "business_client": [
        {"name": "opening", "goal": "Chào hỏi và giới thiệu mục đích liên hệ."},
        {"name": "probe", "goal": "Làm rõ yêu cầu của khách hàng."},
        {"name": "negotiate", "goal": "Trao đổi điều kiện, tiến độ hoặc chi phí."},
        {"name": "confirm", "goal": "Xác nhận thỏa thuận và kế hoạch tiếp theo."},
        {"name": "close", "goal": "Kết thúc thư một cách lịch sự."},
    ],
    "business_internal": [
        {"name": "opening", "goal": "Trình bày nhu cầu/đề nghị nội bộ."},
        {"name": "probe", "goal": "Hỏi rõ thông tin, trạng thái hoặc trách nhiệm."},
        {"name": "negotiate", "goal": "Thống nhất cách xử lý và nguồn lực."},
        {"name": "confirm", "goal": "Chốt kế hoạch, thời hạn và người phụ trách."},
        {"name": "close", "goal": "Kết thúc trao đổi gọn gàng."},
    ],
    "customer_support": [
        {"name": "opening", "goal": "Tiếp nhận yêu cầu/vấn đề của khách hàng."},
        {"name": "probe", "goal": "Hỏi thêm thông tin để hiểu rõ vấn đề."},
        {"name": "negotiate", "goal": "Đề xuất giải pháp và thống nhất hướng xử lý."},
        {"name": "confirm", "goal": "Xác nhận cam kết xử lý và mốc thời gian."},
        {"name": "close", "goal": "Kết thúc bằng lời cảm ơn lịch sự."},
    ],
    "meeting": [
        {"name": "opening", "goal": "Xác nhận nội dung và mục đích cuộc họp."},
        {"name": "probe", "goal": "Trình bày và làm rõ từng mục trong chương trình."},
        {"name": "negotiate", "goal": "Thống nhất quyết định hoặc giải quyết bất đồng."},
        {"name": "confirm", "goal": "Chốt quyết định, hành động và người chịu trách nhiệm."},
        {"name": "close", "goal": "Kết thúc cuộc họp và xác nhận bước tiếp theo."},
    ],
    "requirement_clarification": [
        {"name": "opening", "goal": "Nêu yêu cầu cần làm rõ."},
        {"name": "probe", "goal": "Đặt câu hỏi làm rõ chi tiết yêu cầu."},
        {"name": "confirm", "goal": "Tóm tắt hiểu biết và xin xác nhận."},
        {"name": "close", "goal": "Chốt yêu cầu cuối cùng và bước tiếp theo."},
    ],
    "bug_investigation": [
        {"name": "opening", "goal": "Trình bày lỗi gặp phải."},
        {"name": "probe", "goal": "Hỏi thêm về môi trường, các bước tái hiện."},
        {"name": "negotiate", "goal": "Đề xuất hướng điều tra hoặc giải pháp tạm thời."},
        {"name": "confirm", "goal": "Chốt kế hoạch xử lý lỗi và thời hạn."},
        {"name": "close", "goal": "Kết thúc và xác nhận sẽ cập nhật."},
    ],
    "deadline_negotiation": [
        {"name": "opening", "goal": "Mở đầu về vấn đề thời hạn."},
        {"name": "probe", "goal": "Làm rõ tình hình và khó khăn."},
        {"name": "negotiate", "goal": "Đề xuất và thương lượng thời hạn mới."},
        {"name": "confirm", "goal": "Chốt thỏa thuận và cam kết."},
        {"name": "close", "goal": "Kết thúc với xác nhận cuối cùng."},
    ],
    "apology_recovery": [
        {"name": "opening", "goal": "Xin lỗi và nêu vấn đề đã xảy ra."},
        {"name": "probe", "goal": "Giải thích nguyên nhân và tác động."},
        {"name": "negotiate", "goal": "Đề xuất biện pháp khắc phục."},
        {"name": "confirm", "goal": "Xác nhận biện pháp và cam kết ngăn ngừa."},
        {"name": "close", "goal": "Kết thúc bằng lời xin lỗi lần nữa."},
    ],
    "casual_conversation": [
        {"name": "opening", "goal": "Mở đầu cuộc trò chuyện thân mật."},
        {"name": "probe", "goal": "Chia sẻ và hỏi thăm lẫn nhau."},
        {"name": "confirm", "goal": "Xác nhận hiểu biết chung."},
        {"name": "close", "goal": "Kết thúc tự nhiên."},
    ],
    "opinion_discussion": [
        {"name": "opening", "goal": "Nêu chủ đề và lấy ý kiến."},
        {"name": "probe", "goal": "Trao đổi ý kiến, ví dụ và lý do."},
        {"name": "negotiate", "goal": "Phản bác nhẹ nhàng và so sánh quan điểm."},
        {"name": "confirm", "goal": "Tổng kết quan điểm hai bên."},
        {"name": "close", "goal": "Kết thúc trò chuyện."},
    ],
}

DEFAULT_SIMULATION_TYPE = "business_internal"


def stages_for_type(simulation_type: str) -> list[dict[str, str]]:
    return [dict(stage) for stage in STAGE_SEQUENCES.get(simulation_type, _DEFAULT_STAGES)]


# Deterministic Japanese fallback messages per turn type (used only when the
# AI turn generator fails after retries). Phrased to be usable in any
# scenario; the learner can always answer with their own message.
FALLBACK_MESSAGES: dict[str, str] = {
    "opening": "こんにちは。少しお話したいことがあります。よろしくお願いします。",
    "question": "はい、ありがとうございます。もう少し詳しく教えていただけますか。",
    "clarification": (
        "すみません、少し確認させてください。ご要望はこういうことでよろしいでしょうか。"
    ),
    "objection": "ご提案の件ですが、確認したい点がいくつかあります。",
    "negotiation": "お願いがあります。こちらの事情もご考慮いただけないでしょうか。",
    "confirmation": "承知しました。それでは、この内容で進めてよろしいですか。",
    "correction": "申し訳ありません。先ほどのお伝えした内容を一部修正させてください。",
    "escalation": "この件は重要なので、上司と相談して改めてご連絡します。",
    "resolution": "ご協力ありがとうございます。無事に解決できました。",
    "closing": "それでは、また何かありましたらご連絡ください。ありがとうございました。",
}


def fallback_message(turn_type: str) -> str:
    return FALLBACK_MESSAGES.get(turn_type, FALLBACK_MESSAGES["question"])


def _attr(obj: Any, name: str) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


def _as_int(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
