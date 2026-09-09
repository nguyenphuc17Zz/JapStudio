"""Optional integration test: vocabulary extraction through the real Ollama provider.

Skipped unless RUN_OLLAMA_INTEGRATION=true:
    RUN_OLLAMA_INTEGRATION=true pytest tests/integration -k vocabulary

Runs the Phase 5 extraction pipeline (extraction -> validation -> explanation)
against a local Ollama server with aya-expanse:8b on a real evaluation and
verifies the resulting bank entries + user state + provenance.
"""

import os

import pytest
from app.core.config import Settings
from app.models import VocabularyEntry
from app.providers.ai.router import create_default_router
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
)
from app.services.ai_service import AIService
from app.services.evaluation_service import EvaluationService
from app.services.vocabulary_service import VocabularyService

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_OLLAMA_INTEGRATION") != "true",
    reason="set RUN_OLLAMA_INTEGRATION=true to run",
)

SETTINGS = Settings(
    ai_exercise_generation_provider="ollama",
    ai_exercise_generation_model="aya-expanse:8b",
    ai_exercise_evaluation_provider="ollama",
    ai_exercise_evaluation_model="aya-expanse:8b",
    ai_exercise_evaluation_max_retries=0,
    ai_vocabulary_provider="ollama",
    ai_vocabulary_model="aya-expanse:8b",
    ai_vocabulary_validation_model="aya-expanse:8b",
    ai_vocabulary_explanation_model="aya-expanse:8b",
)


def _service(session, settings: Settings):
    return VocabularyService(
        ai_service=AIService(ai_router=create_default_router(settings)),
        entry_repository=VocabularyEntryRepository(session),
        user_repository=UserVocabularyRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        exercise_repository=ExerciseRepository(session),
        settings=settings,
    )


async def test_vocabulary_extraction_with_ollama(session) -> None:
    exercises = await ExerciseRepository(session).list(limit=1)
    assert exercises, "seed an exercise before running this test"
    evaluation_service = EvaluationService(
        ai_service=AIService(ai_router=create_default_router(SETTINGS)),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=SETTINGS,
    )
    attempt, feedback, _ = await evaluation_service.submit(
        exercises[0], "今日は仕事がたくさんあります。でも、頑張ります。"
    )

    summary = await _service(session, SETTINGS).extract_for_attempt(attempt.id)
    assert summary["created"] + summary["merged"] > 0, summary

    entries = await VocabularyEntryRepository(session).list(limit=100)
    assert entries
    for entry in entries:
        assert isinstance(entry, VocabularyEntry)
        assert entry.meaning_vi
        assert entry.example_sentence
        assert entry.importance >= 1
        assert entry.provenance.get("provider") == "ollama"
        state = await UserVocabularyRepository(session).get_by_entry(entry.id)
        assert state is not None
        assert state.discovered_count >= 1

    rerun = await _service(session, SETTINGS).extract_for_attempt(attempt.id)
    assert rerun["created"] == 0  # idempotent: never duplicates
    assert len(await VocabularyEntryRepository(session).list(limit=100)) == len(entries)
