"""Daily mission tests (Phase 7): once-per-day generation, regeneration,
progress counting, zero-XP completion and deterministic fallbacks."""

from datetime import date

from app.core.config import Settings
from app.repositories import DailyMissionRepository, XPEventRepository
from app.schemas.gamification_ai import DailyMissionResult
from app.services.timezone_service import utc_from_local_day

from gamification_helpers import build_gamification_service, build_mission_service
from scripted_provider import ScriptedAIProvider


def _mission_result(**overrides) -> DailyMissionResult:
    base = {
        "mission_type": "weakness_focus",
        "title": "Luyện tập ngữ pháp hôm nay",
        "description": "Hoàn thành các bài viết tập trung ngữ pháp.",
        "target_count": 3,
        "focus_skills": ["grammar"],
        "topic": "Công việc hằng ngày",
        "register": "polite",
        "difficulty": 5,
        "reason": "Cải thiện ngữ pháp.",
    }
    base.update(overrides)
    return DailyMissionResult(**base)


async def test_mission_generated_once_per_day(session) -> None:
    service = build_mission_service(session)
    first = await service.get_or_generate(None)
    second = await service.get_or_generate(None)
    assert first is not None
    assert first.id == second.id
    rows = await DailyMissionRepository(session).list_by_user_date(None, first.mission_date)
    assert len(rows) == 1


async def test_regenerate_archives_and_creates_replacement(session) -> None:
    service = build_mission_service(session)
    first = await service.get_or_generate(None)
    replacement = await service.regenerate(None)
    assert replacement is not None
    assert replacement.id != first.id
    assert replacement.status == "active"
    rows = await DailyMissionRepository(session).list_by_user_date(None, first.mission_date)
    assert len(rows) == 2
    archived = [m for m in rows if m.id == first.id][0]
    assert archived.status == "archived"
    assert archived.archived_at is not None


async def test_record_progress_completes_and_marks_once(session) -> None:
    service = build_mission_service(session)
    mission = await service.get_or_generate(None)
    target = mission.target_count
    for _ in range(target - 1):
        mission, completed = await service.record_progress(None, mission.mission_date)
        assert completed is False
    mission, completed = await service.record_progress(None, mission.mission_date)
    assert completed is True
    assert mission.completed_count == mission.target_count
    assert mission.status == "completed"
    mission, completed = await service.record_progress(None, mission.mission_date)
    assert completed is False
    assert mission is None


async def test_mission_completion_awards_zero_xp(session) -> None:
    service = build_gamification_service(
        session, settings=Settings(ai_progress_summary_enabled=False)
    )
    mission = await service._missions.get_or_generate(None)
    for _ in range(mission.target_count):
        mission, completed = await service._missions.record_progress(None, mission.mission_date)
    assert completed is True
    assert await XPEventRepository(session).count_by_type(None, "mission_complete") == 0
    assert await XPEventRepository(session).total_xp(None) == 0


async def test_ai_failure_falls_back_to_deterministic_mission(session) -> None:
    provider = ScriptedAIProvider(fail_at=2)
    service = build_mission_service(session, provider=provider)
    mission = await service.get_or_generate(None)
    assert mission is not None
    assert mission.provider == "fallback"
    assert mission.model == "deterministic"
    assert mission.mission_type == "weakness_focus"
    assert mission.target_count >= 1


async def test_ai_values_are_validated_and_clamped(session) -> None:
    provider = ScriptedAIProvider(
        daily_missions=[
            _mission_result(
                target_count=20,
                difficulty=10,
                register="casual",
                focus_skills=["grammar", "vocabulary", "naturalness"],
            )
        ]
    )
    service = build_mission_service(session, provider=provider)
    mission = await service.get_or_generate(None)
    assert mission.target_count <= 3  # clamped to daily_target
    assert mission.difficulty == 10
    assert mission.register == "casual"
    assert mission.focus_skills == ["grammar", "vocabulary", "naturalness"]


async def test_mission_disabled_returns_none(session) -> None:
    service = build_mission_service(session, settings=Settings(ai_daily_mission_enabled=False))
    assert await service.get_or_generate(None) is None
    assert await service.regenerate(None) is None


async def test_mission_not_repeated_across_days(session) -> None:
    service = build_mission_service(session)
    day1 = await service.get_or_generate(None, now=utc_from_local_day(date(2026, 8, 10)))
    day2 = await service.get_or_generate(None, now=utc_from_local_day(date(2026, 8, 11)))
    assert day1.id != day2.id
    assert day1.mission_date != day2.mission_date
    assert await DailyMissionRepository(session).count() == 2
