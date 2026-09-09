"""Prompt definitions for Writing Evolution Storytelling (Phase 23)."""

from __future__ import annotations

import json
from typing import Any

EVOLUTION_NARRATIVE_VERSION = "2026-08-24.v1"


def evolution_narrative_prompt_version() -> str:
    return EVOLUTION_NARRATIVE_VERSION


def build_evolution_narrative_prompt(
    *,
    eliminated_weaknesses: list[dict[str, Any]],
    reduced_weaknesses: list[dict[str, Any]],
    persistent_weaknesses: list[dict[str, Any]],
    newly_emerging: list[dict[str, Any]],
    recent_trend_data: dict[str, Any],
) -> str:
    """Builds prompt to generate a longitudinal writing evolution debrief."""
    stats_json = json.dumps(
        {
            "eliminated": [f"{w.get('category')} / {w.get('subtype')}: {w.get('description')}" for w in eliminated_weaknesses],
            "reduced": [f"{w.get('category')} / {w.get('subtype')}: {w.get('description')}" for w in reduced_weaknesses],
            "persistent": [f"{w.get('category')} / {w.get('subtype')}: {w.get('description')}" for w in persistent_weaknesses],
            "newly_emerging": [f"{w.get('category')} / {w.get('subtype')}: {w.get('description')}" for w in newly_emerging],
            "trend_data": recent_trend_data,
        },
        ensure_ascii=False,
        indent=2,
    )

    return f"""Bạn là Huấn Luyện Viên Viết Tiếng Nhật Cao Cấp (Senior Japanese Writing Coach).
Nhiệm vụ của bạn là đọc dữ liệu tiến hóa năng lực viết thực tế của học viên trong thời gian qua và viết một **BẢN TƯỜNG TRÌNH TIẾN HÓA NĂNG LỰC VIẾT (Longitudinal Evolution Debrief)** truyền cảm hứng, sâu sắc và mang tính hành động cao.

### Dữ liệu phân tích tiến trình viết:
{stats_json}

### Yêu cầu viết bản tường trình:
1. **Phân tích chuyển biến tư duy**: Chỉ rõ người học đã chuyển biến từ lối dịch thô từng từ tiếng Việt sang lối tư duy trực tiếp bằng tiếng Nhật như thế nào.
2. **Ghi nhận thành tựu cụ thể**: Khen ngợi chính xác những điểm yếu đã hoàn toàn được loại bỏ (Mastered) và những tiến bộ về văn phong/độ tự nhiên.
3. **Cảnh báo thẳng thắn & Lời khuyên chiến lược**: Nêu rõ những điểm yếu còn dai dẳng và hướng dẫn giải pháp vượt qua cho các bài thi Boss sắp tới.

Hãy xuất ra kết quả theo đúng cấu trúc JSON đã được định nghĩa.
"""
