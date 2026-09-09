"""LearnerEvidenceService tests (Phase 6): recency weighting, confidence,
trends, JLPT band estimation and empty-state behavior."""

from datetime import datetime, timedelta, timezone

from app.models import (
    DiscourseEvaluation,
    Exercise,
    ExerciseAttempt,
    WritingFeedback,
    WritingRevision,
    WritingSubmission,
)
from app.repositories import (
    DiscourseEvaluationRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    WritingFeedbackRepository,
    WritingRevisionRepository,
    WritingSubmissionRepository,
)
from app.services.learner_evidence import (
    LearnerEvidenceService,
    confidence_level,
    recency_weight,
)

from conftest import exercise_factory


async def _seed_attempt(
    session, *, score: int, age_days: float, jlpt: str = "N4"
) -> ExerciseAttempt:
    exercise = await ExerciseRepository(session).add(
        Exercise(**exercise_factory(jlpt_level=jlpt, topic=f"Topic {jlpt}"))
    )
    attempt = await ExerciseAttemptRepository(session).add(
        ExerciseAttempt(
            exercise_id=exercise.id,
            user_id=None,
            attempt_number=1,
            answer_text="テストの回答です。",
        )
    )
    created = datetime.now(timezone.utc) - timedelta(days=age_days)
    attempt.created_at = created
    await ExerciseAttemptRepository(session).update(attempt)
    await WritingFeedbackRepository(session).add(
        WritingFeedback(
            attempt_id=attempt.id,
            evaluation={},
            overall_score=score,
            semantic_score=score,
            grammar_score=score,
            vocabulary_score=score,
            naturalness_score=score,
            context_fit_score=score,
            register_fit_score=score,
        )
    )
    return attempt


def test_recency_weight_decays() -> None:
    assert recency_weight(0, 30) == 1.0
    assert recency_weight(30, 30) == 1 / __import__("math").e
    assert 0 < recency_weight(1000, 30) < 1
    assert recency_weight(100, 0) == 1.0


def test_confidence_level_thresholds() -> None:
    assert confidence_level(0) == "low"
    assert confidence_level(2) == "low"
    assert confidence_level(3) == "medium"
    assert confidence_level(9) == "medium"
    assert confidence_level(10) == "high"


async def test_empty_summary(session) -> None:
    service = LearnerEvidenceService(ExerciseAttemptRepository(session))
    summary = await service.compute_summary(None)
    assert summary["evidence_count"] == 0
    assert summary["estimated_jlpt"] == {
        "min_level": "N5",
        "max_level": "N5",
        "confidence": "low",
    }
    assert summary["recent_trends"]["last_7d_attempts"] == 0
    assert summary["skills"]["grammar"]["score"] == 0
    assert summary["strengths"] == []
    assert summary["weaknesses"] == []


async def test_scores_and_jlpt_band(session) -> None:
    await _seed_attempt(session, score=90, age_days=0, jlpt="N3")
    await _seed_attempt(session, score=80, age_days=1, jlpt="N4")
    service = LearnerEvidenceService(ExerciseAttemptRepository(session))
    summary = await service.compute_summary(None)
    assert summary["evidence_count"] == 2
    assert summary["skills"]["grammar"]["score"] == 85
    assert summary["skills"]["grammar"]["confidence"] == "low"
    assert summary["strengths"] == [
        "context_fit",
        "grammar",
        "naturalness",
        "register_fit",
        "semantic",
        "vocabulary",
    ]
    assert summary["estimated_jlpt"] == {"min_level": "N4", "max_level": "N3", "confidence": "low"}
    assert summary["topics"] == ["Topic N3", "Topic N4"]  # alphabetical on tie


async def test_improvement_trend(session) -> None:
    await _seed_attempt(session, score=50, age_days=0, jlpt="N4")
    await _seed_attempt(session, score=40, age_days=10, jlpt="N4")
    service = LearnerEvidenceService(ExerciseAttemptRepository(session))
    summary = await service.compute_summary(None)
    assert summary["recent_trends"]["last_7d_attempts"] == 1
    assert summary["recent_trends"]["improvement"] == 10.0
    assert summary["skills"]["grammar"]["trend"] == "improving"
    assert summary["skills"]["grammar"]["score"] < 50


