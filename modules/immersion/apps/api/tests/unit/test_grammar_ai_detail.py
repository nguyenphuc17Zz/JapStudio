import pytest
from unittest.mock import AsyncMock, patch

from app.models.knowledge import UserGrammar
from app.schemas.knowledge import LearningEventRequest
from app.schemas.reader import GrammarLookupResponse
from app.services.knowledge_service import KnowledgeService


def _lookup_result(**overrides) -> GrammarLookupResponse:
    base = {
        "pattern": "〜わけではない",
        "formation": "V普通形 + わけではない / N + というわけではない",
        "meaning": "Không hẳn là... / Không có nghĩa là...",
        "usage_context": "Văn nói và viết đều dùng được. Phủ định một suy luận mà người nghe có thể hiểu lầm.",
        "examples": [
            {"sentence_ja": "嫌いなわけではない。", "sentence_vi": "Không hẳn là ghét."},
            {"sentence_ja": "できないわけではないが、時間がかかる。", "sentence_vi": "Không phải là không làm được, mà là tốn thời gian."},
        ],
        "model_provider": "mock",
        "model_name": "mock-model",
    }
    base.update(overrides)
    return GrammarLookupResponse(**base)


def _word_saved_req(**overrides) -> LearningEventRequest:
    base = {
        "event_type": "WORD_SAVED",
        "item_type": "GRAMMAR",
        "term": "〜わけではない",
        "meaning": "Không hẳn là...",
        "sentence_text": "嫌いなわけではない。",
        "source_name": "Test",
    }
    base.update(overrides)
    return LearningEventRequest(**base)


def test_apply_grammar_ai_detail_fills_empty_and_dedups():
    gram = UserGrammar(user_id="u", pattern="〜わけではない", meaning="m")
    changed = KnowledgeService._apply_grammar_ai_detail(
        gram,
        formation="V + わけではない",
        usage_context="dùng khi phủ định",
        examples=[{"sentence_ja": "例文。", "sentence_vi": "vd."}],
    )
    assert changed is True
    assert gram.formation == "V + わけではない"
    assert gram.usage_context == "dùng khi phủ định"
    assert gram.examples_json == [{"sentence_ja": "例文。", "sentence_vi": "vd."}]

    # Re-applying same data changes nothing and creates no duplicates
    changed_again = KnowledgeService._apply_grammar_ai_detail(
        gram,
        formation="other (must not overwrite)",
        usage_context="other",
        examples=[{"sentence_ja": "例文。", "sentence_vi": "khác"}],
    )
    assert changed_again is False
    assert gram.formation == "V + わけではない"
    assert len(gram.examples_json) == 1


@pytest.mark.asyncio
async def test_ingest_grammar_saved_with_caller_data_skips_ai_call(test_db_session):
    req = _word_saved_req(
        formation="caller formation",
        usage_context="caller usage",
        examples=[{"sentence_ja": "呼例文。", "sentence_vi": "vd."}],
    )
    with patch(
        "app.services.reader_service.ReaderService.lookup_grammar",
        new=AsyncMock(side_effect=AssertionError("AI must not be called when caller supplies detail")),
    ):
        res = await KnowledgeService.ingest_learning_event(
            db=test_db_session, user_id="user_unit_test", req=req
        )
    assert res.success is True
    assert res.item_type == "GRAMMAR"
    assert res.ai_enriched is True

    from app.schemas.knowledge import UserGrammarResponse
    from sqlalchemy import select, and_
    gram = (
        await test_db_session.execute(
            select(UserGrammar).where(
                and_(UserGrammar.id == res.item_id, UserGrammar.user_id == "user_unit_test")
            )
        )
    ).scalars().first()
    resp = UserGrammarResponse.model_validate(gram)
    assert resp.formation == "caller formation"
    assert resp.examples[0]["sentence_ja"] == "呼例文。"


@pytest.mark.asyncio
async def test_ingest_grammar_saved_enriches_via_ai_when_missing(test_db_session):
    with patch(
        "app.services.reader_service.ReaderService.lookup_grammar",
        new=AsyncMock(return_value=_lookup_result()),
    ) as mock_lookup:
        res = await KnowledgeService.ingest_learning_event(
            db=test_db_session, user_id="user_unit_test", req=_word_saved_req()
        )
    assert res.success is True
    assert res.ai_enriched is True
    mock_lookup.assert_awaited_once()

    from app.schemas.knowledge import UserGrammarResponse
    from sqlalchemy import select, and_
    gram = (
        await test_db_session.execute(
            select(UserGrammar).where(
                and_(UserGrammar.id == res.item_id, UserGrammar.user_id == "user_unit_test")
            )
        )
    ).scalars().first()
    resp = UserGrammarResponse.model_validate(gram)
    assert "V普通形" in (resp.formation or "")
    assert len(resp.examples) == 2


@pytest.mark.asyncio
async def test_ingest_grammar_saved_ai_failure_still_saves_basic(test_db_session):
    with patch(
        "app.services.reader_service.ReaderService.lookup_grammar",
        new=AsyncMock(side_effect=ValueError("Groq 429 overloaded")),
    ):
        res = await KnowledgeService.ingest_learning_event(
            db=test_db_session, user_id="user_unit_test", req=_word_saved_req()
        )
    assert res.success is True
    assert res.ai_enriched is False


@pytest.mark.asyncio
async def test_enrich_grammar_detail_backfills_old_pattern(test_db_session):
    with patch(
        "app.services.reader_service.ReaderService.lookup_grammar",
        new=AsyncMock(side_effect=ValueError("offline at save time")),
    ):
        res = await KnowledgeService.ingest_learning_event(
            db=test_db_session, user_id="user_unit_test",
            req=_word_saved_req(term="〜ざるを得ない"),
        )
    assert res.ai_enriched is False

    with patch(
        "app.services.reader_service.ReaderService.lookup_grammar",
        new=AsyncMock(return_value=_lookup_result(pattern="〜ざるを得ない")),
    ):
        resp = await KnowledgeService.enrich_grammar_detail(
            db=test_db_session, user_id="user_unit_test", grammar_id=res.item_id
        )
    assert resp.formation
    assert len(resp.examples) == 2


@pytest.mark.asyncio
async def test_enrich_grammar_detail_skips_when_already_complete(test_db_session):
    req = _word_saved_req(formation="already there")
    res = await KnowledgeService.ingest_learning_event(
        db=test_db_session, user_id="user_unit_test", req=req
    )
    with patch(
        "app.services.reader_service.ReaderService.lookup_grammar",
        new=AsyncMock(side_effect=AssertionError("AI must not be called for complete patterns")),
    ):
        resp = await KnowledgeService.enrich_grammar_detail(
            db=test_db_session, user_id="user_unit_test", grammar_id=res.item_id
        )
    assert resp.formation == "already there"
