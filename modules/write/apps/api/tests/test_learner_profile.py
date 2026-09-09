"""LearnerProfileService tests (Phase 6): get/create, preference updates,
incremental counters, AI synthesis merge semantics and auto-refresh."""

from app.core.config import Settings
from app.providers.ai.router import AIRouter
from app.repositories import (
    ExerciseAttemptRepository,
    LearnerProfileRepository,
)
from app.schemas.learning_ai import (
    LearnerProfileSynthesisResult,
    TrendSummary,
)
from app.services.ai_service import AIService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService

from scripted_provider import ScriptedAIProvider


def _service(session, *, provider: ScriptedAIProvider | None = None) -> LearnerProfileService:
    router = AIRouter(
        providers={"fake": lambda: provider or ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    return LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(ExerciseAttemptRepository(session)),
        ai_service=AIService(ai_router=router),
    )


async def test_get_or_create_anonymous(session) -> None:
    service = _service(session)
    profile = await service.get_or_create(None)
    assert profile.user_id is None
    assert profile.daily_target == 3
    assert profile.profile_version == "learner_profile:v1"
    again = await service.get_or_create(None)
    assert again.id == profile.id
    rows = await LearnerProfileRepository(session).count()
    assert rows == 1


async def test_update_preferences(session) -> None:
    service = _service(session)
    profile = await service.update_preferences(
        None,
        {
            "goal": "business",
            "target_jlpt": "N3",
            "daily_target": 7,
            "preferred_registers": ["business", "polite"],
            "preferred_topics": ["công việc"],
        },
    )
    assert profile.goal == "business"
    assert profile.target_jlpt == "N3"
    assert profile.daily_target == 7
    assert profile.preferred_registers == ["business", "polite"]
    assert profile.preferred_topics == ["công việc"]


async def test_update_preferences_clamps(session) -> None:
    service = _service(session)
    profile = await service.update_preferences(None, {"target_jlpt": "N9", "daily_target": 99})
    assert profile.target_jlpt is None
    assert profile.daily_target == 20


async def test_synthesize_uses_deterministic_evidence(session) -> None:
    ai_result = LearnerProfileSynthesisResult(
        strengths=["AI invented strength"],
        weaknesses=["AI invented weakness"],
        estimated_jlpt={"min_level": "N4", "max_level": "N4", "confidence": "high"},
        recent_trends=TrendSummary(overall_score=99, improvement=50, last_7d_attempts=5),
    )
    provider = ScriptedAIProvider(profile_syntheses=[ai_result])
    service = _service(session, provider=provider)
    state = await service.synthesize(None)
    assert state["evidence_count"] == 0
    assert state["strengths"] == []  # too little evidence: no AI framing accepted
    assert state["weaknesses"] == []
    assert state["estimated_jlpt"] == {
        "min_level": "N5",
        "max_level": "N5",
        "confidence": "low",
    }
    assert state["recent_trends"]["overall_score"] == 0
    profile = await service.get_or_create(None)
    assert profile.evaluations_since_synthesis == 0
    assert state["metadata"]["ai_framed"] is True


async def test_synthesize_accepts_ai_framing_with_evidence(session) -> None:
    from datetime import datetime, timedelta, timezone

    from app.models import Exercise, ExerciseAttempt, WritingFeedback
    from app.repositories import ExerciseRepository, WritingFeedbackRepository

    from conftest import exercise_factory

    for day in range(3):
        exercise = await ExerciseRepository(session).add(
            Exercise(**exercise_factory(jlpt_level="N4", topic=f"Topic {day}"))
        )
        attempt = await ExerciseAttemptRepository(session).add(
            ExerciseAttempt(
                exercise_id=exercise.id,
                user_id=None,
                attempt_number=1,
                answer_text="回答",
            )
        )
        attempt.created_at = datetime.now(timezone.utc) - timedelta(days=day)
        await ExerciseAttemptRepository(session).update(attempt)
        await WritingFeedbackRepository(session).add(
            WritingFeedback(
                attempt_id=attempt.id,
                evaluation={},
                overall_score=50,
                semantic_score=50,
                grammar_score=50,
                vocabulary_score=50,
                naturalness_score=50,
                context_fit_score=50,
                register_fit_score=50,
            )
        )
    ai_result = LearnerProfileSynthesisResult(
        strengths=["Diễn đạt ý rõ ràng"],
        weaknesses=[],
        estimated_jlpt={"min_level": "N5", "max_level": "N5", "confidence": "low"},
        recent_trends=TrendSummary(overall_score=0, improvement=0, last_7d_attempts=0),
    )
    service = _service(session, provider=ScriptedAIProvider(profile_syntheses=[ai_result]))
    state = await service.synthesize(None)
    assert state["evidence_count"] == 3
    assert state["strengths"] == ["Diễn đạt ý rõ ràng"]
    assert state["weaknesses"] != []  # deterministic weaknesses (all skills < 65)
    assert state["estimated_jlpt"]["confidence"] == "low"  # no successful attempts yet


async def test_synthesize_fallback_without_ai(session) -> None:
    class FailingProvider(ScriptedAIProvider):
        async def generate_structured(self, prompt, response_model, **kwargs):
            raise RuntimeError("boom")

    service = _service(session, provider=FailingProvider())
    state = await service.synthesize(None)
    assert state["evidence_count"] == 0
    assert state["metadata"]["ai_framed"] is False
    assert state["estimated_jlpt"] == {"min_level": "N5", "max_level": "N5", "confidence": "low"}


async def test_record_evaluation_auto_synthesizes(session) -> None:
    settings = Settings(
        ai_learning_profile_refresh_interval=1,
        ai_learning_auto_update_enabled=True,
    )
    router = AIRouter(
        providers={"fake": lambda: ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    service = LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(ExerciseAttemptRepository(session)),
        ai_service=AIService(ai_router=router),
        settings=settings,
    )
    await service.record_evaluation(None)
    profile = await service.get_or_create(None)
    assert profile.evaluations_since_synthesis == 0
    assert profile.adaptive_state is not None


async def test_record_evaluation_counts_without_auto(session) -> None:
    settings = Settings(
        ai_learning_profile_refresh_interval=5,
        ai_learning_auto_update_enabled=True,
    )
    router = AIRouter(
        providers={"fake": lambda: ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    service = LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(ExerciseAttemptRepository(session)),
        ai_service=AIService(ai_router=router),
        settings=settings,
    )
    await service.record_evaluation(None)
    profile = await service.get_or_create(None)
    assert profile.evaluations_since_synthesis == 1
    assert profile.adaptive_state == {}


async def test_profile_summary_shape(session) -> None:
    service = _service(session)
    await service.synthesize(None)
    summary = await service.profile_summary(None)
    assert summary["goal"] is None
    assert summary["daily_target"] == 3
    assert "skills" in summary
    assert "estimated_jlpt" in summary
    assert summary["profile_version"] == "learner_profile:v1"
