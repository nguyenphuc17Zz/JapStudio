import pytest
from unittest.mock import AsyncMock, patch

from app.models.knowledge import UserVocabulary
from app.schemas.knowledge import LearningEventRequest
from app.schemas.reader import SelectionLookupResponse
from app.services.knowledge_service import KnowledgeService


def _lookup_result(**overrides) -> SelectionLookupResponse:
    base = {
        "query": "曖昧",
        "reading": "あいまい",
        "meaning_vi": "mơ hồ, không rõ ràng",
        "part_of_speech": "adjective",
        "jlpt_level": "N2",
        "nuance": "Sắc thái trung tính, dùng khiboundary không rõ.",
        "collocation": "曖昧な態度 (thái độ mập mờ)",
        "example_usage": "",
        "examples": [
            {"sentence_ja": "彼の返事は曖昧だった。", "sentence_vi": "Câu trả lời của anh ấy rất mập mờ."},
            {"sentence_ja": "曖昧な表現を避ける。", "sentence_vi": "Tránh cách diễn đạt mập mờ."},
        ],
        "alternatives": [
            {"expression": "漠然", "reading": "ばくぜん", "meaning_vi": "mơ hồ", "difference": "漠然 nhấn mạnh thiếu trọng tâm."},
            {"expression": "不明瞭", "reading": "ふめいりょう", "meaning_vi": "không rõ ràng", "difference": "不明瞭 thiên về khó nhìn/khó nghe."},
        ],
        "model_provider": "mock",
        "model_name": "mock-model",
    }
    base.update(overrides)
    return SelectionLookupResponse(**base)


def _word_saved_req(**overrides) -> LearningEventRequest:
    base = {
        "event_type": "WORD_SAVED",
        "item_type": "VOCABULARY",
        "term": "曖昧",
        "normalized_form": "曖昧",
        "reading": "あいまい",
        "meaning": "mơ hồ",
        "part_of_speech": "adjective",
        "sentence_text": "彼の返事は曖昧だった。",
        "source_name": "Test",
    }
    base.update(overrides)
    return LearningEventRequest(**base)


def _vocab_row(**overrides) -> UserVocabulary:
    base = {
        "user_id": "user_unit_test",
        "term": "曖昧",
        "normalized_form": "曖昧",
        "reading": "あいまい",
        "meaning": "mơ hồ",
    }
    base.update(overrides)
    return UserVocabulary(**base)


def test_apply_ai_detail_fills_empty_and_dedups():
    vocab = _vocab_row()
    changed = KnowledgeService._apply_ai_detail(
        vocab,
        nuance="nuance text",
        collocation="曖昧な態度",
        examples=[{"sentence_ja": "例文。", "sentence_vi": "Câu ví dụ."}],
        alternatives=[{"expression": "漠然", "reading": "ばくぜん", "meaning_vi": "mơ hồ", "difference": "khác"}],
        jlpt_level="n2",
    )
    assert changed is True
    assert vocab.nuance == "nuance text"
    assert vocab.jlpt_level == "N2"
    assert vocab.collocations_json == ["曖昧な態度"]
    assert vocab.examples_json == [{"sentence_ja": "例文。", "sentence_vi": "Câu ví dụ."}]
    assert vocab.alternatives_json[0]["expression"] == "漠然"
    assert "漠然" in (vocab.related_terms_json or [])

    # Re-applying the same data changes nothing and creates no duplicates
    changed_again = KnowledgeService._apply_ai_detail(
        vocab,
        nuance="other nuance (must not overwrite)",
        collocation="曖昧な態度",
        examples=[{"sentence_ja": "例文。", "sentence_vi": "khác"}],
        alternatives=[{"expression": "漠然", "reading": "", "meaning_vi": "", "difference": ""}],
    )
    assert changed_again is False
    assert vocab.nuance == "nuance text"
    assert len(vocab.collocations_json) == 1
    assert len(vocab.examples_json) == 1
    assert len(vocab.alternatives_json) == 1