async def test_declining_trend(session) -> None:
    await _seed_attempt(session, score=40, age_days=0, jlpt="N4")
    await _seed_attempt(session, score=60, age_days=10, jlpt="N4")
    service = LearnerEvidenceService(ExerciseAttemptRepository(session))
    summary = await service.compute_summary(None)
    assert summary["skills"]["grammar"]["trend"] == "declining"


async def test_weaknesses_below_threshold(session) -> None:
    await _seed_attempt(session, score=70, age_days=0, jlpt="N4")
    service = LearnerEvidenceService(ExerciseAttemptRepository(session))
    summary = await service.compute_summary(None)
    assert summary["weaknesses"] == [
        "audience_fit",
        "clarification",
        "coherence",
        "cohesion",
        "communication_effectiveness",
        "constraint_compliance",
        "flow",
        "goal_progress",
        "negotiation",
        "organization",
        "purpose_fit",
        "response_management",
        "scenario_semantic_fit",
        "style_consistency",
        "tone_fit",
    ]
    assert len(summary["strengths"]) == 6


async def test_discourse_evidence_merges_into_skills(session) -> None:
    await _seed_attempt(session, score=90, age_days=0, jlpt="N4")
    exercise = await ExerciseRepository(session).add(
        Exercise(**exercise_factory(jlpt_level="N4", topic="Discourse", target_length="paragraph"))
    )
    attempt = await ExerciseAttemptRepository(session).add(
        ExerciseAttempt(
            exercise_id=exercise.id,
            user_id=None,
            attempt_number=1,
            answer_text="今日は忙しかった。だから帰りが遅くなった。",
        )
    )
    submission = await WritingSubmissionRepository(session).add(
        WritingSubmission(user_id=None, exercise_id=exercise.id, mode="long_form")
    )
    revision = await WritingRevisionRepository(session).add(
        WritingRevision(
            submission_id=submission.id,
            revision_number=1,
            attempt_id=attempt.id,
            text="今日は忙しかった。だから帰りが遅くなった。",
            sentence_count=2,
        )
    )
    await DiscourseEvaluationRepository(session).add(
        DiscourseEvaluation(
            revision_id=revision.id,
            sentence_quality=90,
            discourse_quality=88,
            overall_writing=89,
            scores={
                "coherence": 88,
                "cohesion": 85,
                "organization": 90,
                "flow": 86,
                "style_consistency": 92,
                "redundancy": 87,
            },
            sentence_scores=[],
            strengths=[],
            summary="OK.",
            evaluation_version="discourse:v1",
            evaluated_at=datetime.now(timezone.utc),
        )
    )
    service = LearnerEvidenceService(
        ExerciseAttemptRepository(session),
        discourse_repository=DiscourseEvaluationRepository(session),
    )
    summary = await service.compute_summary(None)
    assert summary["skills"]["coherence"]["score"] == 88
    assert summary["skills"]["cohesion"]["score"] == 85
    assert summary["skills"]["organization"]["score"] == 90
    assert summary["skills"]["flow"]["score"] == 86
    assert summary["skills"]["style_consistency"]["score"] == 92
    assert summary["skills"]["coherence"]["evidence_count"] == 1
    assert summary["skills"]["grammar"]["score"] == 90
    assert "coherence" in summary["strengths"]


async def test_recent_topics_newest_first(session) -> None:
    await _seed_attempt(session, score=70, age_days=0, jlpt="N4")
    await _seed_attempt(session, score=70, age_days=1, jlpt="N3")
    service = LearnerEvidenceService(ExerciseAttemptRepository(session))
    summary = await service.compute_summary(None)
    assert summary["recent_topics"][0] == "Topic N4"
