"""XP ledger tests (Phase 7): deterministic level curve, idempotent awards,
high-score bonus, retry improvement and history reads."""

from app.core.config import Settings
from app.models import Exercise
from app.repositories import ExerciseRepository, XPEventRepository
from app.services.gamification_service import level_info

from conftest import exercise_factory
from gamification_helpers import build_gamification_service

SCORES_GOOD = {
    "overall_score": 85,
    "semantic_score": 88,
    "grammar_score": 80,
    "vocabulary_score": 82,
    "naturalness_score": 87,
    "context_fit_score": 80,
    "register_fit_score": 75,
}


def test_level_info_curve() -> None:
    assert level_info(0, 100)["current_level"] == 1
    assert level_info(0, 100)["xp_to_next_level"] == 100
    assert level_info(99, 100)["current_level"] == 1
    assert level_info(100, 100)["current_level"] == 2
    assert level_info(100, 100)["xp_in_level"] == 0
    assert level_info(300, 100)["current_level"] == 3  # 100 + 200
    assert level_info(350, 100)["current_level"] == 3
    assert level_info(350, 100)["xp_in_level"] == 50
    assert level_info(350, 100)["xp_to_next_level"] == 250
    assert level_info(350, 100)["progress_percent"] == 16


async def test_award_is_idempotent(session) -> None:
    service = build_gamification_service(session)
    event = await service._award(
        None,
        "exercise_complete",
        10,
        "exercise_attempt",
        "attempt-1",
        "exercise:attempt-1:complete",
    )
    assert event is not None
    again = await service._award(
        None,
        "exercise_complete",
        10,
        "exercise_attempt",
        "attempt-1",
        "exercise:attempt-1:complete",
    )
    assert again is None
    rows, total = await XPEventRepository(session).list_by_user(None)
    assert total == 1
    assert rows[0].amount == 10
    assert rows[0].event_type == "exercise_complete"


async def test_award_zero_amount_only_encouragement(session) -> None:
    service = build_gamification_service(session)
    assert await service._award(None, "daily_goal", 0, "daily_goal", "2026-01-01", "k") is None
    event = await service._award(None, "encouragement", 0, "encouragement", "2026-01-01", "e1")
    assert event is not None
    assert event.amount == 0


async def test_record_exercise_activity_awards_completion_and_bonus(session) -> None:
    exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
    service = build_gamification_service(session, settings=Settings(ai_encouragement_enabled=False))
    events = await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id="attempt-1",
        scores=SCORES_GOOD,
        is_first_attempt=True,
        previous_best=None,
    )
    assert events["enabled"] is True
    types = [e["event_type"] for e in events["xp_events"]]
    assert types == ["exercise_complete", "high_score_bonus"]
    assert sum(e["amount"] for e in events["xp_events"]) == 15
    assert await XPEventRepository(session).total_xp(None) == 15


async def test_retry_improvement_awarded_without_first_attempt_bonus(session) -> None:
    exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
    service = build_gamification_service(session, settings=Settings(ai_encouragement_enabled=False))
    events = await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id="attempt-2",
        scores=SCORES_GOOD,
        is_first_attempt=False,
        previous_best=70,
    )
    types = [e["event_type"] for e in events["xp_events"]]
    assert types == ["exercise_complete", "retry_improvement"]
    assert sum(e["amount"] for e in events["xp_events"]) == 15


async def test_retry_without_meaningful_improvement(session) -> None:
    exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
    service = build_gamification_service(session)
    events = await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id="attempt-2",
        scores=SCORES_GOOD,
        is_first_attempt=False,
        previous_best=84,
    )
    types = [e["event_type"] for e in events["xp_events"]]
    assert types == ["exercise_complete"]
    assert events["encouragement"] is None


async def test_record_exercise_activity_never_raises(session) -> None:
    service = build_gamification_service(session, settings=Settings(gamification_enabled=False))
    events = await service.record_exercise_activity(
        None,
        exercise=Exercise(**exercise_factory()),
        attempt_id="attempt-1",
        scores={"overall_score": 90},
        is_first_attempt=True,
        previous_best=None,
    )
    assert events == {"enabled": False}


async def test_summary_and_history(session) -> None:
    exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
    service = build_gamification_service(session, settings=Settings(ai_encouragement_enabled=False))
    await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id="attempt-1",
        scores=SCORES_GOOD,
        is_first_attempt=True,
        previous_best=None,
    )
    await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id="attempt-2",
        scores=SCORES_GOOD,
        is_first_attempt=False,
        previous_best=70,
    )
    summary = await service.summary(None)
    assert summary["level"]["current_level"] == 1
    assert summary["level"]["current_xp"] == 30
    assert summary["today_xp"] == 30

    items, total = await service.xp_history(None)
    assert total == 4
    types = {i["event_type"] for i in items}
    assert types == {"exercise_complete", "high_score_bonus", "retry_improvement"}
    assert all(i["metadata"] is not None for i in items)


async def test_normalize_scores_accepts_both_conventions(session) -> None:
    from app.services.gamification_service import normalize_scores

    assert normalize_scores({"overall_score": 90}) == {"overall": 90}
    assert normalize_scores({"overall": 90, "naturalness_score": 80}) == {
        "overall": 90,
        "naturalness": 80,
    }
