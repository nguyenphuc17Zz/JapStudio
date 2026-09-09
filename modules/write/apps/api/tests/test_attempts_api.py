"""Attempts API tests: submission, learning mode, hints, reveal, history."""

import json

import app.api.v1.attempts as attempts_module
from app.core.config import Settings
from app.models import Exercise
from app.repositories import ExerciseRepository
from app.services.ai_config_service import AIConfigService

from conftest import exercise_factory

ANSWER = "今日は仕事が多いので、帰るのが遅くなると思います。"


async def _seed(session) -> Exercise:
    return await ExerciseRepository(session).add(Exercise(**exercise_factory()))


class TestSubmit:
    async def test_submit_returns_evaluation_without_corrections(self, client, session) -> None:
        exercise = await _seed(session)
        response = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        assert response.status_code == 201
        data = response.json()

        assert data["attempt_number"] == 1
        assert data["answer_text"] == ANSWER
        assert data["scores"]["overall_score"] == 90
        assert data["scores"]["semantic_score"] == 90
        assert data["scores"]["naturalness_score"] == 90
        assert data["semantic_classification"] == "fully_equivalent"
        assert data["naturalness_classification"] == "natural"
        assert data["summary"]
        assert len(data["hints"]) == 3
        assert data["learning_mode"]["enabled"] is True
        assert data["learning_mode"]["hints_revealed_count"] == 0
        assert data["learning_mode"]["reveal_available"] is False
        assert data["corrections"] is None

        raw = json.dumps(data).lower()
        assert "correct_version" not in raw
        assert "native_version" not in raw

    async def test_submit_with_learning_mode_disabled_reveals_immediately(
        self, client, session, monkeypatch
    ) -> None:
        exercise = await _seed(session)
        settings = Settings(ai_exercise_learning_mode_enabled=False)
        monkeypatch.setattr(attempts_module, "get_settings", lambda: settings)

        async def _effective(self, s):
            return settings

        monkeypatch.setattr(AIConfigService, "get_effective_settings", _effective)

        response = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["corrections"] is not None
        assert data["corrections"]["correct_version"]
        assert data["corrections"]["business_version"]
        assert data["learning_mode"]["enabled"] is False
        assert data["learning_mode"]["reveal_available"] is True

    async def test_submit_requires_answer_text(self, client, session) -> None:
        exercise = await _seed(session)
        response = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ""},
        )
        assert response.status_code == 422

    async def test_submit_missing_exercise_returns_404(self, client) -> None:
        response = await client.post(
            "/api/v1/exercises/missing/attempts",
            json={"answer_text": ANSWER},
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"

    async def test_second_submit_creates_next_attempt_number(self, client, session) -> None:
        exercise = await _seed(session)
        first = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        second = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": "今日はとても忙しいです。"},
        )
        assert first.json()["attempt_number"] == 1
        assert second.json()["attempt_number"] == 2
        assert first.json()["id"] != second.json()["id"]


class TestHistory:
    async def test_list_attempts_ordered_newest_first(self, client, session) -> None:
        exercise = await _seed(session)
        await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": "第一回。"},
        )
        await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": "第二回。"},
        )

        response = await client.get(f"/api/v1/exercises/{exercise.id}/attempts")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert [item["attempt_number"] for item in data["items"]] == [2, 1]
        assert data["items"][0]["overall_score"] == 90

        paged = await client.get(
            f"/api/v1/exercises/{exercise.id}/attempts", params={"limit": 1, "skip": 1}
        )
        assert paged.json()["total"] == 2
        assert len(paged.json()["items"]) == 1
        assert paged.json()["items"][0]["attempt_number"] == 1

    async def test_list_missing_exercise_returns_404(self, client) -> None:
        response = await client.get("/api/v1/exercises/missing/attempts")
        assert response.status_code == 404

    async def test_get_attempt_hides_corrections_until_reveal(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        attempt_id = created.json()["id"]

        fetched = await client.get(f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}")
        assert fetched.status_code == 200
        assert fetched.json()["corrections"] is None
        assert "correct_version" not in json.dumps(fetched.json()).lower()

        await client.post(f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}/reveal")
        revealed = await client.get(f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}")
        assert revealed.json()["corrections"]["correct_version"]

    async def test_get_attempt_missing_returns_404(self, client, session) -> None:
        exercise = await _seed(session)
        response = await client.get(f"/api/v1/exercises/{exercise.id}/attempts/nope")
        assert response.status_code == 404

    async def test_get_attempt_of_other_exercise_returns_404(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        other = await _seed(session)
        response = await client.get(f"/api/v1/exercises/{other.id}/attempts/{created.json()['id']}")
        assert response.status_code == 404


class TestHints:
    async def test_hints_advance_progressively(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        attempt_id = created.json()["id"]
        seen = []
        for expected_count in (1, 2, 3):
            response = await client.post(
                f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}/hint"
            )
            assert response.status_code == 200
            data = response.json()
            seen.append(data["hint"])
            assert data["hints_revealed_count"] == expected_count
            assert data["hints_total"] == 3
            assert data["reveal_available"] is (expected_count >= 3)
            assert "correct_version" not in json.dumps(data).lower()

        assert len(set(seen)) == 3

        exhausted = await client.post(f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}/hint")
        assert exhausted.status_code == 409

    async def test_hint_missing_attempt_returns_404(self, client, session) -> None:
        exercise = await _seed(session)
        response = await client.post(f"/api/v1/exercises/{exercise.id}/attempts/nope/hint")
        assert response.status_code == 404


class TestReveal:
    async def test_reveal_returns_all_versions_and_is_idempotent(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        attempt_id = created.json()["id"]

        first = await client.post(f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}/reveal")
        assert first.status_code == 200
        data = first.json()
        assert data["revealed"] is True
        assert data["attempt_number"] == 1
        corrections = data["corrections"]
        assert corrections["correct_version"]
        assert corrections["natural_version"]
        assert corrections["native_version"]
        assert corrections["business_version"]

        second = await client.post(f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}/reveal")
        assert second.json()["corrections"]["correct_version"] == corrections["correct_version"]

    async def test_reveal_missing_attempt_returns_404(self, client, session) -> None:
        exercise = await _seed(session)
        response = await client.post(f"/api/v1/exercises/{exercise.id}/attempts/nope/reveal")
        assert response.status_code == 404


class TestSafety:
    async def test_no_credentials_exposed(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        attempt_id = created.json()["id"]

        responses = [
            created,
            await client.get(f"/api/v1/exercises/{exercise.id}/attempts"),
            await client.get(f"/api/v1/exercises/{exercise.id}/attempts/{attempt_id}"),
        ]
        for response in responses:
            raw = json.dumps(response.json()).lower()
            assert "api_key" not in raw
            assert "password" not in raw
            assert "secret" not in raw
            assert "credential" not in raw

    async def test_evaluation_metadata_has_provenance(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            f"/api/v1/exercises/{exercise.id}/attempts",
            json={"answer_text": ANSWER},
        )
        metadata = created.json()["evaluation_metadata"]
        assert metadata["evaluation_version"] == "writing_evaluation:v1"
        stage_names = {stage["stage"] for stage in metadata["stages"]}
        assert stage_names == {
            "semantic",
            "grammar_vocabulary",
            "naturalness_register",
            "corrections",
            "hints",
        }
        for stage in metadata["stages"]:
            assert stage["provider"] == "fake"
            assert stage["prompt_version"].endswith(":v1")
