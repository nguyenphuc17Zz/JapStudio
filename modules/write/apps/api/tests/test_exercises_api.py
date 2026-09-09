import json

import pytest
from app.models import Exercise
from app.providers.ai.fake import FakeAIProvider
from app.providers.ai.router import AIRouter
from app.repositories import ExerciseRepository
from app.services.ai_service import AIService
from sqlalchemy.ext.asyncio import AsyncSession

from conftest import exercise_factory


async def _seed(session: AsyncSession, **overrides) -> Exercise:
    return await ExerciseRepository(session).add(Exercise(**exercise_factory(**overrides)))


async def test_generate_default_exercise(client) -> None:
    response = await client.post("/api/v1/exercises/generate", json={})
    assert response.status_code == 201
    data = response.json()

    assert data["id"]
    assert data["exercise_type"] in {
        "sentence_translation",
        "multi_sentence_translation",
        "paragraph_translation",
        "free_writing",
        "register_challenge",
    }
    assert data["topic"]
    assert data["context"]
    assert data["prompt_vi"]
    assert data["register"] in {"casual", "polite", "business", "mixed"}
    assert data["jlpt_level"] in {"N5", "N4", "N3", "N2", "N1"}
    assert 1 <= data["difficulty"] <= 10
    assert data["target_length"] in {
        "short_sentence",
        "sentence",
        "multi_sentence",
        "paragraph",
        "long_writing",
    }
    assert 1 <= data["grammar_complexity"] <= 10
    assert data["generation_metadata"]["provider"] == "fake"
    assert data["status"] == "pending"


async def test_generate_empty_body(client) -> None:
    response = await client.post("/api/v1/exercises/generate")
    assert response.status_code == 201
    assert response.json()["prompt_vi"]


async def test_generate_with_preferences(client) -> None:
    response = await client.post(
        "/api/v1/exercises/generate",
        json={
            "exercise_type": "free_writing",
            "topic": "Du lịch",
            "register": "business",
            "jlpt_level": "N2",
            "difficulty": 8,
            "target_length": "paragraph",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"]
    assert 1 <= data["difficulty"] <= 10


@pytest.mark.parametrize(
    "payload",
    [
        {"difficulty": 0},
        {"difficulty": 11},
        {"exercise_type": "bogus"},
        {"register": "formal"},
        {"jlpt_level": "N6"},
        {"target_length": "novel"},
        {"topic": ""},
    ],
)
async def test_generate_invalid_parameters_rejected(client, payload: dict) -> None:
    response = await client.post("/api/v1/exercises/generate", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


async def test_generate_provider_failure(client, monkeypatch) -> None:
    from app.api.v1 import exercises as exercises_module

    failing_router = AIRouter(default_provider="fake", max_retries=0, retry_backoff=0)
    failing_router.register("fake", lambda: FakeAIProvider(fail_mode="unavailable"))
    monkeypatch.setattr(
        exercises_module,
        "_build_ai_service",
        lambda settings: AIService(ai_router=failing_router),
    )

    response = await client.post("/api/v1/exercises/generate", json={})
    assert response.status_code == 502
    body = response.json()["error"]
    assert body["code"] == "exercise_generation_error"


async def test_generated_exercise_is_persisted_and_retrievable(client) -> None:
    create = await client.post("/api/v1/exercises/generate", json={})
    assert create.status_code == 201
    exercise_id = create.json()["id"]

    fetched = await client.get(f"/api/v1/exercises/{exercise_id}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == exercise_id
    assert fetched.json()["prompt_vi"] == create.json()["prompt_vi"]

    listing = await client.get("/api/v1/exercises")
    assert listing.status_code == 200
    listed = listing.json()
    assert listed["total"] >= 1
    assert any(item["id"] == exercise_id for item in listed["items"])


async def test_get_missing_exercise_returns_404(client) -> None:
    response = await client.get("/api/v1/exercises/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


async def test_list_filters(client, session) -> None:
    await _seed(
        session,
        topic="Work",
        register="business",
        jlpt_level="N2",
        difficulty=7,
        exercise_type="paragraph_translation",
    )
    await _seed(
        session,
        topic="Food",
        register="casual",
        jlpt_level="N4",
        difficulty=3,
        exercise_type="sentence_translation",
    )
    await _seed(
        session,
        topic="Work",
        register="polite",
        jlpt_level="N3",
        difficulty=5,
        exercise_type="multi_sentence_translation",
    )

    by_register = await client.get("/api/v1/exercises", params={"register": "business"})
    assert by_register.status_code == 200
    assert by_register.json()["total"] == 1
    assert by_register.json()["items"][0]["topic"] == "Work"

    by_level = await client.get("/api/v1/exercises", params={"jlpt_level": "N3"})
    assert by_level.json()["total"] == 1
    assert by_level.json()["items"][0]["register"] == "polite"

    by_difficulty = await client.get("/api/v1/exercises", params={"difficulty": 7})
    assert by_difficulty.json()["total"] == 1

    by_topic = await client.get("/api/v1/exercises", params={"topic": "work"})
    assert by_topic.json()["total"] == 2

    by_type = await client.get(
        "/api/v1/exercises", params={"exercise_type": "sentence_translation"}
    )
    assert by_type.json()["total"] == 1

    paged = await client.get("/api/v1/exercises", params={"limit": 1, "skip": 1})
    assert paged.json()["total"] == 3
    assert len(paged.json()["items"]) == 1


async def test_list_invalid_filters_rejected(client) -> None:
    bad_register = await client.get("/api/v1/exercises", params={"register": "formal"})
    assert bad_register.status_code == 422

    bad_difficulty = await client.get("/api/v1/exercises", params={"difficulty": 99})
    assert bad_difficulty.status_code == 422

    bad_limit = await client.get("/api/v1/exercises", params={"limit": 0})
    assert bad_limit.status_code == 422


async def test_no_credentials_exposed(client) -> None:
    create = await client.post("/api/v1/exercises/generate", json={})
    assert create.status_code == 201

    responses = [create, await client.get("/api/v1/exercises")]
    for response in responses:
        raw = json.dumps(response.json()).lower()
        assert "api_key" not in raw
        assert "password" not in raw
        assert "secret" not in raw
        assert "credential" not in raw


async def test_duplicate_generation_returns_409(client) -> None:
    first = await client.post("/api/v1/exercises/generate", json={})
    assert first.status_code == 201

    second = await client.post("/api/v1/exercises/generate", json={})
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "duplicate_exercise"


async def test_delete_single_exercise(client, session) -> None:
    created = await _seed(session, topic="Delete Me")
    res = await client.delete(f"/api/v1/exercises/{created.id}")
    assert res.status_code == 204

    # Verify not found after delete
    get_res = await client.get(f"/api/v1/exercises/{created.id}")
    assert get_res.status_code == 404


async def test_delete_non_existent_exercise_returns_404(client) -> None:
    res = await client.delete("/api/v1/exercises/non-existent-id")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "not_found"


async def test_delete_all_exercises(client, session) -> None:
    await _seed(session, topic="Topic A")
    await _seed(session, topic="Topic B")
    await _seed(session, topic="Topic C")

    list_before = await client.get("/api/v1/exercises")
    assert list_before.json()["total"] >= 3

    res = await client.delete("/api/v1/exercises")
    assert res.status_code == 200
    assert res.json()["deleted"] >= 3

    list_after = await client.get("/api/v1/exercises")
    assert list_after.json()["total"] == 0
    assert len(list_after.json()["items"]) == 0
