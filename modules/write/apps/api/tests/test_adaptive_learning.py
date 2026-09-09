"""AdaptiveLearningService tests (Phase 6): recommendation pipeline,
post-evaluation hook, sessions and effectiveness completion."""

from app.models import Exercise, ExerciseAttempt
from app.providers.ai.router import AIRouter
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    LearnerProfileRepository,
    LearningRecommendationRepository,
    LearningSessionRepository,
    MistakePatternRepository,
)
from app.services.adaptive_learning_service import AdaptiveLearningService
from app.services.ai_service import AIService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.learning_planner_service import LearningPlannerService
from app.services.mistake_clustering_service import MistakeClusteringService

from conftest import exercise_factory
from scripted_provider import ScriptedAIProvider


def _service(session, *, provider: ScriptedAIProvider | None = None) -> AdaptiveLearningService:
    provider = provider or ScriptedAIProvider()
    router = AIRouter(
        providers={"fake": lambda: provider},
        default_provider="fake",
        fallback_providers=[],
    )
    ai = AIService(ai_router=router)
    attempts = ExerciseAttemptRepository(session)
    return AdaptiveLearningService(
        profile_service=LearnerProfileService(
            repository=LearnerProfileRepository(session),
            evidence_service=LearnerEvidenceService(attempts),
            ai_service=ai,
        ),
        planner=LearningPlannerService(ai),
        mistake_service=MistakeClusteringService(MistakePatternRepository(session), ai),
        evidence_service=LearnerEvidenceService(attempts),
        recommendation_repository=LearningRecommendationRepository(session),
        session_repository=LearningSessionRepository(session),
        exercise_repository=ExerciseRepository(session),
        ai_service=ai,
    )


async def _seed_evaluated_attempt(session, *, score: int = 80) -> ExerciseAttempt:
    exercise = await ExerciseRepository(session).add(
        Exercise(
            **exercise_factory(
                jlpt_level="N4",
                topic="Công việc",
                prompt_vi="Viết về một buổi sáng trước khi đi làm, kể cả lúc tắc đường.",
                prompt_vi_hash="a" * 64,
            )
        )
    )
    return await ExerciseAttemptRepository(session).add(
        ExerciseAttempt(
            exercise_id=exercise.id,
            user_id=None,
            attempt_number=1,
            answer_text="今日は仕事がたくさんあります。",
        )
    )


async def test_recommend_next_persists_with_exercise(session) -> None:
    service = _service(session)
    recommendation = await service.recommend_next(None)
    assert recommendation.status == "recommended"
    assert recommendation.exercise_id is not None
    assert recommendation.strategy in {"targeted", "reinforcement", "exploration"}
    assert recommendation.focus_skills
    assert recommendation.reason
    assert recommendation.provider == "fake"
    exercise = await ExerciseRepository(session).get(recommendation.exercise_id)
    assert exercise is not None
    assert exercise.jlpt_level.value in {"N5", "N4", "N3", "N2", "N1"}
    assert recommendation.explanation is not None  # stage 4 enrichment


async def test_recommend_next_rotation_and_history(session) -> None:
    service = _service(session)
    first = await service.recommend_next(None)
    second = await service.recommend_next(None)
    assert first.strategy in {"targeted", "reinforcement", "exploration"}
    assert second.strategy in {"targeted", "reinforcement", "exploration"}
    _, total = await service.history(None)
    assert total == 2
    active = await service.get_recommendation(None)
    assert active is not None and active.id == second.id


async def test_update_after_attempt_creates_session_and_patterns(session) -> None:
    attempt = await _seed_evaluated_attempt(session)
    service = _service(session)
    await service.update_after_attempt(
        None,
        attempt.exercise_id,
        [
            {
                "category": "grammar",
                "severity": "major",
                "original_text": "私の仕事",
                "suggested_fix": "私の仕事は",
                "explanation": "thiếu trợ từ",
            }
        ],
    )
    session_row = await LearningSessionRepository(session).get_active_by_user(None)
    assert session_row is not None
    assert session_row.exercises_completed == 1
    patterns = await MistakePatternRepository(session).list_by_user(None)
    assert len(patterns) == 1
    assert patterns[0].canonical_label in {"particle_ha_ga", "particle_ni_de", "conditional_forms"}
    profile = await LearnerProfileRepository(session).get_for_user(None)
    assert profile.evaluations_since_synthesis == 1


async def test_update_after_attempt_never_raises(session) -> None:
    class FailingProvider(ScriptedAIProvider):
        async def generate_structured(self, prompt, response_model, **kwargs):
            raise RuntimeError("boom")

    service = _service(session, provider=FailingProvider())
    attempt = await _seed_evaluated_attempt(session)
    await service.update_after_attempt(None, attempt.exercise_id, [])
    session_row = await LearningSessionRepository(session).get_active_by_user(None)
    assert session_row is not None
    assert session_row.exercises_completed == 1


async def test_complete_recommendation_records_effectiveness(session) -> None:
    service = _service(session)
    recommendation = await service.recommend_next(None)
    assert recommendation.exercise_id is not None
    await ExerciseAttemptRepository(session).add(
        ExerciseAttempt(
            exercise_id=recommendation.exercise_id,
            user_id=None,
            attempt_number=1,
            answer_text="回答",
        )
    )
    await service.update_after_attempt(None, recommendation.exercise_id, [])
    updated = await LearningRecommendationRepository(session).get(recommendation.id)
    assert updated.status == "completed"
    assert updated.skill_after is not None
    assert "skills" in updated.skill_after


async def test_session_rolls_over_daily(session) -> None:
    from datetime import datetime, timedelta, timezone

    service = _service(session)
    await service.update_after_attempt(None, "x", [])
    session_row = await LearningSessionRepository(session).get_active_by_user(None)
    assert session_row is not None
    session_row.created_at = datetime.now(timezone.utc) - timedelta(days=2)
    await LearningSessionRepository(session).update(session_row)
    await service.update_after_attempt(None, "y", [])
    new_session = await LearningSessionRepository(session).get_active_by_user(None)
    assert new_session is not None
    assert new_session.id != session_row.id
    assert new_session.exercises_completed == 1
    old = await LearningSessionRepository(session).get(session_row.id)
    assert old.is_active is False
    assert old.ended_at is not None


async def test_get_today_shape(session) -> None:
    service = _service(session)
    payload = await service.get_today(None)
    assert payload["focus"]["evidence_count"] == 0
    assert payload["recommendation"] is None
    assert payload["session"] is None or payload["session"]["exercises_completed"] >= 0
