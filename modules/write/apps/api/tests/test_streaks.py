"""Streak tests (Phase 7): consecutive-day counting in the app timezone,
missed-day reset, same-day dedupe and the streak_enabled preference gate."""

from datetime import date

from app.models import Exercise
from app.repositories import ExerciseRepository, UserStreakRepository
from app.services.timezone_service import utc_from_local_day

from conftest import exercise_factory
from gamification_helpers import build_gamification_service, build_profile_service

SCORES = {"overall_score": 75, "naturalness_score": 70, "semantic_score": 70}


async def _exercise(session) -> Exercise:
    return await ExerciseRepository(session).add(Exercise(**exercise_factory()))


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


async def test_streak_counts_consecutive_days(session) -> None:
    exercise = await _exercise(session)
    service = build_gamification_service(session)
    await _record(service, exercise, date(2026, 8, 10), "a1")
    await _record(service, exercise, date(2026, 8, 11), "a2")
    await _record(service, exercise, date(2026, 8, 12), "a3")
    streak = await UserStreakRepository(session).get_for_user(None)
    assert streak is not None
    assert streak.current_streak == 3
    assert streak.longest_streak == 3
    assert streak.last_active_date == date(2026, 8, 12)
    summary = await service.summary(None)
    assert summary["current_streak"] == 3
    assert summary["longest_streak"] == 3


async def test_missed_day_resets_current_keeps_longest(session) -> None:
    exercise = await _exercise(session)
    service = build_gamification_service(session)
    await _record(service, exercise, date(2026, 8, 10), "a1")
    await _record(service, exercise, date(2026, 8, 11), "a2")
    await _record(service, exercise, date(2026, 8, 14), "a3")
    streak = await UserStreakRepository(session).get_for_user(None)
    assert streak.current_streak == 1
    assert streak.longest_streak == 2


async def test_same_day_activity_does_not_increment(session) -> None:
    exercise = await _exercise(session)
    service = build_gamification_service(session)
    await _record(service, exercise, date(2026, 8, 10), "a1")
    await _record(service, exercise, date(2026, 8, 10), "a2")
    streak = await UserStreakRepository(session).get_for_user(None)
    assert streak.current_streak == 1


async def test_streak_disabled_via_preference(session) -> None:
    exercise = await _exercise(session)
    service = build_gamification_service(session)
    profile = await build_profile_service(session).get_or_create(None)
    profile.preferences = {"streak_enabled": False}
    await build_profile_service(session)._repository.update(profile)
    await _record(service, exercise, date(2026, 8, 10), "a1")
    assert await UserStreakRepository(session).get_for_user(None) is None
    summary = await service.summary(None)
    assert summary["current_streak"] == 0
