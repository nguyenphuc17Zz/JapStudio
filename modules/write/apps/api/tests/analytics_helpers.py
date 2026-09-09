"""Shared factories for analytics tests (Phase 14)."""

from datetime import datetime, timedelta, timezone

from app.models.analytics import AnalyticsEvent, Experiment, ExperimentAssignment
from app.models.exercise import AttemptStatus, Exercise, ExerciseAttempt, WritingFeedback
from app.models.quality import AIQualityEvent
from app.models.simulation import SimulationEvaluation, SimulationSession, SimulationTurn
from app.models.user import User
from app.models.writing import (
    DiscourseEvaluation,
    WritingRevision,
    WritingScenario,
    WritingSubmission,
)


async def make_exercise(session, **overrides) -> Exercise:
    exercise = Exercise(
        exercise_type=overrides.pop("exercise_type", "sentence_translation"),
        topic=overrides.pop("topic", "Work"),
        subtopic=overrides.pop("subtopic", "Overtime"),
        context=overrides.pop("context", "Một ngày làm việc khá bận rộn."),
        prompt_vi=overrides.pop("prompt_vi", "Hôm nay nhiều việc quá nên chắc tui sẽ về muộn."),
        prompt_vi_hash=overrides.pop("prompt_vi_hash", "0" * 64),
        target_length=overrides.pop("target_length", "sentence"),
        register=overrides.pop("register", "casual"),
        jlpt_level=overrides.pop("jlpt_level", "N3"),
        difficulty=overrides.pop("difficulty", 5),
        grammar_complexity=overrides.pop("grammar_complexity", 4),
        vocabulary_complexity=overrides.pop("vocabulary_complexity", 5),
        context_complexity=overrides.pop("context_complexity", 6),
        naturalness_target=overrides.pop("naturalness_target", 7),
        **overrides,
    )
    session.add(exercise)
    await session.flush()
    return exercise


async def make_attempt(
    session, exercise, *, score: int, when: datetime | None = None, **overrides
) -> ExerciseAttempt:
    attempt = ExerciseAttempt(
        exercise_id=exercise.id,
        user_id=overrides.pop("user_id", None),
        attempt_number=overrides.pop("attempt_number", 1),
        answer_text=overrides.pop("answer_text", "テストです。"),
        status=AttemptStatus.SUBMITTED,
        **overrides,
    )
    if when is not None:
        attempt.created_at = when
    session.add(attempt)
    await session.flush()
    feedback = WritingFeedback(
        attempt_id=attempt.id,
        evaluation={"skills": {}},
        overall_score=score,
        semantic_score=score,
        grammar_score=score,
        vocabulary_score=score,
        naturalness_score=score,
        context_fit_score=score,
        register_fit_score=score,
    )
    session.add(feedback)
    return attempt


async def make_discourse_evaluation(
    session, *, scores: dict, when: datetime | None = None
) -> DiscourseEvaluation:
    scenario = WritingScenario(
        user_id=None,
        genre="business_email",
        medium="email",
        audience="colleague",
        relationship="colleague",
        purpose="request",
        register="polite",
        tone="formal",
        target_length="long_writing",
        jlpt_level="N3",
        topic="Work",
        situation_vi="Tình huống.",
        context_vi="Bối cảnh.",
        required_points=[{"description": "Điểm 1"}],
        optional_points=[],
        forbidden_patterns=[],
        difficulty_metadata={},
        difficulty=5,
        status="generated",
    )
    session.add(scenario)
    exercise = await make_exercise(session, scenario_id=scenario.id, target_length="long_writing")
    submission = WritingSubmission(
        user_id=None,
        exercise_id=exercise.id,
        mode="long_form",
        status="evaluated",
    )
    session.add(submission)
    await session.flush()
    revision = WritingRevision(
        submission_id=submission.id,
        revision_number=1,
        text="長い文章です。",
        sentence_count=1,
        hints_revealed_count=0,
        revealed=False,
        status="evaluated",
    )
    session.add(revision)
    await session.flush()
    evaluation = DiscourseEvaluation(
        revision_id=revision.id,
        sentence_quality=80,
        discourse_quality=80,
        overall_writing=80,
        scores=scores,
        sentence_scores=[],
        strengths=[],
        summary="Tóm tắt.",
        evaluation_version="discourse_evaluation:v1",
        evaluated_at=when or datetime.now(timezone.utc),
    )
    if when is not None:
        evaluation.created_at = when
    session.add(evaluation)
    return evaluation


