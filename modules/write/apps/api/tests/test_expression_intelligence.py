"""Unit and integration tests for Japanese Expression Intelligence (Phase 21)."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.models.expression_intelligence import ExpressionRecord
from app.repositories.expression_intelligence import ExpressionRecordRepository
from app.schemas.expression_intelligence_ai import (
    CollocationAnalysisResult,
    CollocationIssue,
    CollocationSuggestionsResult,
    ExpressionVariationItem,
    ExpressionVariationResult,
    OveruseDetection,
    RegisterTransformationResult,
    TransferDetection,
)
from app.services.expression_intelligence_service import ExpressionIntelligenceService


@pytest.mark.asyncio
async def test_expression_intelligence_service_analyze():
    repo = MagicMock(spec=ExpressionRecordRepository)
    repo.get_by_expression = AsyncMock(return_value=None)
    repo.create = AsyncMock()

    ai_service = MagicMock()
    mock_ai_data = CollocationAnalysisResult(
        collocations=[
            CollocationIssue(
                expression="予定を決定する",
                base_word="決める",
                classification="unnatural",
                native_alternative="予定を決める",
                explanation_vi="Người Nhật thường dùng '予定を決める' thay vì '決定する' trong văn cảnh thường nhật.",
                register="polite",
            )
        ],
        overuse=[
            OveruseDetection(
                expression="と思います",
                count=4,
                is_legitimate=False,
                explanation_vi="Lặp lại と思います quá nhiều khiến câu văn đơn điệu và thiếu tự tin.",
                suggested_alternatives=["〜と考えております", "〜のはずです", "〜に違いありません"],
            )
        ],
        transfers=[
            TransferDetection(
                expression="私の考えは",
                classification="literal_translation",
                native_alternative="〜と考えます",
                explanation_vi="Dịch nguyên văn từ 'Ý kiến của tôi là' trong tiếng Việt.",
            )
        ],
        overall_naturalness_score=68,
        summary_vi="Bài viết cần cải thiện collocation và tránh lặp と思います.",
    )

    ai_service.generate_structured = AsyncMock(return_value=(mock_ai_data, MagicMock()))

    service = ExpressionIntelligenceService(repository=repo, ai_service=ai_service)

    result = await service.analyze_expressions(
        user_id=None,
        text="私の考えは予定を決定すると思います。明日も行こうと思います。",
    )

    assert result.overall_naturalness_score == 68
    assert len(result.collocations) == 1
    assert result.collocations[0].native_alternative == "予定を決める"
    assert len(result.overuse) == 1
    assert result.overuse[0].expression == "と思います"
    assert len(result.transfers) == 1


@pytest.mark.asyncio
async def test_expression_intelligence_variations():
    repo = MagicMock(spec=ExpressionRecordRepository)
    ai_service = MagicMock()

    mock_var_data = ExpressionVariationResult(
        original="雨が降るから行きません",
        variations=[
            ExpressionVariationItem(
                text="雨が降っているため、行くのを見合わせます",
                register="formal",
                nuance_vi="Trang trọng, lịch thiệp thích hợp trong thông báo hoặc email",
                key_phrase="見合わせる",
            ),
            ExpressionVariationItem(
                text="あいにくの雨ですので、今回は遠慮させていただきます",
                register="business",
                nuance_vi="Văn phong thương mại từ chối khéo léo",
                key_phrase="あいにくの雨",
            ),
            ExpressionVariationItem(
                text="雨降ってるし、やめとくね",
                register="casual",
                nuance_vi="Thân mật, nói chuyện bạn bè",
                key_phrase="やめとく",
            ),
        ],
        synthesis_prompt_vi="Hãy viết câu từ chối cuộc hẹn bằng tiếng Nhật của riêng bạn!",
    )
    ai_service.generate_structured = AsyncMock(return_value=(mock_var_data, MagicMock()))

    service = ExpressionIntelligenceService(repository=repo, ai_service=ai_service)
    res = await service.generate_variations("雨が降るから行きません")
    assert len(res.variations) == 3
    assert res.variations[0].register == "formal"


@pytest.mark.asyncio
async def test_expression_intelligence_register_transform():
    repo = MagicMock(spec=ExpressionRecordRepository)
    ai_service = MagicMock()

    mock_trans_data = RegisterTransformationResult(
        original="これを見てください",
        source_register="polite",
        target_register="business",
        transformed_text="こちらをご査収くださいますようお願い申し上げます",
        key_changes=["これ -> こちら", "見てください -> ご査収くださいますようお願い申し上げます"],
        explanation_vi="Chuyển sang kính ngữ thương mại trang trọng khi gửi tài liệu.",
    )
    ai_service.generate_structured = AsyncMock(return_value=(mock_trans_data, MagicMock()))

    service = ExpressionIntelligenceService(repository=repo, ai_service=ai_service)
    res = await service.transform_register("これを見てください", "polite", "business")
    assert res.target_register == "business"
    assert "ご査収" in res.transformed_text
