"""Optional integration test: adaptive learning through the real Ollama provider.

Skipped unless RUN_OLLAMA_INTEGRATION=true:
    RUN_OLLAMA_INTEGRATION=true pytest tests/integration -k learning

Chains the full adaptive loop against a local Ollama server
(aya-expanse:8b): evaluation -> vocabulary extraction -> learner profile
update -> next recommendation -> exercise generation, verifying the
learner intelligence records are persisted.
"""

import os

import pytest
from app.core.config import Settings
from app.providers.ai.router import create_default_router
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    LearnerProfileRepository,
    LearningRecommendationRepository,
    LearningSessionRepository,
    MistakePatternRepository,
    WritingFeedbackRepository,
)
from app.services.adaptive_learning_service import AdaptiveLearningService
from app.services.ai_service import AIService
from app.services.evaluation_service import EvaluationService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.learning_planner_service import LearningPlannerService
from app.services.mistake_clustering_service import MistakeClusteringService

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
    ai_learning_provider="ollama",
    ai_learning_model="aya-expanse:8b",
)


def _ai() -> AIService:
    return AIService(ai_router=create_default_router(SETTINGS))


def _adaptive(session) -> AdaptiveLearningService:
    attempts = ExerciseAttemptRepository(session)
    ai = _ai()
    return AdaptiveLearningService(
        profile_service=LearnerProfileService(
            repository=LearnerProfileRepository(session),
            evidence_service=LearnerEvidenceService(attempts, SETTINGS),
            ai_service=ai,
            settings=SETTINGS,
        ),
        planner=LearningPlannerService(ai, SETTINGS),
        mistake_service=MistakeClusteringService(MistakePatternRepository(session), ai, SETTINGS),
        evidence_service=LearnerEvidenceService(attempts, SETTINGS),
        recommendation_repository=LearningRecommendationRepository(session),
        session_repository=LearningSessionRepository(session),
        exercise_repository=ExerciseRepository(session),
        ai_service=ai,
        settings=SETTINGS,
    )


async def test_adaptive_loop_with_ollama(session) -> None:
    exercises = await ExerciseRepository(session).list(limit=1)
    assert exercises, "seed an exercise before running this test"
    evaluation_service = EvaluationService(
        ai_service=_ai(),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=SETTINGS,
    )
    attempt, feedback, _ = await evaluation_service.submit(
        exercises[0], "今日は仕事がたくさんあります。でも、頑張ります。"
    )
    assert feedback.overall_score > 0

    await _adaptive(session).update_after_attempt(
        None, exercises[0].id, feedback.evaluation.get("issues") or []
    )

    profile = await LearnerProfileRepository(session).get_for_user(None)
    assert profile is not None
    assert profile.evaluations_since_synthesis >= 1

    service = _adaptive(session)
    recommendation = await service.recommend_next(None)
    assert recommendation.reason
    assert recommendation.exercise_id is not None
    persisted = await LearningRecommendationRepository(session).get(recommendation.id)
    assert persisted is not None
    assert persisted.status == "recommended"
    assert persisted.provider == "ollama"

    session_row = await LearningSessionRepository(session).get_active_by_user(None)
    assert session_row is not None
    assert session_row.exercises_completed == 1
