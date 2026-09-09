"""Milestone tests (Phase 7): deterministic detection across exercise and
challenge activity, one-time XP +50, persisted celebrations and the read API."""

from datetime import date

from app.core.config import Settings
from app.models import Exercise, ExerciseType, JlptLevel, Register, TargetLength
from app.repositories import ExerciseRepository, MilestoneRepository, XPEventRepository
from app.services.timezone_service import utc_from_local_day

from conftest import exercise_factory
from gamification_helpers import build_gamification_service
from scripted_provider import ScriptedAIProvider


def _settings() -> Settings:
    return Settings(ai_encouragement_enabled=False, ai_progress_summary_enabled=False)


def _scores(overall: int = 85, naturalness: int = 90) -> dict:
    return {
        "overall_score": overall,
        "semantic_score": 85,
        "grammar_score": 85,
        "vocabulary_score": 85,
        "naturalness_score": naturalness,
        "context_fit_score": 85,
        "register_fit_score": 85,
    }


async def _exercise(session, **overrides) -> Exercise:
    return await ExerciseRepository(session).add(Exercise(**exercise_factory(**overrides)))


async def test_exercises_10_milestone(session) -> None:
    exercise = await _exercise(session)
    service = build_gamification_service(session, settings=_settings())
    for index in range(1, 11):
        await service.record_exercise_activity(
            None,
            exercise=exercise,
            attempt_id=f"a{index}",
            scores=_scores(overall=70),
            is_first_attempt=True,
            previous_best=None,
            now=utc_from_local_day(date(2026, 8, 10)),
        )
    milestones = await service.milestones(None)
    keys = {m["milestone_key"] for m in milestones}
    assert "exercises_10" in keys
    assert await XPEventRepository(session).count_by_type(None, "milestone") == 1
    assert await XPEventRepository(session).total_xp(None) == 10 * 10 + 25 + 50


async def test_milestone_awarded_only_once(session) -> None:
    exercise = await _exercise(session)
    service = build_gamification_service(session, settings=_settings())
    for index in range(1, 12):
        await service.record_exercise_activity(
            None,
            exercise=exercise,
            attempt_id=f"a{index}",
            scores=_scores(overall=70),
            is_first_attempt=True,
            previous_best=None,
            now=utc_from_local_day(date(2026, 8, 10)),
        )
    milestones = await service.milestones(None)
    assert sum(1 for m in milestones if m["milestone_key"] == "exercises_10") == 1
    assert await XPEventRepository(session).count_by_type(None, "milestone") == 1


async def test_streak_7_milestone(session) -> None:
    exercise = await _exercise(session)
    service = build_gamification_service(session, settings=_settings())
    for day_offset in range(7):
        await service.record_exercise_activity(
            None,
            exercise=exercise,
            attempt_id=f"a{day_offset}",
            scores=_scores(overall=70),
            is_first_attempt=True,
            previous_best=None,
            now=utc_from_local_day(date(2026, 8, 1 + day_offset)),
        )
    keys = {m["milestone_key"] for m in await service.milestones(None)}
    assert "streak_7" in keys


async def test_first_paragraph_milestone(session) -> None:
    exercise = await _exercise(session, target_length=TargetLength.PARAGRAPH)
    service = build_gamification_service(session, settings=_settings())
    await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id="a1",
        scores=_scores(overall=70),
        is_first_attempt=True,
        previous_best=None,
    )
    keys = {m["milestone_key"] for m in await service.milestones(None)}
    assert "first_paragraph" in keys


async def test_naturalness_90_milestone(session) -> None:
    exercise = await _exercise(session)
    service = build_gamification_service(session, settings=_settings())
    await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id="a1",
        scores=_scores(overall=70, naturalness=95),
        is_first_attempt=True,
        previous_best=None,
    )
    keys = {m["milestone_key"] for m in await service.milestones(None)}
    assert "naturalness_90" in keys
    item = [m for m in await service.milestones(None) if m["milestone_key"] == "naturalness_90"][0]
    assert item["celebration"] is not None
    assert item["celebration"]["message"]


async def test_first_n2_milestone(session) -> None:
    exercise = await _exercise(session, jlpt_level=JlptLevel.N2)
    service = build_gamification_service(session, settings=_settings())
    await service.record_exercise_activity(
        None,
        exercise=exercise,
        attempt_id="a1",
        scores=_scores(overall=70),
        is_first_attempt=True,
        previous_best=None,
    )
    keys = {m["milestone_key"] for m in await service.milestones(None)}
    assert "first_n2" in keys


async def test_first_business_challenge_milestone(session) -> None:
    challenge_exercise = await _exercise(
        session, exercise_type=ExerciseType.FREE_WRITING, register=Register.BUSINESS
    )
    provider = ScriptedAIProvider()
    service = build_gamification_service(session, provider=provider, settings=_settings())
    from app.models import Challenge

    challenge = Challenge(
        user_id=None,
        challenge_type="register",
        instruction_vi="Hãy viết lại câu này theo phong cách business.",
        source_text="今日はとても忙しいです。",
        target_skill="register_fit",
        difficulty=5,
        objective="Câu chuyển sang phong cách business.",
        required_expression=None,
        exercise_id=challenge_exercise.id,
        status="active",
        provider="fake",
        model="",
        prompt_version="challenge_generation:v1",
    )
    from app.repositories import ChallengeRepository

    challenge = await ChallengeRepository(session).add(challenge)
    await service.record_challenge_activity(
        None,
        challenge=challenge,
        exercise=challenge_exercise,
        score=90,
        success=True,
    )
    keys = {m["milestone_key"] for m in await service.milestones(None)}
    assert "first_business_challenge" in keys


async def test_no_milestones_without_activity(session) -> None:
    service = build_gamification_service(session, settings=_settings())
    assert await MilestoneRepository(session).count() == 0
    assert await service.milestones(None) == []
