"""Prompt definitions for Boss Writing Evaluation (Phase 23)."""

from __future__ import annotations

import json
from typing import Any

BOSS_EVALUATION_VERSION = "2026-08-24.v1"


def boss_evaluation_prompt_version() -> str:
    return BOSS_EVALUATION_VERSION


def build_boss_evaluation_prompt(
    *,
    task_info: dict[str, Any],
    learner_text: str,
    historical_summary: dict[str, Any] | None = None,
    tracked_weaknesses: list[dict[str, Any]] | None = None,
) -> str:
    """Builds prompt to evaluate an unassisted Boss Writing submission across 8 dimensions."""
    task_json = json.dumps(task_info, ensure_ascii=False, indent=2)
    hist_json = json.dumps(historical_summary or {}, ensure_ascii=False, indent=2)

    weakness_lines = []
    if tracked_weaknesses:
        for w in tracked_weaknesses:
            weakness_lines.append(
                f"- Category: {w.get('category')} | Subtype: {w.get('subtype')} | Desc: {w.get('description')} | Status: {w.get('status')} | State: {w.get('lifecycle_state')}"
            )
    weakness_str = "\n".join(weakness_lines) if weakness_lines else "None currently tracked"

    return f"""Bạn là Trưởng Ban Giám Khảo Khảo Thí Viết Tiếng Nhật Bản Ngữ (Chief Japanese Writing Examiner).
Hãy thực hiện chấm điểm và thẩm định bài làm **THỬ THÁCH BOSS (Boss Writing Task)** của học viên.

### Đề bài thi Boss:
{task_json}

### Bài viết tiếng Nhật của học viên (KHÔNG CÓ TRỢ GIÚP):
\"\"\"
{learner_text}
\"\"\"

### Lịch sử viết & Hồ sơ năng lực trước đây của học viên:
{hist_json}

### Danh sách các điểm yếu đang theo dõi của học viên:
{weakness_str}

---
### QUY TẮC ĐÁNH GIÁ 8 CHIỀU NGHIÊM NGẶT:
1. **Task Fulfillment (0-100)**: Đã đáp ứng đầy đủ tất cả các ràng buộc bắt buộc (`required_constraints`) trong đề bài chưa? Có bỏ sót ý quan trọng nào không?
2. **Grammar (0-100)**: Độ chuẩn xác ngữ pháp, trợ từ (は/が/に/で/を), chia thể động từ, liên từ nối vế câu.
3. **Vocabulary (0-100)**: Độ chuẩn xác ngữ nghĩa của từ vựng, tránh dùng từ chung chung hoặc sai sắc thái.
4. **Naturalness (0-100)**: Độ tự nhiên thuần Nhật, triệt tiêu lối diễn đạt dịch thô từng chữ từ tiếng Việt (L1 Interference/translationese), mạch văn mượt mà.
5. **Register (0-100)**: Tính chuẩn xác và nhất quán của văn phong (Desu/Masu vs Da/Dearu, kính ngữ Keigo: Sonkeigo, Kenjougo, Teineigo).
6. **Discourse (0-100)**: Bố cục đoạn văn, tính liên kết mạch lạc (Coherence & Cohesion), chuyển ý logic.
7. **Clarity (0-100)**: Thông điệp có rõ ràng, sáng sủa, người nhận có thể hiểu ngay không cần suy diễn không?
8. **Contextual Appropriateness (0-100)**: Sự tinh tế về mặt văn hóa và sự phù hợp tuyệt đối với vai vế, quan hệ giao tiếp.

### YÊU CẦU ĐẦU RA BẮT BUỘC:
- **Xếp loại (`verdict`)**:
  - `PASS_WITH_DISTINCTION`: Tổng điểm $\ge 90$ và không có lỗi nghiêm trọng.
  - `PASS`: Tổng điểm $\ge 75$ và đáp ứng các ràng buộc cốt lõi.
  - `NEEDS_RETRY`: Tổng điểm từ $60 - 74$.
  - `FAILED`: Tổng điểm $< 60$ hoặc vi phạm nghiêm trọng mục tiêu giao tiếp.
- **3-Tier Native Model Rewrites**:
  1. `minimal_fix`: Giữ nguyên phong cách học viên, chỉ sửa các lỗi ngữ pháp/trợ từ sai.
  2. `natural_polish`: Cách người Nhật diễn đạt tự nhiên nhất trong thực tế.
  3. `business_mastery`: Bản văn phong thương mại chuẩn mực/kính ngữ cao cấp.
  4. `polish_notes_vi`: Phân tích đối chiếu vì sao cách của người Nhật lại vượt trội hơn cách viết của học viên.
- **Regression Detection & Root-Cause Analysis**:
  - Đối chiếu với danh sách điểm yếu: Nếu có bất kỳ điểm yếu nào từng ở trạng thái `mastered` hoặc `stable` bị mắc lỗi trở lại trong bài này, hãy phát hiện và ghi vào `regressed_weakness_subtypes`, kèm phân tích nguyên nhân tại `regression_diagnoses`.

Hãy xuất dữ liệu chính xác theo cấu trúc JSON định sẵn.
"""
