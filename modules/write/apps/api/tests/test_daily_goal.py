"""Daily goal tests (Phase 7): target counting, once-per-day completion XP,
count clamping and progress payloads."""

from datetime import date

from app.core.config import Settings
from app.models import Exercise
from app.repositories import DailyGoalRepository, ExerciseRepository, XPEventRepository
from app.services.timezone_service import day_key, utc_from_local_day

from conftest import exercise_factory
from gamification_helpers import build_gamification_service

SCORES = {"overall_score": 75, "semantic_score": 70}


def _settings() -> Settings:
    return Settings(ai_progress_summary_enabled=False, ai_encouragement_enabled=False)


def _today() -> date:
    return day_key(None, _settings())


async def _record(service, exercise, day: date, attempt_id: str) -> None:
    await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id=attempt_id,
        scores=SCORES,
        is_first_attempt=True,
        previous_best=None,
        now=utc_from_local_day(day),
    )


async def test_goal_completes_at_daily_target_and_awards_once(session) -> None:
    exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
    service = build_gamification_service(session, settings=_settings())
    for index in range(1, 4):  # default daily_target = 3
        await _record(service, exercise, _today(), f"a{index}")
    goal = await DailyGoalRepository(session).get_by_user_date(None, _today())
    assert goal is not None
    assert goal.completed is True
    assert goal.completed_count == 3
    assert await XPEventRepository(session).count_by_type(None, "daily_goal") == 1
    assert await XPEventRepository(session).total_xp(None) == 10 * 3 + 25

    await _record(service, exercise, _today(), "a4")
    assert await XPEventRepository(session).count_by_type(None, "daily_goal") == 1
    goal = await DailyGoalRepository(session).get_by_user_date(None, _today())
    assert goal.completed_count == 3


async def test_goal_progress_percent(session) -> None:
    exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
    service = build_gamification_service(session, settings=_settings())
    await _record(service, exercise, _today(), "a1")
    summary = await service.summary(None)
    assert summary["daily_goal"]["completed_count"] == 1
    assert summary["daily_goal"]["target"] == 3
    assert summary["daily_goal"]["progress_percent"] == 33


async def test_goal_is_per_day(session) -> None:
    exercise = await ExerciseRepository(session).add(Exercise(**exercise_factory()))
    service = build_gamification_service(session, settings=_settings())
    for index in range(1, 4):
        await _record(service, exercise, _today(), f"a{index}")
    from datetime import timedelta

    tomorrow = _today() + timedelta(days=1)
    await _record(service, exercise, tomorrow, "b1")
    day2 = await DailyGoalRepository(session).get_by_user_date(None, tomorrow)
    assert day2 is not None
    assert day2.completed is False
    assert day2.completed_count == 1
