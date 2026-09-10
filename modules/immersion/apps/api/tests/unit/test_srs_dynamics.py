from datetime import datetime, timedelta
import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy import select, and_, func

from app.models.knowledge import ReviewState, ReviewLog
from app.schemas.knowledge import (
    LearningEventRequest,
    SubmitReviewAnswerRequest,
    SrsPreferenceUpdateRequest,
)
from app.services.knowledge_service import KnowledgeService


async def _save_vocab(test_db_session, term, meaning="nghĩa"):
    res = await KnowledgeService.ingest_learning_event(
        db=test_db_session, user_id="dyn_user",
        req=LearningEventRequest(
            event_type="WORD_SAVED", item_type="VOCABULARY", term=term,
            normalized_form=term, reading="よみ", meaning=meaning,
            sentence_text=f"{term}の文。",
        ),
    )
    return res.item_id


def _echo_distractors(specs):
    return {s["key"]: [f"nhiễu {s['key']}-{i}" for i in range(1, 4)] for s in specs}


async def _state(test_db_session, item_id):
    return (
        await test_db_session.execute(
            select(ReviewState).where(
                and_(ReviewState.user_id == "dyn_user",
                      ReviewState.item_type == "VOCABULARY",
                      ReviewState.item_id == item_id)
            )
        )
    ).scalars().first()


@pytest.mark.asyncio
async def test_queue_orders_most_forgotten_first(test_db_session):
    ids = [await _save_vocab(test_db_session, f"単語{i}") for i in range(6)]
    a, b = ids[0], ids[4]
    now = datetime.utcnow()
    # Staggered forgetting: A most forgotten, B least (among due).
    profiles = [(30, 5.0), (20, 6.0), (10, 8.0), (5, 12.0), (2, 40.0), (0, 1.0)]
    for item_id, (days_ago, s) in zip(ids, profiles):
        st = await _state(test_db_session, item_id)
        if days_ago > 0:
            st.last_review_at = now - timedelta(days=days_ago)
            st.next_review_at = now - timedelta(hours=1)
            st.stability = s
            st.reps = 2
    await test_db_session.commit()

    with patch.object(
        KnowledgeService, "_ai_session_distractors", new=AsyncMock(side_effect=_echo_distractors)
    ):
        first = await KnowledgeService.start_review_session(
            db=test_db_session, user_id="dyn_user", limit=10
        )
        second = await KnowledgeService.start_review_session(
            db=test_db_session, user_id="dyn_user", limit=10
        )
    order = [c.item_id for c in first.cards]
    # A (lowest R) sits in the first band, B (highest R among due) in a later
    # band → A always surfaces before B.
    assert order.index(a) < order.index(b)
    # Same seed + same day → deterministic order across builds.
    assert [c.item_id for c in second.cards] == order


@pytest.mark.asyncio
async def test_submit_writes_review_log_and_uses_prefs(test_db_session):
    v = await _save_vocab(test_db_session, "単語L")
    await KnowledgeService.update_srs_preferences(
        db=test_db_session, user_id="dyn_user",
        req=SrsPreferenceUpdateRequest(request_retention=0.95, max_interval=100, new_per_session=3),
    )
    pref = await KnowledgeService.get_srs_preferences(db=test_db_session, user_id="dyn_user")
    assert pref.request_retention == pytest.approx(0.95)
    assert pref.new_per_session == 3

    res = await KnowledgeService.submit_review_rating(
        db=test_db_session, user_id="dyn_user",
        req=SubmitReviewAnswerRequest(item_id=v, item_type="VOCABULARY", rating=3),
    )
    assert res.scheduled_days >= 1
    logs = (await test_db_session.execute(
        select(func.count(ReviewLog.id)).where(ReviewLog.user_id == "dyn_user")
    )).scalar()
    assert logs == 1


@pytest.mark.asyncio
async def test_prefs_update_and_engine_clamp(test_db_session):
    from app.services import fsrs as fsrs_engine

    # API schema rejects out-of-range values with 422 (tested at boundary).
    pref = await KnowledgeService.update_srs_preferences(
        db=test_db_session, user_id="dyn_user",
        req=SrsPreferenceUpdateRequest(request_retention=0.8, max_interval=7, new_per_session=20),
    )
    assert pref.request_retention == pytest.approx(0.8)
    assert pref.max_interval == 7
    assert pref.new_per_session == 20
    # Service-level clamp protects direct callers.
    assert fsrs_engine.clamp_retention(0.2) == pytest.approx(0.8)
    assert fsrs_engine.clamp_retention(1.5) == pytest.approx(0.99)


@pytest.mark.asyncio
async def test_forecast_shape_and_recall_rate(test_db_session):
    v = await _save_vocab(test_db_session, "単語F")
    fc = await KnowledgeService.forecast_review_load(db=test_db_session, user_id="dyn_user", days=7)
    assert len(fc.days) == 7
    assert fc.retention_30d == 0.0
    await KnowledgeService.submit_review_rating(
        db=test_db_session, user_id="dyn_user",
        req=SubmitReviewAnswerRequest(item_id=v, item_type="VOCABULARY", rating=4),
    )
    fc2 = await KnowledgeService.forecast_review_load(db=test_db_session, user_id="dyn_user", days=7)
    assert fc2.retention_30d == pytest.approx(1.0)
