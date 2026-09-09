"""Prompt definitions for Boss Writing Task Generation (Phase 23)."""

from __future__ import annotations

import json
from typing import Any

BOSS_TASK_GENERATOR_VERSION = "2026-08-24.v1"


def boss_task_generator_prompt_version() -> str:
    return BOSS_TASK_GENERATOR_VERSION


def build_boss_task_generation_prompt(
    *,
    task_type: str | None = None,
    jlpt_level: str = "N3",
    target_register: str | None = None,
    weaknesses_to_target: list[dict[str, Any]] | None = None,
    profile_summary: dict[str, Any] | None = None,
) -> str:
    """Builds prompt to generate an unassisted, unseen Boss Writing challenge."""
    weakness_context_lines = []
    if weaknesses_to_target:
        for w in weaknesses_to_target:
            weakness_context_lines.append(
                f"- Category: {w.get('category')} | Subtype: {w.get('subtype')} | Desc: {w.get('description')} | Status: {w.get('status')}"
            )
    weakness_str = "\n".join(weakness_context_lines) if weakness_context_lines else "None specific (General Mastery Test)"

    profile_info = json.dumps(profile_summary or {}, ensure_ascii=False)

    return f"""Bạn là Giám Khảo Khảo Thí Viết Tiếng Nhật Cao Cấp (Japanese Writing Mastery Boss Examiner).
Nhiệm vụ của bạn là thiết kế một **BÀI THI BOSS ĐÁNH GIÁ NĂNG LỰC VIẾT THỰC TẾ (Boss Writing Task)** mang tính chất thử thách cao, chân thực 100%, KHÔNG CÓ TRỢ GIÚP.

### Thông số thiết kế bài thi Boss:
- Cấp độ mục tiêu: JLPT {jlpt_level}
- Loại nhiệm vụ mong muốn: {task_type or "Tự động chọn 1 trong: business_email, absence_message, complaint, explanation, progress_update, opinion_paragraph"}
- Văn phong yêu cầu: {target_register or "Phù hợp hoàn hảo với tình huống giao tiếp thực tế"}
- Hồ sơ người học: {profile_info}
- Các điểm yếu cần cài cắm cạm bẫy để kiểm tra sức đề kháng lỗi (Adversarial Transfer Test):
{weakness_str}

### Yêu cầu bắt buộc:
1. **Bối cảnh hoàn toàn mới lạ & thực tế (Unseen Context)**:
   - Tình huống phải có động cơ giao tiếp rõ ràng, có xung đột hoặc khó khăn cần giải quyết khéo léo (ví dụ: xin lỗi đối tác vì chậm tiến độ do sự cố bất khả kháng, xin nghỉ việc đột xuất nhưng vẫn đảm bảo bàn giao, phàn nàn dịch vụ một cách lịch sự nhưng kiên quyết).
2. **Cài cắm cạm bẫy ngôn ngữ tinh tế (Adversarial Traps)**:
   - Thiết kế tình huống sao cho nếu người học dịch thô từ tiếng Việt (L1) hoặc dùng sai kính ngữ/trợ từ, họ sẽ dễ mắc lỗi. Bắt buộc bài viết phải có ít nhất 3 ràng buộc nội dung rõ ràng (`required_constraints`).
3. **Tuyệt đối không đưa ra từ vựng gợi ý hay câu mẫu**:
   - Đây là bài kiểm tra Boss để đo năng lực tự thân của học viên, người học phải tự vận dụng vốn từ và ngữ pháp của mình.

Hãy xuất ra kết quả theo đúng cấu trúc JSON đã được định nghĩa.
"""
