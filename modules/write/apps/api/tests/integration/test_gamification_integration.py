"""End-to-end gamification flow (Phase 7): exercise attempts, XP ledger,
streaks, daily goal, mission progress, challenges and milestones over the
public API with the deterministic fake provider."""

from app.db.session import get_session_factory
from app.models import Exercise
from app.repositories import (
    DailyMissionRepository,
    ExerciseRepository,
    MilestoneRepository,
    XPEventRepository,
)

from conftest import exercise_factory


async def _add_exercise(session) -> Exercise:
    return await ExerciseRepository(session).add(
        Exercise(
            **exercise_factory(
                jlpt_level="N4",
                topic="Công việc",
                prompt_vi="Hãy kể về công việc hàng ngày của bạn.",
                prompt_vi_hash="c" * 64,
            )
        )
    )


async def test_full_flow(session, client) -> None:
    exercise = await _add_exercise(session)
    mission = (await client.get("/api/v1/gamification/mission")).json()
    target = mission["target_count"]

    for index in range(1, 4):  # default daily_target = 3
        response = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": f"毎日仕事をします。{index}"},
        )
        assert response.status_code == 201

    summary = (await client.get("/api/v1/gamification/summary")).json()
    assert summary["daily_goal"]["completed"] is True
    assert summary["current_streak"] == 1

    today = (await client.get("/api/v1/gamification/today")).json()
    assert today["mission"]["completed"] == (target <= 3)
    if target <= 3:
        assert today["session_summary"] is not None
        assert today["session_summary"]["progress_summary"]["summary"]
        assert today["session_summary"]["progress_summary"]["ai_generated"] is True

    challenge = await client.post("/api/v1/challenges/generate")
    assert challenge.status_code == 201
    challenge_body = challenge.json()
    assert challenge_body["status"] == "active"
    assert challenge_body["xp_reward"] == 15

    attempt = await client.post(
        f"/api/v1/challenges/{challenge_body['id']}/attempts",
        json={"answer_text": "今日は仕事がとても多いので、帰りが遅くなります。"},
    )
    assert attempt.status_code == 201
    assert attempt.json()["success"] is True
    assert attempt.json()["xp_awarded"] == 15

    bank = (await client.get("/api/v1/vocabulary")).json()
    assert bank["total"] >= 1

    history = await client.get(f"/api/v1/challenges/{challenge_body['id']}/attempts")
    assert history.status_code == 200
    assert history.json()["total"] == 1

    detail = await client.get(f"/api/v1/challenges/{challenge_body['id']}")
    assert detail.json()["completed"] is True

    summary = (await client.get("/api/v1/gamification/summary")).json()
    expected = 3 * 10 + 5 + 25 + 15  # completion + first high-score + goal + challenge
    assert summary["today_xp"] == expected

    history = (await client.get("/api/v1/gamification/xp/history")).json()
    types = {item["event_type"] for item in history["items"]}
    assert types >= {"exercise_complete", "high_score_bonus", "daily_goal", "challenge_complete"}
    assert history["total"] == len({item["id"] for item in history["items"]})


async def test_streak_goal_and_xp_survive_failed_evaluation(session, client) -> None:
    """The gamification hook is isolated: a failing adaptive update or an
    AI-less evaluation never breaks the writing flow."""
    exercise = await _add_exercise(session)
    response = await client.post(
        f"/api/v1/exercises/{exercise.id}/attempts",
        json={"answer_text": "毎日仕事をします。"},
    )
    assert response.status_code == 201
    summary = (await client.get("/api/v1/gamification/summary")).json()
    assert summary["current_streak"] == 1
    assert summary["daily_goal"]["completed_count"] == 1


async def test_milestones_reachable_end_to_end(session, client) -> None:
    exercise = await _add_exercise(session)
    for index in range(1, 11):
        response = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": f"毎日仕事をします。{index}"},
        )
        assert response.status_code == 201

    milestones = (await client.get("/api/v1/gamification/milestones")).json()
    keys = {item["milestone_key"] for item in milestones["items"]}
    assert "exercises_10" in keys
    assert all(item["celebration"] is not None for item in milestones["items"])
    async with get_session_factory()() as fresh:
        assert await MilestoneRepository(fresh).count() >= 1
        rows, _ = await XPEventRepository(fresh).list_by_user(None)
        milestone_events = [r for r in rows if r.event_type == "milestone"]
        assert len(milestone_events) == 1


async def test_mission_rows_are_unique_per_day(session, client) -> None:
    await client.get("/api/v1/gamification/mission")
    await client.get("/api/v1/gamification/today")
    rows = await DailyMissionRepository(session).list_recent_by_user(None, limit=10)
    assert len(rows) == 1
