"""Contracts, Enums, and Pydantic schemas for Dynamic AI Interview Coach."""

from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class InterviewerPersonality(str, Enum):
    FRIENDLY = "friendly"
    STRICT = "strict"
    ANALYTICAL = "analytical"


class IndustryTemplate(BaseModel):
    id: str
    label_vi: str
    label_ja: str
    description: str
    suggested_roles: list[str] = Field(default_factory=list)
    icon_name: str = "Briefcase"


class PREPStarters(BaseModel):
    point: str = Field(description="Mẫu câu mở đầu khẳng định luận điểm")
    reason: str = Field(description="Mẫu câu giải thích nguyên do")
    example: str = Field(description="Mẫu câu đưa dẫn chứng thực tế")
    summary: str = Field(description="Mẫu câu tóm lại và cam kết cống hiến")


class InterviewQuestion(BaseModel):
    id: str
    question_ja: str
    question_vi: str
    reading_hiragana: str | None = None
    romaji: str | None = None
    interviewer_name: str = "山田 健二"
    interviewer_title: str = "人事採用マネージャー"
    interviewer_style: InterviewerPersonality = InterviewerPersonality.FRIENDLY
    intent_explanation_vi: str = Field(description="Mục đích người Nhật hỏi câu này")
    prep_starters: PREPStarters
    key_vocab_hints: list[dict[str, str]] = Field(default_factory=list)
    turn_index: int = 1
    total_turns: int = 5
    source: str = "ai"  # "seed" or "ai"


class PREPScoreBreakdown(BaseModel):
    point_score: int = Field(ge=0, le=100, description="Độ rõ ràng của luận điểm ban đầu")
    reason_score: int = Field(ge=0, le=100, description="Tính hợp lý và thuyết phục của lý do")
    example_score: int = Field(ge=0, le=100, description="Dẫn chứng hành động cụ thể")
    summary_score: int = Field(ge=0, le=100, description="Khẳng định và cam kết đóng góp")
    feedback_vi: str = Field(description="Nhận xét chi tiết về cấu trúc PREP")


class KeigoAnalysisItem(BaseModel):
    original_phrase: str = Field(description="Cụm từ người dùng đã nói")
    corrected_phrase: str = Field(description="Cụm từ kính ngữ chuẩn")
    keigo_type: str = Field(description="Kenjougo / Sonkeigo / Teineigo")
    explanation_vi: str = Field(description="Lý do nên sửa")


class InterviewCoachEvaluation(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    prep_score: int = Field(ge=0, le=100)
    keigo_score: int = Field(ge=0, le=100)
    prep_breakdown: PREPScoreBreakdown
    keigo_fixes: list[KeigoAnalysisItem] = Field(default_factory=list)
    coach_feedback_vi: str = Field(description="Lời khuyên mang tính huấn luyện viên trực tiếp")
    strengths_vi: list[str] = Field(default_factory=list)
    areas_to_improve_vi: list[str] = Field(default_factory=list)
    native_model_answer: str = Field(description="Bản viết lại hoàn hảo chuẩn phong cách Nhật")
    native_model_reading: str | None = None
    native_model_vi: str = Field(description="Dịch nghĩa bản viết lại")
    recommended_vocab: list[dict[str, str]] = Field(default_factory=list)
    suggested_followup_question_hint: str | None = None


class GenerateQuestionRequest(BaseModel):
    role: str = Field(description="Vị trí ứng tuyển (chọn mẫu hoặc nhập tự do)")
    company_context: str | None = Field(default=None, description="Tên công ty hoặc mô tả thêm")
    interviewer_style: InterviewerPersonality = InterviewerPersonality.FRIENDLY
    turn_index: int = 1
    previous_turns: list[dict[str, Any]] = Field(default_factory=list)


class EvaluateAnswerRequest(BaseModel):
    role: str
    question_ja: str
    user_answer: str
    turn_index: int = 1
    interviewer_style: InterviewerPersonality = InterviewerPersonality.FRIENDLY
