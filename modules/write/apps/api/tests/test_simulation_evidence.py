"""Simulation evidence tests (Phase 10): simulation evaluations merge into
the learner profile skills and the scenario-genre buckets."""

from datetime import datetime, timezone

from app.models import (
    Exercise,
    ExerciseAttempt,
    SimulationEvaluation,
    SimulationSession,
    SimulationTurn,
    WritingFeedback,
)
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    SimulationEvaluationRepository,
    SimulationSessionRepository,
    SimulationTurnRepository,
    WritingFeedbackRepository,
    WritingScenarioRepository,
)
from app.services.learner_evidence import SIMULATION_SKILLS, LearnerEvidenceService

from conftest import exercise_factory
from simulation_helpers import scenario_factory


async def _seed_attempt(session) -> ExerciseAttempt:
    exercise = await ExerciseRepository(session).add(
        Exercise(**exercise_factory(jlpt_level="N4", topic="Work"))
    )
    attempt = await ExerciseAttemptRepository(session).add(
        ExerciseAttempt(
            exercise_id=exercise.id,
            user_id=None,
            attempt_number=1,
            answer_text="テストの回答です。",
        )
    )
    await WritingFeedbackRepository(session).add(
        WritingFeedback(
            attempt_id=attempt.id,
            evaluation={},
            overall_score=70,
            semantic_score=70,
            grammar_score=70,
            vocabulary_score=70,
            naturalness_score=70,
            context_fit_score=70,
            register_fit_score=70,
        )
    )
    return attempt


async def _seed_simulation_evaluation(
    session,
    *,
    scores: dict,
    simulation_type: str = "business_internal",
    genre: str = "business_email",
) -> None:
    scenario = scenario_factory(genre=genre)
    await WritingScenarioRepository(session).add(scenario)
    sim_session = await SimulationSessionRepository(session).add(
        SimulationSession(
            user_id=None,
            scenario_id=scenario.id,
            simulation_type=simulation_type,
            mode="guided",
            register="business",
            jlpt_level="N3",
            difficulty=5,
            pressure_condition="normal",
            status="completed",
            max_turns=12,
            current_turn=2,
            objective_vi="Đạt thỏa thuận.",
            persona={"name": "佐藤"},
            state={"unresolved_items": []},
            meta={"stages": []},
        )
    )
    turn = await SimulationTurnRepository(session).add(
        SimulationTurn(
            session_id=sim_session.id,
            turn_number=1,
            actor="user",
            turn_type="user_reply",
            text="承知しました。よろしくお願いします。",
            mode="guided",
            status="evaluated",
        )
    )
    overall = round(
        (scores.get("goal_progress", 0) + scores.get("communication_effectiveness", 0)) / 2
    )
    await SimulationEvaluationRepository(session).add(
        SimulationEvaluation(
            turn_id=turn.id,
            scores={**scores, "overall": overall},
            overall_score=overall,
            strengths=["Rõ ràng"],
            issues=[],
            corrections=None,
            feedback_vi="Tốt.",
            evaluation_version="simulation:v1",
            provenance=None,
            evaluated_at=datetime.now(timezone.utc),
        )
    )


def _service(session) -> LearnerEvidenceService:
    return LearnerEvidenceService(
        ExerciseAttemptRepository(session),
        discourse_repository=None,
        simulation_repository=SimulationEvaluationRepository(session),
    )


async def test_simulation_skills_merge_into_profile(session) -> None:
    await _seed_attempt(session)
    await _seed_simulation_evaluation(
        session,
        scores={
            "goal_progress": 80,
            "communication_effectiveness": 75,
            "scenario_fit": 90,
            "sentence_quality": 70,
            "naturalness_score": 70,
        },
    )
    summary = await _service(session).compute_summary(None)

    for skill in SIMULATION_SKILLS:
        assert skill in summary["skills"]
    assert summary["skills"]["goal_progress"]["evidence_count"] == 1
    assert summary["skills"]["goal_progress"]["score"] == 80
    assert summary["skills"]["communication_effectiveness"]["score"] == 75
    assert summary["skills"]["response_management"]["score"] == 78
    assert "goal_progress" in summary["strengths"]


async def test_simulation_genre_buckets(session) -> None:
    await _seed_attempt(session)
    await _seed_simulation_evaluation(
        session,
        scores={
            "goal_progress": 60,
            "communication_effectiveness": 60,
            "scenario_fit": 90,
        },
        simulation_type="deadline_negotiation",
        genre="business_email",
    )
    await _seed_simulation_evaluation(
        session,
        scores={
            "goal_progress": 70,
            "communication_effectiveness": 70,
            "scenario_fit": 60,
        },
        simulation_type="customer_support",
        genre="customer_service",
    )
    summary = await _service(session).compute_summary(None)

    buckets = summary["scenario_genres"]
    assert buckets["business_email"]["count"] == 1
    assert buckets["business_email"]["average_fit"] == 90
    assert buckets["customer_service"]["count"] == 1
    assert buckets["customer_service"]["average_fit"] == 60


async def test_negotiation_skill_proxy(session) -> None:
    await _seed_attempt(session)
    await _seed_simulation_evaluation(
        session,
        scores={
            "goal_progress": 50,
            "communication_effectiveness": 80,
            "scenario_fit": 50,
        },
        simulation_type="deadline_negotiation",
    )
    summary = await _service(session).compute_summary(None)
    assert summary["skills"]["negotiation"]["score"] == 80
    assert summary["skills"]["clarification"]["score"] == 75


async def test_negotiation_skill_plain_conversation(session) -> None:
    await _seed_attempt(session)
    await _seed_simulation_evaluation(
        session,
        scores={
            "goal_progress": 50,
            "communication_effectiveness": 80,
            "scenario_fit": 50,
        },
        simulation_type="casual_conversation",
    )
    summary = await _service(session).compute_summary(None)
    assert summary["skills"]["negotiation"]["score"] == 70
