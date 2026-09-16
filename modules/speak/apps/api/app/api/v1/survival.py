"""Survival Speaking & Speech Recovery API Router.

Provides endpoints for:
- Fetching tasks (Circumlocution Gym / Survival Scenarios) with Seed Pool or AI dynamic generation.
- Real-time Hybrid Evaluation (Fast-Pass + AI Listener Guessing).
- Topics catalog.
- In-Session SOS Emergency Bridge for /speaking room.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.survival.contracts import (
    CircumlocutionTask,
    RepairStrategy,
    SOSHintRequest,
    SOSHintResponse,
    SOSSuggestionItem,
    SurvivalDifficulty,
    SurvivalEvaluationRequest,
    SurvivalEvaluationResult,
    SurvivalMode,
    SurvivalScenarioTask,
)
from app.domains.survival.evaluator import SurvivalEvaluator
from app.domains.survival.generator import SurvivalTaskGenerator
from app.domains.survival.pools import SURVIVAL_TOPICS
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/survival", tags=["Survival Speaking & Recovery"])


@router.get("/topics")
async def get_survival_topics() -> list[dict[str, str]]:
    """Returns available topics for survival speaking exercises."""
    return SURVIVAL_TOPICS


@router.get("/task")
async def get_survival_task(
    mode: SurvivalMode = Query(SurvivalMode.CIRCUMLOCUTION, description="circumlocution or scenarios"),
    topic: str = Query("all", description="Topic identifier"),
    difficulty: SurvivalDifficulty = Query(SurvivalDifficulty.EASY, description="easy, medium, hard"),
    force_ai: bool = Query(True, description="Whether to force AI dynamic generation"),
    db: AsyncSession = Depends(get_db),
) -> CircumlocutionTask | SurvivalScenarioTask:
    """100% Realtime AI Dynamic Generation for every task, synced with header AI model."""
    generator = SurvivalTaskGenerator(db)
    return await generator.generate_dynamic_task(
        mode=mode,
        topic=topic if topic != "all" else None,
        difficulty=difficulty,
    )


@router.post("/evaluate")
async def evaluate_survival_attempt(
    request: SurvivalEvaluationRequest,
    db: AsyncSession = Depends(get_db),
) -> SurvivalEvaluationResult:
    """Evaluates user's spoken utterance using Fast-Pass and AI Listener Guessing Engine."""
    evaluator = SurvivalEvaluator(db)
    result = await evaluator.evaluate(request)
    return result


@router.post("/sos-hint")
async def get_sos_emergency_hint(
    request: SOSHintRequest,
) -> SOSHintResponse:
    """Provides emergency quick phrases when the learner is stuck/silent during live speech."""
    # Contextual quick hints based on relationship
    if request.relationship.value == "business":
        suggestions = [
            SOSSuggestionItem(
                strategy=RepairStrategy.BUYING_TIME,
                title="Câu giờ lịch sự để suy nghĩ",
                japanese_phrase="少々考えをまとめさせていただきますので、少しお時間いただけますでしょうか。",
                reading_hiragana="しょうしょうかんがえをまとめさせていただきますので、すこしおじかんいただけますでしょうか。",
                meaning_vi="Xin phép cho tôi sắp xếp lại suy nghĩ một chút được không ạ?",
            ),
            SOSSuggestionItem(
                strategy=RepairStrategy.ASKING_REPETITION,
                title="Xin nhắc lại lịch sự",
                japanese_phrase="大変恐れ入りますが、もう一度ゆっくりおっしゃっていただけますでしょうか。",
                reading_hiragana="たいへんおそれいりますが、もういちどゆっくりおっしゃっていただけますでしょうか。",
                meaning_vi="Vô cùng xin lỗi, anh/chị có thể vui lòng nhắc lại chậm hơn một chút được không ạ?",
            ),
            SOSSuggestionItem(
                strategy=RepairStrategy.ASKING_CLARIFICATION,
                title="Xác nhận lại câu hỏi",
                japanese_phrase="恐縮ですが、〜という意味でよろしいでしょうか？",
                reading_hiragana="きょうしゅくですが、〜といういみでよろしいでしょうか？",
                meaning_vi="Xin thứ lỗi, có phải ý của anh/chị là... không ạ?",
            ),
        ]
    else:
        suggestions = [
            SOSSuggestionItem(
                strategy=RepairStrategy.BUYING_TIME,
                title="Câu giờ tự nhiên đời thường",
                japanese_phrase="そうですね…ええと、何て言えばいいのかな。",
                reading_hiragana="そうですね…ええと、なんていえばいいのかな。",
                meaning_vi="À ừm... để xem nào, nên nói thế nào nhỉ.",
            ),
            SOSSuggestionItem(
                strategy=RepairStrategy.ASKING_REPETITION,
                title="Hỏi lại bạn bè",
                japanese_phrase="ごめん、ちょっと聞き取れなかった！もう一回言って？",
                reading_hiragana="ごめん、ちょっとききとれなかった！もういっかいおしえて？",
                meaning_vi="Xin lỗi, tớ vừa chưa nghe kịp! Cậu nói lại lần nữa được không?",
            ),
            SOSSuggestionItem(
                strategy=RepairStrategy.SELF_CORRECTION,
                title="Đính chính nhanh",
                japanese_phrase="あ、違う、〜じゃなくて〜！",
                reading_hiragana="あ、ちがう、〜じゃなくて〜！",
                meaning_vi="À không phải, ý tớ là... cơ!",
            ),
        ]

    return SOSHintResponse(suggestions=suggestions)
