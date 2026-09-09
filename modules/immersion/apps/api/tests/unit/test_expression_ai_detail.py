import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy import select, and_

from app.models.knowledge import UserExpression, UserGrammar, UserSavedSentence
from app.schemas.reader import ExpressionLookupResponse
from app.services.knowledge_service import KnowledgeService
from app.schemas.knowledge import LearningEventRequest


def _lookup_result(**overrides) -> ExpressionLookupResponse:
    base = {
        "expression": "対策を講じる",
        "meaning": "thực hiện biện pháp",
        "usage_context": "Văn viết trang trọng, báo chí và công văn. Đi với danh từ chỉ vấn đề.",
        "composition": "対策 (biện pháp) + を + 講じる (thực hiện, thể trang trọng của 取る).",
        "examples": [
            {"sentence_ja": "政府は対策を講じた。", "sentence_vi": "Chính phủ đã thực hiện biện pháp."},
            {"sentence_ja": "早急に対策を講じる必要がある。", "sentence_vi": "Cần nhanh chóng thực hiện biện pháp."},
        ],
        "alternatives": [
            {"expression": "措置を取る", "reading": "そちをとる", "meaning_vi": "áp dụng biện pháp", "difference": "措置を取る trung tính hơn."},
        ],
        "model_provider": "mock",
        "model_name": "mock-model",
    }
    base.update(overrides)
    return ExpressionLookupResponse(**base)


async def _make_expression(test_db_session, expression="対策を講じる", type_="COLLOCATION", meaning="thực hiện biện pháp") -> int:
    res = await KnowledgeService.ingest_learning_event(
        db=test_db_session,
        user_id="user_unit_test",
        req=LearningEventRequest(
            event_type="ENCOUNTERED",
            item_type="EXPRESSION",
            term=expression,
            reading="たいさくをこうじる",
            meaning=meaning,
            expression_type=type_,
            sentence_text="政府は対策を講じた。",
            content_id=None,
        ),
    )
    return res.item_id


def test_apply_expression_ai_detail_fills_empty_and_dedups():
    expr = UserExpression(
        user_id="u", expression="対策を講じる", normalized_expression="対策を講じる",
        meaning="m",
    )
    changed = KnowledgeService._apply_expression_ai_detail(
        expr,
        usage_context="văn viết",
        composition="A + B",
        examples=[{"sentence_ja": "例文。", "sentence_vi": "vd."}],
        alternatives=[{"expression": "措置を取る", "reading": "", "meaning_vi": "", "difference": ""}],
    )
    assert changed is True
    assert expr.usage_context == "văn viết"
    assert expr.composition == "A + B"
    assert expr.examples_json == [{"sentence_ja": "例文。", "sentence_vi": "vd."}]
    assert expr.alternatives_json[0]["expression"] == "措置を取る"

    again = KnowledgeService._apply_expression_ai_detail(
        expr,
        usage_context="other (must not overwrite)",
        examples=[{"sentence_ja": "例文。", "sentence_vi": "khác"}],
        alternatives=[{"expression": "措置を取る", "reading": "", "meaning_vi": "", "difference": ""}],
    )
    assert again is False
    assert expr.usage_context == "văn viết"
    assert len(expr.examples_json) == 1
    assert len(expr.alternatives_json) == 1


@pytest.mark.asyncio
async def test_enrich_expression_detail_backfills(test_db_session):
    expr_id = await _make_expression(test_db_session)
    with patch(
        "app.services.reader_service.ReaderService.lookup_expression",
        new=AsyncMock(return_value=_lookup_result()),
    ) as mock_lookup:
        resp = await KnowledgeService.enrich_expression_detail(
            db=test_db_session, user_id="user_unit_test", expression_id=expr_id
        )
    mock_lookup.assert_awaited_once()
    assert "Văn viết" in (resp.usage_context or "")
    assert "対策" in (resp.composition or "")
    assert len(resp.examples) == 2
    assert resp.alternatives[0]["expression"] == "措置を取る"


@pytest.mark.asyncio
async def test_enrich_expression_detail_skips_when_complete(test_db_session):
    expr_id = await _make_expression(test_db_session)
    expr = (
        await test_db_session.execute(
            select(UserExpression).where(
                and_(UserExpression.id == expr_id, UserExpression.user_id == "user_unit_test")
            )
        )
    ).scalars().first()
    expr.usage_context = "already there"
    await test_db_session.commit()

    with patch(
        "app.services.reader_service.ReaderService.lookup_expression",
        new=AsyncMock(side_effect=AssertionError("AI must not be called for complete entries")),
    ):
        resp = await KnowledgeService.enrich_expression_detail(
            db=test_db_session, user_id="user_unit_test", expression_id=expr_id
        )
    assert resp.usage_context == "already there"


@pytest.mark.asyncio
async def test_enrich_expression_detail_unknown_id(test_db_session):
    with pytest.raises(ValueError, match="not found"):
        await KnowledgeService.enrich_expression_detail(
            db=test_db_session, user_id="user_unit_test", expression_id=999999
        )