@pytest.mark.asyncio
async def test_ingest_word_saved_with_caller_ai_data_skips_ai_call(test_db_session):
    req = _word_saved_req(
        nuance="caller nuance",
        collocation="caller collocation",
        jlpt_level="N3",
        examples=[{"sentence_ja": "呼例文。", "sentence_vi": "vd."}],
        alternatives=[{"expression": "呼近義", "reading": "", "meaning_vi": "", "difference": ""}],
    )
    with patch(
        "app.services.reader_service.ReaderService.lookup_selection",
        new=AsyncMock(side_effect=AssertionError("AI must not be called when caller supplies detail")),
    ):
        res = await KnowledgeService.ingest_learning_event(
            db=test_db_session, user_id="user_unit_test", req=req
        )
    assert res.success is True
    assert res.ai_enriched is True

    detail = await KnowledgeService.get_vocabulary_detail(
        db=test_db_session, user_id="user_unit_test", vocab_id=res.item_id
    )
    assert detail.nuance == "caller nuance"
    assert detail.jlpt_level == "N3"
    assert "caller collocation" in detail.collocations
    assert detail.examples[0]["sentence_ja"] == "呼例文。"
    assert detail.alternatives[0]["expression"] == "呼近義"


@pytest.mark.asyncio
async def test_ingest_word_saved_enriches_via_ai_when_missing(test_db_session):
    with patch(
        "app.services.reader_service.ReaderService.lookup_selection",
        new=AsyncMock(return_value=_lookup_result()),
    ) as mock_lookup:
        res = await KnowledgeService.ingest_learning_event(
            db=test_db_session, user_id="user_unit_test", req=_word_saved_req()
        )
    assert res.success is True
    assert res.ai_enriched is True
    mock_lookup.assert_awaited_once()

    detail = await KnowledgeService.get_vocabulary_detail(
        db=test_db_session, user_id="user_unit_test", vocab_id=res.item_id
    )
    assert "Sắc thái" in (detail.nuance or "")
    assert detail.jlpt_level == "N2"
    assert len(detail.examples) == 2
    assert len(detail.alternatives) == 2
    assert "漠然" in detail.related_terms


@pytest.mark.asyncio
async def test_ingest_word_saved_ai_failure_still_saves_basic(test_db_session):
    with patch(
        "app.services.reader_service.ReaderService.lookup_selection",
        new=AsyncMock(side_effect=ValueError("Groq 429 overloaded")),
    ):
        res = await KnowledgeService.ingest_learning_event(
            db=test_db_session, user_id="user_unit_test", req=_word_saved_req()
        )
    assert res.success is True
    assert res.ai_enriched is False

    detail = await KnowledgeService.get_vocabulary_detail(
        db=test_db_session, user_id="user_unit_test", vocab_id=res.item_id
    )
    assert detail.term == "曖昧"
    assert not detail.nuance
    assert detail.examples == []


@pytest.mark.asyncio
async def test_enrich_vocabulary_detail_backfills_old_word(test_db_session):
    # Simulate an "old" word saved before AI detail existed (AI failed at save).
    with patch(
        "app.services.reader_service.ReaderService.lookup_selection",
        new=AsyncMock(side_effect=ValueError("offline at save time")),
    ):
        res = await KnowledgeService.ingest_learning_event(
            db=test_db_session, user_id="user_unit_test",
            req=_word_saved_req(term="旧語", normalized_form="旧語", sentence_text="旧語の例文。"),
        )
    assert res.ai_enriched is False

    with patch(
        "app.services.reader_service.ReaderService.lookup_selection",
        new=AsyncMock(return_value=_lookup_result()),
    ):
        detail = await KnowledgeService.enrich_vocabulary_detail(
            db=test_db_session, user_id="user_unit_test", vocab_id=res.item_id
        )
    assert detail.nuance
    assert len(detail.examples) == 2
    assert len(detail.alternatives) == 2


@pytest.mark.asyncio
async def test_enrich_vocabulary_detail_skips_when_already_complete(test_db_session):
    req = _word_saved_req(nuance="already there")
    res = await KnowledgeService.ingest_learning_event(
        db=test_db_session, user_id="user_unit_test", req=req
    )
    with patch(
        "app.services.reader_service.ReaderService.lookup_selection",
        new=AsyncMock(side_effect=AssertionError("AI must not be called for complete words")),
    ):
        detail = await KnowledgeService.enrich_vocabulary_detail(
            db=test_db_session, user_id="user_unit_test", vocab_id=res.item_id
        )
    assert detail.nuance == "already there"
