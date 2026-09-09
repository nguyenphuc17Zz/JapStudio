"""LearningPlannerService tests (Phase 6): deterministic strategy selection,
parameter validation/clamping and the no-AI fallback plan."""

import pytest
from app.core.config import Settings
from app.providers.ai.router import AIRouter
from app.schemas.learning_ai import LearningRecommendationResult, PlannedExercise
from app.services.ai_service import AIService
from app.services.learning_planner_service import LearningPlannerService

from scripted_provider import ScriptedAIProvider


def _planner(provider: ScriptedAIProvider | None = None, settings: Settings | None = None):
    router = AIRouter(
        providers={"fake": lambda: provider or ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    return LearningPlannerService(AIService(ai_router=router), settings=settings)


def _summary(**overrides) -> dict:
    base = {
        "goal": None,
        "target_jlpt": "N4",
        "daily_target": 3,
        "skills": {
            s: {"score": 70, "trend": "stable"}
            for s in (
                "grammar",
                "vocabulary",
                "naturalness",
                "semantic",
                "context_fit",
                "register_fit",
            )
        },
        "strengths": [],
        "weaknesses": [],
        "estimated_jlpt": {"min_level": "N4", "max_level": "N4", "confidence": "medium"},
        "recent_topics": ["Công việc"],
        "average_difficulty": 5,
        "evidence_count": 10,
    }
    base.update(overrides)
    return base


def test_strategy_exploration_with_little_evidence() -> None:
    planner = _planner()
    summary = _summary(evidence_count=2)
    assert planner.select_strategy(summary, rotation=0) == "exploration"


def test_strategy_targeted_on_critical_weakness() -> None:
    planner = _planner()
    summary = _summary(evidence_count=10)
    summary["skills"]["grammar"]["score"] = 40
    assert planner.select_strategy(summary, rotation=0) == "targeted"


def test_strategy_rotation_70_20_10() -> None:
    planner = _planner()
    summary = _summary(evidence_count=10)
    counts = {"targeted": 0, "reinforcement": 0, "exploration": 0}
    for rotation in range(10):
        counts[planner.select_strategy(summary, rotation)] += 1
    assert counts == {"targeted": 7, "reinforcement": 2, "exploration": 1}


def test_weak_scenario_genre_detection() -> None:
    planner = _planner()
    summary = _summary(
        evidence_count=10,
        scenario_genres={
            "business_email": {"count": 4, "average_fit": 58},
            "casual_message": {"count": 5, "average_fit": 80},
        },
    )
    assert planner.weak_scenario_genre(summary) == "business_email"
    assert planner.select_strategy(summary, rotation=5) == "scenario_practice"


def test_weak_scenario_genre_requires_evidence() -> None:
    planner = _planner()
    summary = _summary(
        evidence_count=10,
        scenario_genres={"business_email": {"count": 1, "average_fit": 40}},
    )
    assert planner.weak_scenario_genre(summary) is None


async def test_scenario_practice_plan_is_deterministic() -> None:
    planner = _planner()
    summary = _summary(
        evidence_count=10,
        average_difficulty=5,
        estimated_jlpt={"min_level": "N4", "max_level": "N3", "confidence": "medium"},
        scenario_genres={"business_email": {"count": 4, "average_fit": 55}},
    )
    result, reason, used_fallback = await planner.plan(summary, "scenario_practice", rotation=0)
    assert used_fallback is True
    assert result.strategy == "scenario_practice"
    assert result.planned_exercise.exercise_type == "email_writing"
    assert result.planned_exercise.target_length == "paragraph"
    assert result.planned_exercise.register == "business"
    assert reason


def test_validate_adjust_clamps_difficulty_and_jlpt() -> None:
    planner = _planner(settings=Settings(ai_learning_max_difficulty_step=2))
    summary = _summary(average_difficulty=5, target_jlpt="N4")
    result = LearningRecommendationResult(
        strategy="targeted",
        planned_exercise=PlannedExercise(
            exercise_type="sentence_translation",
            topic="Công việc",
            register="polite",
            jlpt_level="N1",
            difficulty=10,
            target_length="sentence",
            focus_skills=["grammar"],
        ),
        reason="test",
    )
    adjusted = planner._validate_adjust(result, summary, rotation=3)
    assert adjusted.planned_exercise.difficulty == 7  # 5 + max step 2
    assert adjusted.planned_exercise.jlpt_level in {"N3", "N4", "N5"}  # within 1 step of N4
    assert adjusted.planned_exercise.topic != "Công việc"  # recent topic avoided
    assert adjusted.planned_exercise.topic


def test_schema_rejects_invalid_enum_values() -> None:
    with pytest.raises(ValueError):
        LearningRecommendationResult(
            strategy="targeted",
            planned_exercise=PlannedExercise(
                exercise_type="not_a_type",
                topic="Mới",
                register="polite",
                jlpt_level="N9",
                difficulty=3,
                target_length="sentence",
                focus_skills=["grammar"],
            ),
            reason="test",
        )


def test_validate_adjust_defaults_empty_focus_skills() -> None:
    planner = _planner()
    summary = _summary()
    result = LearningRecommendationResult(
        strategy="targeted",
        planned_exercise=PlannedExercise(
            exercise_type="sentence_translation",
            topic="Mới",
            register="polite",
            jlpt_level="N4",
            difficulty=5,
            target_length="sentence",
            focus_skills=[],
        ),
        reason="test",
    )
    adjusted = planner._validate_adjust(result, summary, rotation=1)
    assert adjusted.planned_exercise.focus_skills == ["grammar", "naturalness"]


def test_fallback_plan_is_deterministic() -> None:
    planner = _planner()
    summary = _summary(evidence_count=0)
    result = planner._fallback_plan(summary, "exploration", rotation=0)
    assert result.planned_exercise.exercise_type == "sentence_translation"
    assert result.planned_exercise.register == "polite"
    assert result.planned_exercise.topic  # a real topic
    assert result.reason  # a real learner-facing reason


async def test_plan_uses_ai_and_validates() -> None:
    provider = ScriptedAIProvider(
        learning_plans=[
            LearningRecommendationResult(
                strategy="targeted",
                planned_exercise=PlannedExercise(
                    exercise_type="sentence_translation",
                    topic="Hoàn toàn mới",
                    register="polite",
                    jlpt_level="N3",
                    difficulty=6,
                    target_length="sentence",
                    focus_skills=["grammar"],
                ),
                reason="Bạn hay nhầm trợ từ; bài này giúp luyện trợ từ.",
            )
        ]
    )
    planner = _planner(provider)
    result, reason, fallback = await planner.plan(
        _summary(average_difficulty=5, target_jlpt="N4"), "targeted", rotation=0
    )
    assert fallback is False
    assert reason == "Bạn hay nhầm trợ từ; bài này giúp luyện trợ từ."
    assert result.planned_exercise.topic == "Hoàn toàn mới"
    assert result.planned_exercise.difficulty in {4, 5, 6}


async def test_plan_falls_back_without_ai() -> None:
    class FailingProvider(ScriptedAIProvider):
        async def generate_structured(self, prompt, response_model, **kwargs):
            raise RuntimeError("boom")

    planner = _planner(FailingProvider())
    result, _, fallback = await planner.plan(_summary(evidence_count=0), "exploration", rotation=0)
    assert fallback is True
    assert result.planned_exercise.exercise_type == "sentence_translation"
