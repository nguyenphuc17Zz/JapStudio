"""Writing (long-form) API tests: submissions, revisions, evaluation reads,
compare, hints/reveal, coach, guards and failure isolation."""

import json

from app.core.config import Settings
from app.db.session import get_session_factory
from app.models import Exercise
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    WritingFeedbackRepository,
    WritingSubmissionRepository,
)
from app.services.ai_config_service import AIConfigService

from conftest import exercise_factory

TWO_SENTENCES = "今日は仕事がとても忙しかったです。だから、帰りが遅くなりました。"
THREE_SENTENCES = "今日は仕事がとても忙しかったです。それで、帰りが遅くなりました。残業もしました。"


async def _seed(session, **overrides) -> Exercise:
    overrides.setdefault("target_length", "paragraph")
    return await ExerciseRepository(session).add(Exercise(**exercise_factory(**overrides)))


def _fresh_session():
    return get_session_factory()()


class TestCreateSubmission:
    async def test_create_returns_full_evaluation(self, client, session) -> None:
        exercise = await _seed(session)
        response = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        assert response.status_code == 201
        data = response.json()

        assert data["submission_id"]
        assert data["revision_number"] == 1
        assert data["exercise_id"] == exercise.id
        assert data["target_length"] == "paragraph"
        assert data["text"] == TWO_SENTENCES
        assert data["sentence_count"] == 2
        assert data["status"] == "evaluated"
        assert data["discourse_available"] is True
        assert data["scores"]["sentence_quality"] == 90
        assert data["scores"]["discourse_quality"] == 87
        assert data["scores"]["overall_writing"] == 88
        assert len(data["sentence_scores"]) == 2
        assert data["summary"]
        assert data["learning_mode"]["enabled"] is True
        assert data["learning_mode"]["hints_total"] >= 1
        assert data["provenance"]["evaluation_version"] == "discourse:v1"

        raw = json.dumps(data, ensure_ascii=False).lower()
        assert "rewrites" not in raw or data["rewrites"] is None

        # hooks ran: a normal ExerciseAttempt + aggregated feedback exist
        async with _fresh_session() as read_session:
            submissions = await WritingSubmissionRepository(read_session).list()
            assert len(submissions) == 1
            attempt = await ExerciseAttemptRepository(read_session).get(data["attempt_id"])
            assert attempt is not None
            feedback = await WritingFeedbackRepository(read_session).get_by_attempt(attempt.id)
            assert feedback is not None
            assert feedback.evaluation_metadata["evaluation_version"] == "discourse:v1"

    async def test_create_with_learning_mode_disabled_returns_rewrites(
        self, client, session, monkeypatch
    ) -> None:
        exercise = await _seed(session)
        settings = Settings(ai_exercise_learning_mode_enabled=False)

        async def _effective(self, s):
            return settings

        monkeypatch.setattr(AIConfigService, "get_effective_settings", _effective)

        response = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["learning_mode"]["enabled"] is False
        assert data["learning_mode"]["reveal_available"] is True
        assert data["rewrites"]["minimal_fix"]

    async def test_create_rejects_single_sentence_exercises(self, client, session) -> None:
        exercise = await _seed(session, target_length="sentence")
        response = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "unsupported_exercise"

    async def test_create_rejects_too_short_text(self, client, session) -> None:
        exercise = await _seed(session)
        response = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": "短い。"},
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"

    async def test_create_rejects_single_sentence_text(self, client, session) -> None:
        exercise = await _seed(session)
        response = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": "今日はとても忙しかったです。"},
        )
        assert response.status_code == 422

    async def test_create_missing_exercise_returns_404(self, client) -> None:
        response = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": "missing", "text": TWO_SENTENCES},
        )
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"


class TestSubmissionReads:
    async def _create(self, client, session) -> dict:
        exercise = await _seed(session)
        created = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        return created.json()

    async def test_get_submission_lists_revisions(self, client, session) -> None:
        data = await self._create(client, session)
        response = await client.get(f"/api/v1/writing/submissions/{data['submission_id']}")
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == data["submission_id"]
        assert body["revision_count"] == 1
        assert body["revisions"][0]["revision_number"] == 1
        assert body["revisions"][0]["overall_writing"] == data["scores"]["overall_writing"]

    async def test_get_submission_missing_returns_404(self, client) -> None:
        response = await client.get("/api/v1/writing/submissions/nope")
        assert response.status_code == 404

    async def test_evaluation_read_never_reruns_ai(self, client, session, monkeypatch) -> None:
        data = await self._create(client, session)
        before = await client.get(f"/api/v1/writing/submissions/{data['submission_id']}/evaluation")
        after = await client.get(f"/api/v1/writing/submissions/{data['submission_id']}/evaluation")
        assert before.status_code == 200
        assert after.status_code == 200
        assert before.json()["scores"] == after.json()["scores"]
        assert before.json()["sentence_scores"] == after.json()["sentence_scores"]
        assert before.json()["provenance"]["stages"]


