"""Optional integration test: evaluation pipeline through the real Ollama provider.

Skipped unless RUN_OLLAMA_INTEGRATION=true:
    RUN_OLLAMA_INTEGRATION=true pytest tests/integration -k evaluation

Runs the full Phase 4 evaluation pipeline (5 stages + synthesis +
consistency) against a local Ollama server with aya-expanse:8b and verifies
coherent, well-formed results for good and bad answers.
"""

import os

import pytest
from app.core.config import Settings
from app.models import ExerciseAttempt, WritingFeedback
from app.providers.ai.router import create_default_router
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    WritingFeedbackRepository,
)
from app.services.ai_service import AIService
from app.services.evaluation_service import EvaluationService

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_OLLAMA_INTEGRATION") != "true",
    reason="set RUN_OLLAMA_INTEGRATION=true to run",
)


async def _evaluate(session, answer: str):
    exercises = await ExerciseRepository(session).list(limit=1)
    assert exercises, "seed an exercise before running this test"
    settings = Settings(
        ai_exercise_generation_provider="ollama",
        ai_exercise_generation_model="aya-expanse:8b",
        ai_exercise_evaluation_provider="ollama",
        ai_exercise_evaluation_model="aya-expanse:8b",
        ai_exercise_evaluation_max_retries=0,
    )
    service = EvaluationService(
        ai_service=AIService(ai_router=create_default_router(settings)),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=settings,
    )
    return await service.submit(exercises[0], answer)


async def test_evaluate_good_answer_with_ollama(session) -> None:
    attempt, feedback, evaluation = await _evaluate(
        session, "今日は仕事がたくさんあります。でも、頑張ります。"
    )
    assert isinstance(attempt, ExerciseAttempt)
    assert isinstance(feedback, WritingFeedback)
    assert attempt.attempt_number >= 1
    assert evaluation.scores.overall_score >= 60
    assert evaluation.semantic_classification == "fully_equivalent"
    assert evaluation.summary
    assert evaluation.hints
    assert feedback.overall_score == evaluation.scores.overall_score
    metadata = feedback.evaluation_metadata
    assert metadata["evaluation_version"] == "writing_evaluation:v1"
    assert len(metadata["stages"]) == 5
    assert all(stage["provider"] == "ollama" for stage in metadata["stages"])
    assert all(stage["model"] == "aya-expanse:8b" for stage in metadata["stages"])


async def test_evaluate_bad_answer_with_ollama(session) -> None:
    _, _, evaluation = await _evaluate(session, "私は猫です。仕事をする。")
    assert evaluation.scores.overall_score < 70
    assert evaluation.semantic_classification == "meaning_changed"
    assert evaluation.issues
