"""Vocabulary API tests (Phase 5): bank list/detail, reprocess, attempt routes.

Uses the default fake provider (auto-extraction runs on submit).
"""

import app.api.v1.attempts as attempts_module
from app.core.config import Settings
from app.models import Exercise
from app.repositories import ExerciseRepository
from app.services.vocabulary_service import VocabularyService

from conftest import exercise_factory

ANSWER = "今日は仕事が立て込んでいるので、帰りが遅くなると思います。"


async def _seed(session) -> Exercise:
    return await ExerciseRepository(session).add(Exercise(**exercise_factory()))


async def _submit(client, session) -> tuple[Exercise, str]:
    exercise = await _seed(session)
    response = await client.post(
        f"/api/v1/exercises/{exercise.id}/attempts",
        json={"answer_text": ANSWER},
    )
    assert response.status_code == 201
    attempt_id = response.json()["id"]
    return exercise, attempt_id


class TestAutoExtractionOnSubmit:
    async def test_submit_extracts_vocabulary_automatically(self, client, session) -> None:
        exercise, attempt_id = await _submit(client, session)
        response = await client.get(
            f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}/vocabulary"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        expressions = {item["expression"] for item in data["items"]}
        assert expressions == {"立て込む", "仕事が立て込んでいる"}
        first = data["items"][0]
        assert first["learning_reason"]
        assert first["source_type"] in {"ai_natural", "ai_native"}
        assert first["example_sentence"]

    async def test_auto_extract_failure_never_breaks_submit(
        self, client, session, monkeypatch
    ) -> None:
        async def _explode(self, attempt_id: str):
            raise RuntimeError("boom")

        monkeypatch.setattr(VocabularyService, "extract_for_attempt", _explode)
        exercise = await _seed(session)
        response = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        assert response.status_code == 201
        assert response.json()["id"]

    async def test_auto_extraction_can_be_disabled(self, client, session, monkeypatch) -> None:
        settings = Settings(ai_vocabulary_auto_extract_enabled=False)
        monkeypatch.setattr(attempts_module, "get_settings", lambda: settings)

        async def _effective(self, s):
            return settings

        from app.services.ai_config_service import AIConfigService

        monkeypatch.setattr(AIConfigService, "get_effective_settings", _effective)

        exercise, attempt_id = await _submit(client, session)
        response = await client.get(
            f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}/vocabulary"
        )
        assert response.status_code == 200
        assert response.json()["total"] == 0


class TestBankEndpoints:
    async def test_list_and_filters(self, client, session) -> None:
        exercise, attempt_id = await _submit(client, session)

        response = await client.get("/api/v1/vocabulary")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert data["items"][0]["familiarity"] == "new"
        by_expression = {item["expression"]: item for item in data["items"]}
        assert by_expression["立て込む"]["importance"] == 7

        response = await client.get("/api/v1/vocabulary?type=word")
        assert response.json()["total"] == 1
        assert response.json()["items"][0]["expression"] == "立て込む"

        response = await client.get("/api/v1/vocabulary?source_type=ai_native")
        assert response.json()["total"] == 1
        assert response.json()["items"][0]["expression"] == "仕事が立て込んでいる"

        response = await client.get("/api/v1/vocabulary?search=立て込")
        assert response.json()["total"] == 2

        response = await client.get("/api/v1/vocabulary?jlpt_level=N2")
        assert response.json()["total"] == 2

        response = await client.get("/api/v1/vocabulary?difficulty_min=7&difficulty_max=10")
        assert response.json()["total"] == 1

        response = await client.get("/api/v1/vocabulary?limit=1")
        assert len(response.json()["items"]) == 1
        assert response.json()["total"] == 2

    async def test_detail_with_discoveries(self, client, session) -> None:
        exercise, attempt_id = await _submit(client, session)
        list_response = await client.get("/api/v1/vocabulary")
        items = {item["expression"]: item for item in list_response.json()["items"]}
        entry_id = items["立て込む"]["id"]

        response = await client.get(f"/api/v1/vocabulary/{entry_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["expression"] == "立て込む"
        assert data["learning_reason"]
        assert data["source_attempt_id"] == attempt_id
        assert data["provider"] == "fake"
        assert data["vocabulary_version"] == "vocabulary:v1"
        assert len(data["discoveries"]) == 1
        discovery = data["discoveries"][0]
        assert discovery["attempt_id"] == attempt_id
        assert discovery["exercise_id"] == exercise.id
        assert discovery["attempt_number"] == 1
        assert discovery["source_type"] == "ai_natural"
        assert discovery["exercise_prompt_vi"]

    async def test_detail_missing_returns_404(self, client) -> None:
        response = await client.get("/api/v1/vocabulary/does-not-exist")
        assert response.status_code == 404

    async def test_reprocess_is_idempotent(self, client, session) -> None:
        exercise, attempt_id = await _submit(client, session)
        response = await client.post(f"/api/v1/vocabulary/reprocess/{attempt_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["created"] == 0
        assert data["merged"] == 2

        bank = await client.get("/api/v1/vocabulary")
        assert bank.json()["total"] == 2

    async def test_reprocess_missing_attempt_returns_502(self, client) -> None:
        response = await client.post("/api/v1/vocabulary/reprocess/does-not-exist")
        assert response.status_code == 502
        assert response.json()["error"]["code"] == "vocabulary_extraction_error"


class TestAttemptVocabularyEndpoints:
    async def test_extract_endpoint(self, client, session) -> None:
        exercise, attempt_id = await _submit(client, session)
        response = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}/vocabulary/extract"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["attempt_id"] == attempt_id
        assert data["created"] == 0
        assert data["merged"] == 2

    async def test_extract_endpoint_missing_attempt_404(self, client) -> None:
        response = await client.post(
            "/api/v1/exercises/missing/attempts/missing/vocabulary/extract"
        )
        assert response.status_code == 404

    async def test_attempt_vocabulary_missing_attempt_404(self, client) -> None:
        response = await client.get("/api/v1/exercises/missing/attempts/missing/vocabulary")
        assert response.status_code == 404