class TestRevisions:
    async def _create(self, client, session) -> tuple[dict, Exercise]:
        exercise = await _seed(session)
        created = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        return created.json(), exercise

    async def test_revision_returns_numbered_deltas(self, client, session) -> None:
        data, exercise = await self._create(client, session)
        response = await client.post(
            f"/api/v1/writing/submissions/{data['submission_id']}/revisions",
            json={"text": THREE_SENTENCES},
        )
        assert response.status_code == 201
        body = response.json()
        assert body["revision_number"] == 2
        assert body["submission_id"] == data["submission_id"]
        assert body["scores"]["discourse_quality"] == 87
        assert body["deltas"]["overall_writing"] == 0
        assert body["deltas"]["sentence_quality"] == 0
        assert body["deltas"]["discourse_quality"] == 0

        listing = await client.get(f"/api/v1/writing/submissions/{data['submission_id']}")
        assert listing.json()["revision_count"] == 2
        assert [r["revision_number"] for r in listing.json()["revisions"]] == [1, 2]

    async def test_revision_missing_submission_returns_404(self, client) -> None:
        response = await client.post(
            "/api/v1/writing/submissions/nope/revisions",
            json={"text": THREE_SENTENCES},
        )
        assert response.status_code == 404


class TestCompare:
    async def test_compare_returns_deltas_diff_and_guidance(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        await client.post(
            f"/api/v1/writing/submissions/{created.json()['submission_id']}/revisions",
            json={"text": THREE_SENTENCES},
        )
        response = await client.get(
            f"/api/v1/writing/submissions/{created.json()['submission_id']}/compare",
            params={"from_revision": 1, "to_revision": 2},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["from_revision"] == 1
        assert body["to_revision"] == 2
        assert body["deltas"]["overall_writing"] == 0
        assert body["sentence_diff"]["added"] == [
            "それで、帰りが遅くなりました。",
            "残業もしました。",
        ]
        assert body["sentence_diff"]["removed"] == ["だから、帰りが遅くなりました。"]
        assert body["guidance"]
        assert body["guidance_version"]

    async def test_compare_requires_existing_revisions(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        response = await client.get(
            f"/api/v1/writing/submissions/{created.json()['submission_id']}/compare",
            params={"from_revision": 1, "to_revision": 2},
        )
        assert response.status_code == 502
        assert response.json()["error"]["code"] == "evaluation_error"


class TestHintReveal:
    async def test_hint_progression_then_reveal(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        submission_id = created.json()["submission_id"]
        total = created.json()["learning_mode"]["hints_total"]

        for index in range(total):
            response = await client.post(f"/api/v1/writing/submissions/{submission_id}/hint")
            assert response.status_code == 200
            body = response.json()
            assert body["hint"]
            assert body["hints_revealed_count"] == index + 1
            assert body["hints_total"] == total
        exhausted = await client.post(f"/api/v1/writing/submissions/{submission_id}/hint")
        assert exhausted.json()["hint"] == ""

        revealed = await client.post(f"/api/v1/writing/submissions/{submission_id}/reveal")
        assert revealed.status_code == 200
        assert revealed.json()["rewrites"]["minimal_fix"]
        again = await client.post(f"/api/v1/writing/submissions/{submission_id}/reveal")
        assert again.json()["revealed"] is True

    async def test_hint_missing_submission_returns_404(self, client) -> None:
        response = await client.post("/api/v1/writing/submissions/nope/hint")
        assert response.status_code == 404


class TestCoach:
    async def test_coach_answers(self, client, session) -> None:
        exercise = await _seed(session)
        created = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        response = await client.post(
            f"/api/v1/writing/submissions/{created.json()['submission_id']}/coach",
            json={"question": "Làm sao cải thiện độ mạch lạc?"},
        )
        assert response.status_code == 200
        assert response.json()["answer"]
        assert response.json()["suggestions"]


class TestFeatureGate:
    async def test_feature_disabled_returns_400(self, client, session, monkeypatch) -> None:
        exercise = await _seed(session)
        settings = Settings(ai_long_form_enabled=False)

        async def _effective(self, s):
            return settings

        monkeypatch.setattr(AIConfigService, "get_effective_settings", _effective)

        response = await client.post(
            "/api/v1/writing/submissions",
            json={"exercise_id": exercise.id, "text": TWO_SENTENCES},
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "feature_disabled"