@pytest.mark.asyncio
async def test_expressions_list_search_and_type_filter(test_db_session):
    await _make_expression(test_db_session, "対策を講じる", "COLLOCATION")
    await _make_expression(test_db_session, "猫の手も借りたい", "IDIOM", "bận tối mắt")

    all_res = await KnowledgeService.get_expressions_list(
        db=test_db_session, user_id="user_unit_test", page=1, limit=20
    )
    assert all_res.total == 2

    search_res = await KnowledgeService.get_expressions_list(
        db=test_db_session, user_id="user_unit_test", page=1, limit=20, search="猫の手"
    )
    assert search_res.total == 1
    assert search_res.items[0].expression == "猫の手も借りたい"

    type_res = await KnowledgeService.get_expressions_list(
        db=test_db_session, user_id="user_unit_test", page=1, limit=20, expr_type="IDIOM"
    )
    assert type_res.total == 1

    page_res = await KnowledgeService.get_expressions_list(
        db=test_db_session, user_id="user_unit_test", page=2, limit=1
    )
    assert page_res.total == 2
    assert len(page_res.items) == 1


@pytest.mark.asyncio
async def test_grammar_list_search_and_confidence_filter(test_db_session):
    for pat, meaning in [("〜わけではない", "không hẳn"), ("〜ざるを得ない", "đành phải")]:
        await KnowledgeService.ingest_learning_event(
            db=test_db_session,
            user_id="user_unit_test",
            req=LearningEventRequest(
                event_type="WORD_SAVED", item_type="GRAMMAR", term=pat, meaning=meaning
            ),
        )
    # Force distinct confidences (WORD_SAVED leaves default MEDIUM)
    grams = (
        await test_db_session.execute(
            select(UserGrammar).where(UserGrammar.user_id == "user_unit_test")
        )
    ).scalars().all()
    grams[0].confidence = "HIGH"
    await test_db_session.commit()

    search_res = await KnowledgeService.get_grammar_list(
        db=test_db_session, user_id="user_unit_test", page=1, limit=20, search="ざるを得ない"
    )
    assert search_res.total == 1

    conf_res = await KnowledgeService.get_grammar_list(
        db=test_db_session, user_id="user_unit_test", page=1, limit=20, confidence="HIGH"
    )
    assert conf_res.total == 1


@pytest.mark.asyncio
async def test_saved_sentences_pagination_search_reason(test_db_session):
    from app.schemas.knowledge import SaveSentenceRequest
    for i in range(5):
        await KnowledgeService.save_sentence(
            db=test_db_session,
            user_id="user_unit_test",
            req=SaveSentenceRequest(
                sentence_text=f"テスト文その{i}です。",
                translation_text=f"Câu test {i}",
                reason="MEMORABLE" if i % 2 == 0 else "GOOD_EXPRESSION",
            ),
        )

    p1 = await KnowledgeService.get_saved_sentences(
        db=test_db_session, user_id="user_unit_test", page=1, limit=2
    )
    assert p1.total == 5
    assert len(p1.items) == 2
    assert p1.page == 1

    p3 = await KnowledgeService.get_saved_sentences(
        db=test_db_session, user_id="user_unit_test", page=3, limit=2
    )
    assert len(p3.items) == 1

    search = await KnowledgeService.get_saved_sentences(
        db=test_db_session, user_id="user_unit_test", page=1, limit=20, search="その1"
    )
    assert search.total == 1

    reason = await KnowledgeService.get_saved_sentences(
        db=test_db_session, user_id="user_unit_test", page=1, limit=20, reason="GOOD_EXPRESSION"
    )
    assert reason.total == 2


@pytest.mark.asyncio
async def test_lookup_expression_endpoint(client):
    with patch(
        "app.services.reader_service.ReaderService.lookup_expression",
        new=AsyncMock(return_value=_lookup_result()),
    ):
        res = await client.post(
            "/api/v1/immersion/lookup-expression",
            json={"expression": "対策を講じる", "context": "政府は対策を講じた。"},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["expression"] == "対策を講じる"
    assert "Văn viết" in data["usage_context"]
    assert len(data["examples"]) == 2


@pytest.mark.asyncio
async def test_enrich_expression_endpoint_roundtrip(client, test_db_session):
    expr_id = await _make_expression(test_db_session)
    headers = {"X-User-Id": "user_unit_test"}
    with patch(
        "app.services.reader_service.ReaderService.lookup_expression",
        new=AsyncMock(return_value=_lookup_result()),
    ):
        res = await client.post(
            f"/api/v1/immersion/knowledge/expressions/{expr_id}/enrich", headers=headers
        )
    assert res.status_code == 200
    assert res.json()["usage_context"]

    # Unknown id → 404
    res404 = await client.post(
        "/api/v1/immersion/knowledge/expressions/999999/enrich", headers=headers
    )
    assert res404.status_code == 404
