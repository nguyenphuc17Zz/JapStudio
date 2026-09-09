"""AI Structured Output Schemas for Boss Assessment & Evolution Synthesis (Phase 23)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BossTaskAIDraft(BaseModel):
    """Structured AI output for generating an unseen weakness-targeted Boss Writing Task."""

    title: str = Field(description="Tiêu đề tình huống thực tế bằng tiếng Nhật kèm tiếng Việt ngắn gọn")
    task_type: str = Field(description="Loại nhiệm vụ: business_email, absence_message, complaint, explanation, progress_update, opinion_paragraph")
    situation_vi: str = Field(description="Mô tả chi tiết tình huống thực tế đòi hỏi xử lý bằng tiếng Nhật")
    context_vi: str = Field(description="Bối cảnh cụ thể và mục tiêu giao tiếp cốt lõi")
    audience: str = Field(description="Đối tượng tiếp nhận (ví dụ: Khách hàng Nhật, Trưởng phòng, Đối tác dự án, v.v.)")
    relationship: str = Field(description="Mối quan hệ giao tiếp (ví dụ: Cấp dưới - Cấp trên, Khách hàng B2B, v.v.)")
    target_register: str = Field(description="Văn phong yêu cầu: formal_business, polite_polite, respectful_keigo, academic_formal")
    required_constraints: list[str] = Field(description="Danh sách các ràng buộc cụ thể người học BẮT BUỘC phải viết trong bài (tối thiểu 3 ý)")
    forbidden_patterns: list[str] = Field(default_factory=list, description="Các mẫu câu hoặc từ ngữ cấm kỵ/không nên dùng trong ngữ cảnh này")
    adversarial_traps: list[str] = Field(default_factory=list, description="Các cạm bẫy ngôn ngữ người học dễ nhầm lẫn được cài cắm tinh tế để thử thách")
    target_word_count_min: int = Field(default=100, description="Số lượng ký tự tối thiểu")
    target_word_count_max: int = Field(default=300, description="Số lượng ký tự tối đa")
    time_limit_minutes: int = Field(default=15, description="Thời gian giới hạn làm bài (phút)")
    difficulty: int = Field(default=7, ge=1, le=10, description="Độ khó thang 1-10")


class BossTieredRewritesAI(BaseModel):
    """3-Tier native model rewrites for learner comparison."""

    minimal_fix: str = Field(description="Bản sửa lỗi tối thiểu: giữ nguyên mạch văn học viên, chỉ chỉnh ngữ pháp và trợ từ sai")
    natural_polish: str = Field(description="Bản tự nhiên chuẩn Nhật: cách người Nhật diễn đạt tự nhiên nhất trong đời sống/công việc")
    business_mastery: str = Field(description="Bản văn phong cao cấp / Kính ngữ thương mại chuẩn mực")
    polish_notes_vi: str = Field(description="Giải thích ngắn gọn vì sao cách của người Nhật lại tự nhiên và phù hợp hơn cách viết của học viên")


class AIRegressionDiagnosis(BaseModel):
    """Root-cause analysis for any regressed weak point detected."""

    weakness_subtype: str = Field(description="Tên phân loại lỗi (ví dụ: particles, keigo, collocation...)")
    category: str = Field(description="Danh mục lỗi (grammar, register, lexicon, naturalness, discourse)")
    diagnosis_vi: str = Field(description="Chẩn đoán sắc bén vì sao học viên tái phát lỗi trong ngữ cảnh bài viết này")
    trigger_context: str = Field(description="Ngữ cảnh/câu văn cụ thể kích hoạt lỗi tái phát")


class BossEvaluationAIResult(BaseModel):
    """Structured AI output for rigorous 8-dimension Boss Writing evaluation."""

    overall_score: float = Field(ge=0.0, le=100.0, description="Điểm tổng hợp thang 100")
    verdict: str = Field(description="Xếp loại: PASS_WITH_DISTINCTION (>=90), PASS (>=75), NEEDS_RETRY (60-74), FAILED (<60)")
    task_fulfillment_score: float = Field(ge=0.0, le=100.0, description="Điểm mức độ hoàn thành nhiệm vụ & đáp ứng các ràng buộc")
    grammar_score: float = Field(ge=0.0, le=100.0, description="Điểm ngữ pháp, trợ từ & chia thể")
    vocabulary_score: float = Field(ge=0.0, le=100.0, description="Điểm độ chuẩn xác từ vựng & lựa chọn từ ngữ")
    naturalness_score: float = Field(ge=0.0, le=100.0, description="Điểm độ tự nhiên thuần Nhật & triệt tiêu lối dịch thô")
    register_score: float = Field(ge=0.0, le=100.0, description="Điểm văn phong & tính nhất quán kính ngữ")
    discourse_score: float = Field(ge=0.0, le=100.0, description="Điểm bố cục, tính mạch lạc & từ nối đoạn")
    clarity_score: float = Field(ge=0.0, le=100.0, description="Điểm độ sáng sủa, tường minh của thông điệp")
    contextual_appropriateness_score: float = Field(ge=0.0, le=100.0, description="Điểm sự phù hợp với bối cảnh, vai vế & đối tượng")
    feedback_vi: str = Field(description="Nhận xét tổng quan bằng tiếng Việt sâu sắc, mang tính xây dựng")
    strengths: list[str] = Field(description="Các điểm sáng và năng lực học viên đã thể hiện tốt")
    critical_gaps: list[str] = Field(description="Các lỗ hổng hoặc lỗi cần khắc phục ngay")
    rewrites: BossTieredRewritesAI = Field(description="3 phiên bản viết mẫu nâng cao")
    detected_weakness_subtypes: list[str] = Field(default_factory=list, description="Danh sách các subtype điểm yếu xuất hiện trong bài viết")
    regressed_weakness_subtypes: list[str] = Field(default_factory=list, description="Danh sách các subtype điểm yếu nghi ngờ tái phát/thoái trào")
    regression_diagnoses: list[AIRegressionDiagnosis] = Field(default_factory=list, description="Chẩn đoán căn nguyên cho các lỗi thoái trào")


class EvolutionNarrativeAIResult(BaseModel):
    """Structured AI output for longitudinal writing evolution storytelling."""

    narrative_vi: str = Field(description="Bản tường trình tiến hóa năng lực viết bằng tiếng Việt truyền cảm hứng và sắc bén")
    breakthrough_summary: str = Field(description="Tóm tắt bước đột phá lớn nhất học viên đã đạt được gần đây")
    strategic_advice: str = Field(description="Lời khuyên chiến lược cho các bài kiểm tra tiếp theo")