async def make_simulation(
    session, *, scores: dict, when: datetime | None = None
) -> SimulationEvaluation:
    scenario = WritingScenario(
        user_id=None,
        genre="business_email",
        medium="email",
        audience="colleague",
        relationship="colleague",
        purpose="request",
        register="polite",
        tone="formal",
        target_length="long_writing",
        jlpt_level="N3",
        topic="Work",
        situation_vi="Tình huống.",
        context_vi="Bối cảnh.",
        required_points=[],
        optional_points=[],
        forbidden_patterns=[],
        difficulty_metadata={},
        difficulty=5,
        status="generated",
    )
    session.add(scenario)
    await session.flush()
    sim_session = SimulationSession(
        user_id=None,
        scenario_id=scenario.id,
        simulation_type="customer_service",
        mode="guided",
        register="polite",
        jlpt_level="N3",
        difficulty=5,
        pressure_condition="none",
        max_turns=12,
        current_turn=1,
        objective_vi="Mục tiêu: hoàn thành hội thoại với khách hàng.",
        status="completed",
        state={},
        persona={"name": "Người bán hàng"},
        meta={},
    )
    session.add(sim_session)
    await session.flush()
    turn = SimulationTurn(
        session_id=sim_session.id,
        turn_number=1,
        actor="learner",
        turn_type="message",
        text="こんにちは。",
        status="completed",
    )
    session.add(turn)
    await session.flush()
    evaluation = SimulationEvaluation(
        turn_id=turn.id,
        scores=scores,
        overall_score=80,
        strengths=[],
        issues=[],
        evaluation_version="simulation_evaluation:v1",
        evaluated_at=when or datetime.now(timezone.utc),
    )
    if when is not None:
        evaluation.created_at = when
    session.add(evaluation)
    return evaluation


async def make_quality_event(session, **overrides) -> AIQualityEvent:
    event = AIQualityEvent(
        task=overrides.pop("task", "writing_evaluation"),
        provider=overrides.pop("provider", "fake"),
        model=overrides.pop("model", "fake-model"),
        duration_ms=overrides.pop("duration_ms", 100),
        success=overrides.pop("success", True),
        quality_status=overrides.pop("quality_status", "accepted"),
        estimated_cost=overrides.pop("estimated_cost", 0.001),
        prompt_version=overrides.pop("prompt_version", "evaluation:v1"),
        created_at=overrides.pop("created_at", datetime.now(timezone.utc)),
        **overrides,
    )
    session.add(event)
    return event


def days_ago(days: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


async def make_user(session, *, user_id: str) -> User:
    user = User(id=user_id, email=f"{user_id}@example.com", display_name=f"User {user_id}")
    session.add(user)
    await session.flush()
    return user


async def make_experiment(session, **overrides) -> Experiment:
    created_at = overrides.pop("created_at", None)
    experiment = Experiment(
        name=overrides.pop("name", "challenge_wording"),
        description=overrides.pop("description", None),
        target=overrides.pop("target", "challenge"),
        control=overrides.pop("control", {"wording": "control"}),
        variant=overrides.pop("variant", {"wording": "variant"}),
        allocation=overrides.pop("allocation", 50),
        metrics=overrides.pop("metrics", ["completion_rate", "avg_score"]),
        status=overrides.pop("status", "active"),
        **overrides,
    )
    if created_at is not None:
        experiment.created_at = created_at
    session.add(experiment)
    await session.flush()
    return experiment


async def make_assignment(
    session, experiment: Experiment, user_id: str | None, arm: str
) -> ExperimentAssignment:
    assignment = ExperimentAssignment(
        experiment_id=experiment.id,
        user_id=user_id,
        arm=arm,
    )
    session.add(assignment)
    await session.flush()
    return assignment


async def make_opened_event(
    session, exercise_id: str, *, when: datetime | None = None
) -> AnalyticsEvent:
    event = AnalyticsEvent(
        event_type="exercise_opened",
        user_id=None,
        entity_id=exercise_id,
        context={"event": "exercise_opened"},
        occurred_at=when or datetime.now(timezone.utc),
    )
    session.add(event)
    return event
