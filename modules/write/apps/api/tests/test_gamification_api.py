"""Gamification API tests (Phase 7): /api/v1/gamification endpoints."""


async def test_summary_returns_level_zero_state(client) -> None:
    response = await client.get("/api/v1/gamification/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["level"]["current_level"] == 1
    assert body["level"]["current_xp"] == 0
    assert body["level"]["xp_to_next_level"] == 100
    assert body["current_streak"] == 0
    assert body["longest_streak"] == 0
    assert body["today_xp"] == 0
    assert body["daily_goal"] == {
        "target": 0,  # goal row is created on first activity
        "completed_count": 0,
        "completed": False,
        "progress_percent": 0,
    }


async def test_xp_history_is_empty_and_paginated(client) -> None:
    response = await client.get("/api/v1/gamification/xp/history")
    assert response.status_code == 200
    body = response.json()
    assert body == {"items": [], "total": 0, "skip": 0, "limit": 50}
    response = await client.get("/api/v1/gamification/xp/history?limit=5&skip=0")
    assert response.json()["limit"] == 5


async def test_mission_generated_once(client) -> None:
    first = await client.get("/api/v1/gamification/mission")
    assert first.status_code == 200
    body = first.json()
    assert body["mission_type"] in {"practice", "weakness_focus", "register_focus", "challenge_mix"}
    assert body["target_count"] >= 1
    assert body["status"] == "active"
    assert body["provider"]

    second = await client.get("/api/v1/gamification/mission")
    assert second.json()["id"] == body["id"]


async def test_mission_regenerate_replaces_active(client) -> None:
    first = (await client.get("/api/v1/gamification/mission")).json()
    response = await client.post("/api/v1/gamification/mission/regenerate")
    assert response.status_code == 200
    replacement = response.json()
    assert replacement["id"] != first["id"]
    assert replacement["status"] == "active"


async def test_milestones_list_empty(client) -> None:
    response = await client.get("/api/v1/gamification/milestones")
    assert response.status_code == 200
    assert response.json() == {"items": []}


async def test_today_payload(client) -> None:
    response = await client.get("/api/v1/gamification/today")
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["level"]["current_level"] == 1
    assert body["mission"] is not None
    assert body["mission"]["status"] == "active"
    assert "focus" in body
    assert body["recommendation"] is None
    assert body["encouragement"] is None
    assert isinstance(body["reminders"], list)
    assert len(body["reminders"]) >= 1
    assert any("chưa luyện tập" in r for r in body["reminders"])


async def test_exercise_attempt_updates_gamification(session, client) -> None:
    from app.models import Exercise
    from app.repositories import ExerciseRepository

    from conftest import exercise_factory

    exercise = await ExerciseRepository(session).add(
        Exercise(
            **exercise_factory(
                jlpt_level="N4",
                topic="Công việc",
                prompt_vi="Hãy kể về công việc hàng ngày của bạn.",
                prompt_vi_hash="c" * 64,
            )
        )
    )
    response = await client.post(
        f"/api/v1/exercises/{exercise.id}/attempts",
        json={"answer_text": "毎日仕事をします。"},
    )
    assert response.status_code == 201

    summary = (await client.get("/api/v1/gamification/summary")).json()
    assert summary["today_xp"] >= 10
    assert summary["current_streak"] == 1
    assert summary["daily_goal"]["completed_count"] == 1

    history = (await client.get("/api/v1/gamification/xp/history")).json()
    assert history["total"] >= 1
    assert {item["event_type"] for item in history["items"]} >= {"exercise_complete"}
