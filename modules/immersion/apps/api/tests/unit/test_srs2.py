import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy import select, and_

from app.models.knowledge import ReviewState, UserVocabulary, UserExpression, UserGrammar
from app.schemas.knowledge import LearningEventRequest
from app.services.knowledge_service import KnowledgeService


async def _save_vocab(test_db_session, term="曖昧", meaning="mơ hồ"):
    res = await KnowledgeService.ingest_learning_event(
        db=test_db_session, user_id="user_unit_test",
        req=LearningEventRequest(
            event_type="WORD_SAVED", item_type="VOCABULARY", term=term,
            normalized_form=term, reading="あいまい", meaning=meaning,
            sentence_text="彼の返事は曖昧だった。",
        ),
    )
    return res.item_id


async def _save_expression(test_db_session, expression="対策を講じる", meaning="thực hiện biện pháp"):
    res = await KnowledgeService.ingest_learning_event(
        db=test_db_session, user_id="user_unit_test",
        req=LearningEventRequest(
            event_type="WORD_SAVED", item_type="EXPRESSION", term=expression,
            reading="たいさくをこうじる", meaning=meaning,
            sentence_text=f"政府は{expression}。",
        ),
    )
    return res.item_id


async def _save_grammar(test_db_session, pattern="〜わけではない"):
    res = await KnowledgeService.ingest_learning_event(
        db=test_db_session, user_id="user_unit_test",
        req=LearningEventRequest(
            event_type="WORD_SAVED", item_type="GRAMMAR", term=pattern,
            meaning=f"nghĩa của {pattern}",
            formation=f"Công thức {pattern}",
            usage_context=f"Hoàn cảnh {pattern}",
            examples=[{"sentence_ja": f"{pattern}の例文。", "sentence_vi": "vd."}],
            sentence_text=f"{pattern}の文。",
        ),
    )
    return res.item_id


@pytest.mark.asyncio
async def test_word_saved_creates_review_state_for_all_types(test_db_session):
    v_id = await _save_vocab(test_db_session)
    e_id = await _save_expression(test_db_session)
    g_id = await _save_grammar(test_db_session)
    for item_type, item_id in (("VOCABULARY", v_id), ("EXPRESSION", e_id), ("GRAMMAR", g_id)):
        row = (
            await test_db_session.execute(
                select(ReviewState).where(
                    and_(ReviewState.user_id == "user_unit_test",
                         ReviewState.item_type == item_type,
                         ReviewState.item_id == item_id)
                )
            )
        ).scalars().first()
        assert row is not None
        assert row.due_status == "DUE"


async def _echo_distractors(specs):
    """Fake AI distractor batch: 3 distractors per requested card key."""
    return {s["key"]: [f"nhiễu {s['key']}-{i}" for i in range(1, 4)] for s in specs}


@pytest.mark.asyncio
async def test_session_builds_all_three_card_types(test_db_session):
    await _save_vocab(test_db_session, "曖昧", "mơ hồ 1")
    await _save_vocab(test_db_session, "漠然", "mơ hồ 2")
    await _save_vocab(test_db_session, "不明瞭", "không rõ 3")
    await _save_vocab(test_db_session, "明確", "rõ ràng 4")
    await _save_expression(test_db_session, "対策を講じる", "thực hiện biện pháp 1")
    await _save_expression(test_db_session, "措置を取る", "áp dụng biện pháp 2")
    await _save_expression(test_db_session, "方針を決める", "quyết định phương châm 3")
    await _save_grammar(test_db_session, "〜わけではない")
    await _save_grammar(test_db_session, "〜ざるを得ない")
    await _save_grammar(test_db_session, "〜がちだ")

    with patch.object(
        KnowledgeService, "_ai_session_distractors", new=AsyncMock(side_effect=_echo_distractors)
    ), patch.object(KnowledgeService, "NEW_CARDS_PER_SESSION", 20):
        resp = await KnowledgeService.start_review_session(
            db=test_db_session, user_id="user_unit_test", limit=12
        )
    kinds = {(c.item_type, c.review_type) for c in resp.cards}
    assert any(t == "VOCABULARY" for t, _ in kinds)
    assert any(t == "EXPRESSION" for t, _ in kinds)
    assert any(t == "GRAMMAR" for t, _ in kinds)
    for card in resp.cards:
        assert len(card.options) >= 3
        assert sum(1 for o in card.options if o.is_correct) == 1
        assert set(card.interval_preview.keys()) == {"again", "hard", "good", "easy"}
        assert card.interval_preview["again"] <= card.interval_preview["easy"]


