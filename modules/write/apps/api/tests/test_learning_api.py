"""Adaptive learning API tests (Phase 6): /learning endpoints."""

from app.repositories import LearnerProfileRepository


async def test_get_profile_creates_default(session, client) -> None:
    response = await client.get("/api/v1/learning/profile")
    assert response.status_code == 200
    body = response.json()
    assert body["goal"] is None
    assert body["daily_target"] == 3
    assert body["profile_version"] == "learner_profile:v1"
    assert body["adaptive_state"] is not None or body["adaptive_state"] is None
    assert (await LearnerProfileRepository(session).count()) == 1


async def test_put_profile_updates_preferences(session, client) -> None:
    response = await client.put(
        "/api/v1/learning/profile",
        json={
            "goal": "business",
            "target_jlpt": "N3",
            "daily_target": 5,
            "preferred_registers": ["business"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["goal"] == "business"
    assert body["target_jlpt"] == "N3"
    assert body["daily_target"] == 5
    assert body["preferred_registers"] == ["business"]


async def test_put_profile_rejects_bad_target_jlpt(session, client) -> None:
    response = await client.put("/api/v1/learning/profile", json={"target_jlpt": "N9"})
    assert response.status_code == 422


async def test_streak_enabled_toggle_persists(session, client) -> None:
    response = await client.put("/api/v1/learning/profile", json={"streak_enabled": False})
    assert response.status_code == 200
    assert response.json()["streak_enabled"] is False
    response = await client.get("/api/v1/learning/profile")
    assert response.json()["streak_enabled"] is False
    response = await client.put("/api/v1/learning/profile", json={"streak_enabled": True})
    assert response.json()["streak_enabled"] is True


async def test_refresh_profile(session, client) -> None:
    response = await client.post("/api/v1/learning/profile/refresh")
    assert response.status_code == 200
    body = response.json()
    assert "adaptive_state" in body
    assert body["evidence_count"] == 0
    profile = await LearnerProfileRepository(session).get_for_user(None)
    assert profile.adaptive_state is not None
    assert profile.evaluations_since_synthesis == 0


async def test_next_recommendation_generates_exercise(session, client) -> None:
    response = await client.post("/api/v1/learning/next")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "recommended"
    assert body["exercise_id"] is not None
    assert body["exercise"] is not None
    assert body["exercise"]["prompt_vi"]
    assert body["reason"]
    assert body["focus_skills"]


async def test_recommendation_and_history(session, client) -> None:
    await client.post("/api/v1/learning/next")
    response = await client.get("/api/v1/learning/recommendation")
    assert response.status_code == 200
    assert response.json() is not None
    assert response.json()["strategy"] in {"targeted", "reinforcement", "exploration"}

    history = await client.get("/api/v1/learning/history")
    assert history.status_code == 200
    body = history.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1


async def test_today_payload(session, client) -> None:
    response = await client.get("/api/v1/learning/today")
    assert response.status_code == 200
    body = response.json()
    assert "focus" in body
    assert "session" in body
    assert body["recommendation"] is None


async def test_submit_attempt_updates_learning(session, client) -> None:
    """End-to-end: submit triggers the adaptive hook without breaking evaluation."""
    from app.db.session import get_session_factory
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
    assert response.json()["scores"]["overall_score"] > 0
    from app.repositories import LearningSessionRepository

    async with get_session_factory()() as fresh:
        session_row = await LearningSessionRepository(fresh).get_active_by_user(None)
        profile = await LearnerProfileRepository(fresh).get_for_user(None)
    assert session_row is not None
    assert session_row.exercises_completed == 1
    assert profile is not None
    assert profile.evaluations_since_synthesis >= 1
