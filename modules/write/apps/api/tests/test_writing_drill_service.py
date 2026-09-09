"""Unit and service tests for WritingDrillService (Phase 18)."""

import pytest
from app.models.writing_intelligence import WritingWeakness
from app.repositories.writing_drill import WritingDrillSessionRepository
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.services.writing_drill_service import WritingDrillService


@pytest.fixture
def drill_service(session):
    return WritingDrillService(
        drill_repository=WritingDrillSessionRepository(session),
        weakness_repository=WritingWeaknessRepository(session),
    )


@pytest.fixture
async def sample_weakness(session):
    repo = WritingWeaknessRepository(session)
    weakness = WritingWeakness(
        user_id=None,
        category="lexicon",
        subtype="collocation",
        description="Kết hợp từ không tự nhiên",
        examples=["お茶を食べる", "薬を飲む"],
        mastery_score=0.0,
        lifecycle_state="recurring",
        status="recurring",
    )
    return await repo.add(weakness)


@pytest.mark.asyncio
async def test_generate_session_with_weakness(drill_service, sample_weakness):
    drill_session = await drill_service.generate_session(
        user_id=None,
        weakness_id=sample_weakness.id,
    )
    assert drill_session.id
    assert drill_session.weakness_id == sample_weakness.id
    assert drill_session.weakness_category == "lexicon"
    assert drill_session.weakness_subtype == "collocation"
    assert drill_session.status == "active"
    assert drill_session.current_item_index == 0
    assert len(drill_session.items) >= 3


@pytest.mark.asyncio
async def test_hint_progression_and_reveal(drill_service, sample_weakness):
    drill_session = await drill_service.generate_session(
        user_id=None,
        weakness_id=sample_weakness.id,
    )
    # First hint
    hint_res = await drill_service.request_hint(drill_session.id)
    assert hint_res.hints_revealed_count == 1
    assert hint_res.hint is not None

    # Reveal answer
    reveal_res = await drill_service.reveal_answer(drill_session.id)
    assert reveal_res.target_answer
    assert reveal_res.explanation


@pytest.mark.asyncio
async def test_session_attempt_flow_to_completion(drill_service, sample_weakness, session):
    drill_session = await drill_service.generate_session(
        user_id=None,
        weakness_id=sample_weakness.id,
    )
    initial_score = sample_weakness.mastery_score
    total_items = len(drill_session.items)

    # Submit attempts for all items
    for idx in range(total_items):
        item = drill_session.items[idx]
        target_ans = item.get("target_answer") or "a"
        res = await drill_service.submit_attempt(
            session_id=drill_session.id,
            user_answer=target_ans,
            item_index=idx,
        )
        assert res.is_correct is True
        assert res.score >= 70

    completed_session = await drill_service.get_session(drill_session.id)
    assert completed_session.status == "completed"
    assert completed_session.outcome is not None
    assert completed_session.outcome["passed_items"] == total_items
    assert completed_session.mastery_delta > 0

    # Verify weakness mastery score updated
    weakness_repo = WritingWeaknessRepository(session)
    updated_weakness = await weakness_repo.get(sample_weakness.id)
    assert updated_weakness.mastery_score > initial_score
    assert len(updated_weakness.mastery_history) > 0


@pytest.mark.asyncio
async def test_list_due_drills(drill_service, sample_weakness):
    due_list = await drill_service.list_due_drills(user_id=None)
    assert len(due_list) >= 1
    assert any(d.weakness_id == sample_weakness.id for d in due_list)
    item = next(d for d in due_list if d.weakness_id == sample_weakness.id)
    assert item.recommended_drill_types