@pytest.mark.asyncio
async def test_ai_distractors_attached_when_available(test_db_session):
    v_id = await _save_vocab(test_db_session)
    fake_map = {f"VOCABULARY:{v_id}:CONTEXT_MEANING": ["nhiễu A", "nhiễu B", "nhiễu C"]}
    with patch.object(
        KnowledgeService, "_ai_session_distractors", new=AsyncMock(return_value=fake_map)
    ):
        resp = await KnowledgeService.start_review_session(
            db=test_db_session, user_id="user_unit_test", limit=5
        )
    assert len(resp.cards) >= 1
    texts = [o.text for o in resp.cards[0].options]
    assert "nhiễu A" in texts


@pytest.mark.asyncio
async def test_ai_failure_raises_instead_of_fallback(test_db_session):
    await _save_vocab(test_db_session)  # single word, AI mocked to fail
    with patch.object(
        KnowledgeService, "_ai_session_distractors", new=AsyncMock(return_value={})
    ):
        with pytest.raises(ValueError, match="Không tạo được đáp án nhiễu"):
            await KnowledgeService.start_review_session(
                db=test_db_session, user_id="user_unit_test", limit=5
            )


@pytest.mark.asyncio
async def test_leech_auto_suspends_at_threshold(test_db_session):
    v_id = await _save_vocab(test_db_session)
    state = (
        await test_db_session.execute(
            select(ReviewState).where(
                and_(ReviewState.user_id == "user_unit_test",
                     ReviewState.item_type == "VOCABULARY",
                     ReviewState.item_id == v_id)
            )
        )
    ).scalars().first()
    state.lapses = 7
    await test_db_session.commit()

    from app.schemas.knowledge import SubmitReviewAnswerRequest
    res = await KnowledgeService.submit_review_rating(
        db=test_db_session, user_id="user_unit_test",
        req=SubmitReviewAnswerRequest(
            item_id=v_id, item_type="VOCABULARY", rating=1, answer_was_correct=False
        ),
    )
    assert res.leech_suspended is True
    await test_db_session.refresh(state)
    assert state.due_status == "SUSPENDED"


@pytest.mark.asyncio
async def test_suspend_and_due_breakdown(test_db_session):
    v_id = await _save_vocab(test_db_session)
    e_id = await _save_expression(test_db_session)

    bd = await KnowledgeService.get_due_breakdown(db=test_db_session, user_id="user_unit_test")
    assert bd["total"] == 2
    assert bd["vocabulary"] == 1
    assert bd["expression"] == 1
    assert bd["new"] == 2

    await KnowledgeService.suspend_review_item(
        db=test_db_session, user_id="user_unit_test", item_type="EXPRESSION", item_id=e_id
    )
    bd2 = await KnowledgeService.get_due_breakdown(db=test_db_session, user_id="user_unit_test")
    assert bd2["total"] == 1
    assert bd2["expression"] == 0


@pytest.mark.asyncio
async def test_finish_session_persists_stats(test_db_session):
    await _save_vocab(test_db_session)
    with patch.object(
        KnowledgeService, "_ai_session_distractors", new=AsyncMock(return_value={})
    ):
        # Single word cannot build options → create session manually instead
        pass
    from app.models.knowledge import ReviewSession
    s = ReviewSession(user_id="user_unit_test", items_total=3)
    test_db_session.add(s)
    await test_db_session.commit()
    await test_db_session.refresh(s)

    out = await KnowledgeService.finish_review_session(
        db=test_db_session, user_id="user_unit_test", session_id=s.id,
        items_completed=3, ratings={"1": 1, "3": 1, "4": 1},
    )
    assert out["success"] is True
    assert out["score"] == 2
    await test_db_session.refresh(s)
    assert s.items_completed == 3
    assert s.ended_at is not None


@pytest.mark.asyncio
async def test_new_cards_capped_per_session(test_db_session):
    for i in range(8):
        await _save_vocab(test_db_session, term=f"単語{i}", meaning=f"nghĩa {i}")
    with patch.object(
        KnowledgeService, "_ai_session_distractors", new=AsyncMock(side_effect=_echo_distractors)
    ):
        resp = await KnowledgeService.start_review_session(
            db=test_db_session, user_id="user_unit_test", limit=12
        )
    # 8 new states but capped at NEW_CARDS_PER_SESSION
    assert len(resp.cards) <= KnowledgeService.NEW_CARDS_PER_SESSION
