"""Simulation vocabulary integration tests (Phase 10): the extract_for_turn
hook runs the Phase 5 pipeline on a simulation attempt."""

import pytest
from app.core.errors import VocabularyExtractionError
from app.models import Exercise, ExerciseAttempt
from app.providers.ai.router import AIRouter
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
)
from app.services.ai_service import AIService
from app.services.vocabulary_service import VocabularyService

from conftest import exercise_factory
from scripted_provider import ScriptedAIProvider


def _service(session, provider) -> VocabularyService:
    router = AIRouter(
        providers={"fake": lambda: provider},
        default_provider="fake",
        fallback_providers=["fake"],
        max_retries=0,
        retry_backoff=0.01,
    )
    return VocabularyService(
        ai_service=AIService(ai_router=router),
        entry_repository=VocabularyEntryRepository(session),
        user_repository=UserVocabularyRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        exercise_repository=ExerciseRepository(session),
        settings=None,
    )


async def _seed_attempt(session) -> ExerciseAttempt:
    exercise = await ExerciseRepository(session).add(
        Exercise(**exercise_factory(jlpt_level="N4", topic="Work"))
    )
    return await ExerciseAttemptRepository(session).add(
        ExerciseAttempt(
            exercise_id=exercise.id,
            user_id=None,
            attempt_number=1,
            answer_text="今日は仕事が多くて、帰りが遅くなりました。",
        )
    )


async def test_extract_for_turn_runs_pipeline(session) -> None:
    attempt = await _seed_attempt(session)
    service = _service(session, ScriptedAIProvider())
    payload = {
        "attempt_id": attempt.id,
        "scores": {"overall": 80, "goal_progress": 70},
        "issues": [],
        "corrections": None,
        "feedback_vi": "Tốt.",
        "strengths": ["Rõ ràng"],
        "summary": "Tốt.",
    }
    summary = await service.extract_for_turn(attempt.id, payload)

    assert summary["total"] == 2
    assert summary["created"] == 2
    entries = await UserVocabularyRepository(session).list_recent_for_user(None, limit=10)
    assert len(entries) == 2
    assert entries[0].expression in ("立て込む", "仕事が立て込んでいる")


async def test_extract_for_turn_missing_attempt(session) -> None:
    service = _service(session, ScriptedAIProvider())
    with pytest.raises(VocabularyExtractionError):
        await service.extract_for_turn("missing-attempt", {})


async def test_extract_for_turn_does_not_create_feedback(session) -> None:
    attempt = await _seed_attempt(session)
    service = _service(session, ScriptedAIProvider())
    await service.extract_for_turn(attempt.id, {"attempt_id": attempt.id, "scores": {}})
    feedback = await WritingFeedbackRepository(session).get_by_attempt(attempt.id)
    assert feedback is None
