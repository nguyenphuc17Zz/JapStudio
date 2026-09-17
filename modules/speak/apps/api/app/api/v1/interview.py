"""Dynamic AI Interview Coach API Router — Mode: Interview Arena."""

from typing import Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.domains.interview.contracts import (
    EvaluateAnswerRequest,
    GenerateQuestionRequest,
    IndustryTemplate,
    InterviewCoachEvaluation,
    InterviewQuestion,
)
from app.domains.interview.dynamic_generator import InterviewCoachService
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_db
from app.domains.interview.pools import (
    INDUSTRY_TEMPLATES,
    INTERVIEWER_PROFILES,
)

router = APIRouter(prefix="/interview", tags=["Dynamic AI Interview Coach"])


def get_coach_service(db: AsyncSession = Depends(get_db)) -> InterviewCoachService:
    return InterviewCoachService(db=db)


@router.get("/templates")
async def get_interview_templates():
    """Returns preset industry templates and interviewer personality profiles."""
    return {
        "templates": INDUSTRY_TEMPLATES,
        "interviewers": INTERVIEWER_PROFILES,
    }


@router.post("/question", response_model=InterviewQuestion)
async def generate_interview_question(
    request: GenerateQuestionRequest,
    service: InterviewCoachService = Depends(get_coach_service),
) -> InterviewQuestion:
    """Generates a dynamic interview question tailored to role and conversation context."""
    return await service.generate_question(request)


@router.post("/coach", response_model=InterviewCoachEvaluation)
async def evaluate_interview_answer(
    request: EvaluateAnswerRequest,
    service: InterviewCoachService = Depends(get_coach_service),
) -> InterviewCoachEvaluation:
    """Evaluates candidate response on PREP structure, Keigo, and provides native rewrite."""
    return await service.evaluate_and_coach(request)


class FinalizeReportRequest(BaseModel):
    role: str
    turns_history: list[dict[str, Any]] = Field(default_factory=list)


class FinalReportResponse(BaseModel):
    decision: str = Field(description="内定 (NAITEI) / 2次面接通過 / 要練習")
    decision_badge: str = Field(description="naitei | passed | practice")
    overall_score: int = Field(ge=0, le=100)
    average_prep_score: int = Field(ge=0, le=100)
    average_keigo_score: int = Field(ge=0, le=100)
    summary_feedback_vi: str
    key_recommendations_vi: list[str] = Field(default_factory=list)
    interviewer_comment_vi: str


@router.post("/report", response_model=FinalReportResponse)
async def finalize_interview_report(
    request: FinalizeReportRequest,
) -> FinalReportResponse:
    """Calculates overall performance across turns and outputs final hiring evaluation report."""
    turns = request.turns_history
    if not turns:
        return FinalReportResponse(
            decision="要練習 (Cần rèn luyện thêm)",
            decision_badge="practice",
            overall_score=60,
            average_prep_score=60,
            average_keigo_score=60,
            summary_feedback_vi="Buổi phỏng vấn kết thúc sớm. Hãy thử hoàn thành đầy đủ các câu hỏi để nhận đánh giá chi tiết.",
            key_recommendations_vi=["Luyện tập trả lời đầy đủ các chặng phỏng vấn"],
            interviewer_comment_vi="Rất mong bạn tiếp tục rèn luyện và tự tin hơn ở lần ứng tuyển sau.",
        )

    total_prep = 0
    total_keigo = 0
    total_overall = 0
    count = len(turns)

    for t in turns:
        eval_data = t.get("evaluation") or {}
        total_prep += eval_data.get("prep_score", 70)
        total_keigo += eval_data.get("keigo_score", 75)
        total_overall += eval_data.get("overall_score", 70)

    avg_prep = round(total_prep / count)
    avg_keigo = round(total_keigo / count)
    avg_overall = round(total_overall / count)

    if avg_overall >= 85:
        decision = "内定 (NAITEI - Trúng Tuyển Chính Thức)"
        badge = "naitei"
        summary = f"Chúc mừng bạn! Kỹ năng phỏng vấn cho vị trí {request.role} đạt chuẩn xuất sắc của doanh nghiệp Nhật."
        comment = "Tác phong chuyên nghiệp, tư duy PREP logic mạch lạc và kính ngữ chuẩn chỉnh. Chúng tôi rất mong muốn được làm việc cùng bạn."
    elif avg_overall >= 70:
        decision = "面接通過 (Vượt Qua Vòng Phỏng Vấn)"
        badge = "passed"
        summary = f"Bạn đã vượt qua vòng phỏng vấn vị trí {request.role} với năng lực diễn đạt tốt, cần mài giũa thêm một số điểm kính ngữ."
        comment = "Ứng viên có tiềm năng và thái độ tích cực. Hãy chú ý hơn đến việc dùng 御社 và thêm số liệu cụ thể vào phần ví dụ."
    else:
        decision = "要練習 (Cần Rèn Luyện Thêm)"
        badge = "practice"
        summary = f"Buổi phỏng vấn cho thấy bạn cần tự tin hơn trong cách sắp xếp luận điểm khi trả lời phỏng vấn tiếng Nhật."
        comment = "Hãy chú ý nói theo khung PREP: đưa kết luận ngay ở câu đầu tiên, tránh ngập ngừng kéo dài."

    recs = [
        "Luôn ghi nhớ câu thần chú: 結論ファースト (Kết luận đầu tiên) trước khi giải thích lý do.",
        "Dùng 御社 (おんしゃ) khi nói chuyện trực tiếp, không dùng 貴社 (きしゃ - chỉ dùng cho văn viết/email).",
        "Chuẩn bị sẵn 2-3 con số hoặc dự án cụ thể để làm dẫn chứng thuyết phục cho phần Example.",
    ]

    return FinalReportResponse(
        decision=decision,
        decision_badge=badge,
        overall_score=avg_overall,
        average_prep_score=avg_prep,
        average_keigo_score=avg_keigo,
        summary_feedback_vi=summary,
        key_recommendations_vi=recs,
        interviewer_comment_vi=comment,
    )
