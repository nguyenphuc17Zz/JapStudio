"""Exercise attempt endpoints: submission, history, hints and reveal.

- POST /api/v1/exercises/{exercise_id}/attempts          -> submit + evaluate
- GET  /api/v1/exercises/{exercise_id}/attempts          -> paginated history
- GET  /api/v1/exercises/{exercise_id}/attempts/{id}     -> persisted evaluation
- POST /api/v1/exercises/{exercise_id}/attempts/{id}/hint   -> next progressive hint
- POST /api/v1/exercises/{exercise_id}/attempts/{id}/reveal -> corrected versions
- POST /api/v1/exercises/{exercise_id}/attempts/{id}/vocabulary/extract
        -> re-run vocabulary extraction (idempotent)
- GET  /api/v1/exercises/{exercise_id}/attempts/{id}/vocabulary
        -> vocabulary discovered from this attempt

Learning mode: when enabled, the initial submission and the GET responses
never leak the corrected versions until the reveal endpoint is called.
Vocabulary extraction runs automatically after evaluation but never breaks
it; failures can be retried with the extract/reprocess endpoints.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import ConflictError, NotFoundError
from app.db.session import get_session
from app.models import Exercise, ExerciseAttempt
from app.repositories import (
    DailyGoalRepository,
    DailyMissionRepository,
    DiscourseEvaluationRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    LearnerMemoryRepository,
    LearnerProfileRepository,
    LearningRecommendationRepository,
    LearningSessionRepository,
    MilestoneRepository,
    MistakePatternRepository,
    UserStreakRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
    WritingWeaknessRepository,
    ExpressionRecordRepository,
    XPEventRepository,
)
from app.schemas.attempt import (
    AttemptEvaluationResponse,
    AttemptListItem,
    AttemptListResponse,
    AttemptSubmitRequest,
    HintResponse,
    LearningModeState,
    RevealResponse,
)
from app.schemas.evaluation_ai import WritingEvaluation
from app.schemas.vocabulary import (
    AttemptVocabularyItem,
    AttemptVocabularyResponse,
    VocabularyExtractResponse,
)
from app.services.adaptive_learning_service import AdaptiveLearningService
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.curriculum_service import CurriculumService
from app.services.evaluation_service import EvaluationService
from app.services.gamification_service import GamificationService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.learning_planner_service import LearningPlannerService
from app.services.memory_service import MemoryService
from app.services.mission_service import MissionService
from app.services.mistake_clustering_service import MistakeClusteringService
from app.services.vocabulary_service import VocabularyService
from app.services.writing_intelligence_service import WritingIntelligenceService
from app.services.expression_intelligence_service import ExpressionIntelligenceService

logger = logging.getLogger("app.attempts")

router = APIRouter(tags=["attempts"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_ai_service(settings: Settings) -> AIService:
    return AIService(settings=settings)


def _build_memory_service(session: AsyncSession, settings: Settings) -> MemoryService:
    return MemoryService(
        repository=LearnerMemoryRepository(session),
        profile_repository=LearnerProfileRepository(session),
        ai_service=_build_ai_service(settings),
        settings=settings,
    )


def _build_vocabulary_service(session: AsyncSession, settings: Settings) -> VocabularyService:
    return VocabularyService(
        ai_service=_build_ai_service(settings),
        entry_repository=VocabularyEntryRepository(session),
        user_repository=UserVocabularyRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        exercise_repository=ExerciseRepository(session),
        settings=settings,
    )


def _build_adaptive_service(session: AsyncSession, settings: Settings) -> AdaptiveLearningService:
    ai_service = _build_ai_service(settings)
    return AdaptiveLearningService(
        profile_service=LearnerProfileService(
            repository=LearnerProfileRepository(session),
            evidence_service=LearnerEvidenceService(
                ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
            ),
            ai_service=ai_service,
            settings=settings,
        ),
        planner=LearningPlannerService(ai_service, settings),
        mistake_service=MistakeClusteringService(
            MistakePatternRepository(session), ai_service, settings
        ),
        evidence_service=LearnerEvidenceService(
            ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
        ),
        recommendation_repository=LearningRecommendationRepository(session),
        session_repository=LearningSessionRepository(session),
        exercise_repository=ExerciseRepository(session),
        ai_service=ai_service,
        settings=settings,
        memory_service=_build_memory_service(session, settings),
    )


def _build_gamification_service(session: AsyncSession, settings: Settings) -> GamificationService:
    ai_service = _build_ai_service(settings)
    profile_service = LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(
            ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
        ),
        ai_service=ai_service,
        settings=settings,
    )
    mission_service = MissionService(
        mission_repository=DailyMissionRepository(session),
        profile_service=profile_service,
        ai_service=ai_service,
        settings=settings,
    )
    return GamificationService(
        xp_repository=XPEventRepository(session),
        streak_repository=UserStreakRepository(session),
        goal_repository=DailyGoalRepository(session),
        milestone_repository=MilestoneRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        session_repository=LearningSessionRepository(session),
        missions=mission_service,
        profile_service=profile_service,
        ai_service=ai_service,
        settings=settings,
    )


def _build_writing_intelligence_service(
    session: AsyncSession, settings: Settings
) -> WritingIntelligenceService:
    return WritingIntelligenceService(
        weakness_repository=WritingWeaknessRepository(session),
        settings=settings,
    )


def _build_expression_intelligence_service(
    session: AsyncSession, settings: Settings
) -> ExpressionIntelligenceService:
    return ExpressionIntelligenceService(
        repository=ExpressionRecordRepository(session),
        settings=settings,
        ai_service=_build_ai_service(settings),
    )


def _memory_context(exercise: Exercise, evaluation: WritingEvaluation) -> dict:
    """Evidence identifiers and issue categories only — never raw learner text."""
    scores = evaluation.scores
    return {
        "exercise_id": exercise.id,
        "topic": exercise.topic,
        "register": exercise.register,
        "jlpt_level": exercise.jlpt_level,
        "difficulty": exercise.difficulty,
        "overall_score": scores.overall_score,
        "semantic_score": scores.semantic_score,
        "grammar_score": scores.grammar_score,
        "vocabulary_score": scores.vocabulary_score,
        "naturalness_score": scores.naturalness_score,
        "context_fit_score": scores.context_fit_score,
        "register_fit_score": scores.register_fit_score,
        "top_issues": [
            {"category": issue.category, "severity": issue.severity}
            for issue in evaluation.issues[:5]
        ],
        "summary": evaluation.summary,
    }


def _learning_mode_state(
    settings: Settings,
    attempt: ExerciseAttempt,
    hints_total: int,
) -> LearningModeState:
    enabled = settings.ai_exercise_learning_mode_enabled
    if not enabled:
        reveal_available = True
    else:
        reveal_available = attempt.revealed or attempt.hints_revealed_count >= hints_total
    return LearningModeState(
        enabled=enabled,
        hints_revealed_count=attempt.hints_revealed_count,
        hints_total=hints_total,
        reveal_available=reveal_available,
    )


def _evaluation_skills(evaluation: WritingEvaluation) -> dict[str, int]:
    """Per-skill scores from a standard evaluation (Phase 4/6 skill names)."""
    scores = evaluation.scores
    return {
        "grammar": scores.grammar_score,
        "vocabulary": scores.vocabulary_score,
        "naturalness": scores.naturalness_score,
        "semantic": scores.semantic_score,
        "context_fit": scores.context_fit_score,
        "register_fit": scores.register_fit_score,
    }


async def _record_curriculum_evidence(
    session: AsyncSession,
    settings: Settings,
    exercise: Exercise,
    attempt: ExerciseAttempt,
    evaluation: WritingEvaluation,
) -> None:
    """Feed the evaluation into the active journey objective (never raises)."""
    service = CurriculumService(session, settings)
    outcomes = await service.record_evidence(
        None,
        exercise_id=exercise.id,
        attempt_id=attempt.id,
        score=evaluation.scores.overall_score,
        skills=_evaluation_skills(evaluation),
        mode=exercise.exercise_type.value,
    )
    if not outcomes.get("objective_completed"):
        return
    gamification = _build_gamification_service(session, settings)
    objective_id = outcomes["objective_id"]
    await gamification.award_xp(
        None,
        "objective_complete",
        settings.xp_objective_complete,
        "objective",
        objective_id,
        f"objective:{objective_id}:complete",
        metadata={"journey_source": "exercise_attempt"},
    )
    if outcomes.get("milestone_completed"):
        milestone_id = outcomes["milestone_id"]
        await gamification.award_xp(
            None,
            "milestone_complete",
            settings.xp_milestone_complete,
            "milestone",
            milestone_id,
            f"milestone:{milestone_id}:complete",
            metadata={"journey_source": "exercise_attempt"},
        )
    if outcomes.get("journey_completed"):
        journey_id = service._curriculum.journeys.get_active(None)
        if journey_id is not None:
            await gamification.award_xp(
                None,
                "journey_complete",
                settings.xp_journey_complete,
                "journey",
                journey_id.id,
                f"journey:{journey_id.id}:complete",
                metadata={"journey_source": "exercise_attempt"},
            )


def _attempt_response(
    settings: Settings,
    attempt: ExerciseAttempt,
    evaluation: WritingEvaluation,
    *,
    include_corrections: bool,
    evaluation_metadata: dict | None,
) -> AttemptEvaluationResponse:
    return AttemptEvaluationResponse(
        id=attempt.id,
        exercise_id=attempt.exercise_id,
        attempt_number=attempt.attempt_number,
        answer_text=attempt.answer_text,
        scores=evaluation.scores,
        semantic_classification=evaluation.semantic_classification,
        naturalness_classification=evaluation.naturalness_classification,
        issues=evaluation.issues,
        summary=evaluation.summary,
        hints=evaluation.hints,
        learning_mode=_learning_mode_state(settings, attempt, len(evaluation.hints)),
        corrections=evaluation.corrections if include_corrections else None,
        evaluation_metadata=evaluation_metadata,
        status=attempt.status.value,
        created_at=attempt.created_at,
        updated_at=attempt.updated_at,
    )


@router.post("", response_model=AttemptEvaluationResponse, status_code=201)
async def submit_attempt(
    session: DbSession,
    exercise_id: str,
    payload: AttemptSubmitRequest,
) -> AttemptEvaluationResponse:
    exercise = await ExerciseRepository(session).get(exercise_id)
    if exercise is None:
        raise NotFoundError(f"Exercise '{exercise_id}' not found")

    settings = await AIConfigService().get_effective_settings(session)
    service = EvaluationService(
        ai_service=_build_ai_service(settings),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=settings,
    )
    attempt, feedback, _ = await service.submit(
        exercise, payload.answer_text, provider=payload.provider, model=payload.model
    )
    evaluation = WritingEvaluation.model_validate(feedback.evaluation)
    if settings.ai_vocabulary_auto_extract_enabled:
        try:
            await _build_vocabulary_service(session, settings).extract_for_attempt(attempt.id)
        except Exception:
            logger.exception(
                "vocabulary auto-extraction failed attempt_id=%s (evaluation itself is unaffected)",
                attempt.id,
            )
    if settings.ai_learning_auto_update_enabled:
        try:
            ex_type = (
                exercise.exercise_type.value
                if hasattr(exercise.exercise_type, "value")
                else str(exercise.exercise_type)
            )
            reg = (
                exercise.register.value
                if hasattr(exercise.register, "value")
                else str(exercise.register)
            )
            jlpt = (
                exercise.jlpt_level.value
                if hasattr(exercise.jlpt_level, "value")
                else str(exercise.jlpt_level)
            )
            await _build_adaptive_service(session, settings).update_after_attempt(
                None,
                exercise.id,
                evaluation.issues,
                context={
                    "exercise_type": ex_type,
                    "register": reg,
                    "topic": exercise.topic,
                    "jlpt_level": jlpt,
                },
            )
        except Exception:
            logger.exception(
                "adaptive learning update failed attempt_id=%s (evaluation itself is unaffected)",
                attempt.id,
            )
    if settings.ai_memory_enabled:
        try:
            await _build_memory_service(session, settings).ingest_event(
                None,
                "evaluation",
                attempt.id,
                _memory_context(exercise, evaluation),
            )
        except Exception:
            logger.exception(
                "memory ingest failed attempt_id=%s (evaluation itself is unaffected)",
                attempt.id,
            )
    if settings.ai_curriculum_enabled:
        try:
            await _record_curriculum_evidence(session, settings, exercise, attempt, evaluation)
        except Exception:
            logger.exception(
                "curriculum evidence update failed attempt_id=%s (evaluation itself is unaffected)",
                attempt.id,
            )
    if settings.gamification_enabled:
        try:
            await _build_gamification_service(session, settings).record_exercise_activity(
                None,
                exercise=exercise,
                attempt_id=attempt.id,
                scores=evaluation.scores.model_dump(),
                is_first_attempt=attempt.attempt_number == 1,
                previous_best=await ExerciseAttemptRepository(session).previous_best(
                    None, exercise.id, attempt.id
                ),
            )
        except Exception:
            logger.exception(
                "gamification update failed attempt_id=%s (evaluation itself is unaffected)",
                attempt.id,
            )
    try:
        issues_payload = [
            issue.model_dump(mode="json") if hasattr(issue, "model_dump") else dict(issue)
            for issue in evaluation.issues
        ]
        context = {
            "register": getattr(exercise.register, "value", exercise.register),
            "topic": exercise.topic,
            "jlpt_level": getattr(exercise.jlpt_level, "value", exercise.jlpt_level),
            "difficulty": exercise.difficulty,
        }
        await _build_writing_intelligence_service(session, settings).aggregate_from_evaluation(
            None,
            issues_payload,
            attempt.id,
            context=context,
            score=evaluation.scores.overall_score,
        )
    except Exception:
        logger.exception(
            "writing intelligence aggregation failed attempt_id=%s (evaluation itself is unaffected)",
            attempt.id,
        )
    try:
        reg_val = getattr(exercise.register, "value", str(exercise.register))
        await _build_expression_intelligence_service(session, settings).analyze_expressions(
            user_id=None,
            text=attempt.answer_text,
            context_vi=exercise.prompt_vi,
            target_register=reg_val,
            provider=payload.provider,
            model=payload.model,
        )
    except Exception:
        logger.exception(
            "expression intelligence analysis failed attempt_id=%s (evaluation itself is unaffected)",
            attempt.id,
        )
    return _attempt_response(
        settings,
        attempt,
        evaluation,
        include_corrections=not settings.ai_exercise_learning_mode_enabled,
        evaluation_metadata=feedback.evaluation_metadata,
    )


@router.get("", response_model=AttemptListResponse)
async def list_attempts(
    session: DbSession,
    exercise_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> AttemptListResponse:
    exercise = await ExerciseRepository(session).get(exercise_id)
    if exercise is None:
        raise NotFoundError(f"Exercise '{exercise_id}' not found")

    rows, total = await ExerciseAttemptRepository(session).list_with_feedback(
        exercise_id, skip=skip, limit=limit
    )
    items = [
        AttemptListItem(
            id=attempt.id,
            attempt_number=attempt.attempt_number,
            answer_text=attempt.answer_text,
            overall_score=feedback.overall_score if feedback else None,
            status=attempt.status.value,
            created_at=attempt.created_at,
        )
        for attempt, feedback in rows
    ]
    return AttemptListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{attempt_id}", response_model=AttemptEvaluationResponse)
async def get_attempt(
    session: DbSession,
    exercise_id: str,
    attempt_id: str,
) -> AttemptEvaluationResponse:
    settings = get_settings()
    attempt = await ExerciseAttemptRepository(session).get_for_exercise(exercise_id, attempt_id)
    if attempt is None:
        raise NotFoundError(f"Attempt '{attempt_id}' not found for this exercise")
    feedback = await WritingFeedbackRepository(session).get_by_attempt(attempt.id)
    if feedback is None:
        raise NotFoundError(f"Attempt '{attempt_id}' has no evaluation yet")

    evaluation = WritingEvaluation.model_validate(feedback.evaluation)
    include_corrections = attempt.revealed or not settings.ai_exercise_learning_mode_enabled
    return _attempt_response(
        settings,
        attempt,
        evaluation,
        include_corrections=include_corrections,
        evaluation_metadata=feedback.evaluation_metadata,
    )


@router.post("/{attempt_id}/hint", response_model=HintResponse)
async def next_hint(
    session: DbSession,
    exercise_id: str,
    attempt_id: str,
) -> HintResponse:
    settings = get_settings()
    attempt = await ExerciseAttemptRepository(session).get_for_exercise(exercise_id, attempt_id)
    if attempt is None:
        raise NotFoundError(f"Attempt '{attempt_id}' not found for this exercise")

    service = EvaluationService(
        ai_service=_build_ai_service(settings),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=settings,
    )
    hint, revealed, total = await service.next_hint(attempt)
    if hint is None:
        raise ConflictError("All hints have already been revealed")

    reveal_available = (
        attempt.revealed or not settings.ai_exercise_learning_mode_enabled or revealed >= total
    )
    return HintResponse(
        hint=hint,
        hints_revealed_count=revealed,
        hints_total=total,
        reveal_available=reveal_available,
    )


@router.post("/{attempt_id}/reveal", response_model=RevealResponse)
async def reveal_attempt(
    session: DbSession,
    exercise_id: str,
    attempt_id: str,
) -> RevealResponse:
    settings = get_settings()
    attempt = await ExerciseAttemptRepository(session).get_for_exercise(exercise_id, attempt_id)
    if attempt is None:
        raise NotFoundError(f"Attempt '{attempt_id}' not found for this exercise")

    service = EvaluationService(
        ai_service=_build_ai_service(settings),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=settings,
    )
    corrections = await service.reveal(attempt)
    return RevealResponse(
        attempt_id=attempt.id,
        attempt_number=attempt.attempt_number,
        corrections=corrections,
        revealed=True,
    )


@router.post("/{attempt_id}/vocabulary/extract", response_model=VocabularyExtractResponse)
async def extract_attempt_vocabulary(
    session: DbSession,
    exercise_id: str,
    attempt_id: str,
) -> VocabularyExtractResponse:
    """Explicitly run vocabulary extraction for an attempt (idempotent)."""
    settings = get_settings()
    attempt = await ExerciseAttemptRepository(session).get_for_exercise(exercise_id, attempt_id)
    if attempt is None:
        raise NotFoundError(f"Attempt '{attempt_id}' not found for this exercise")
    summary = await _build_vocabulary_service(session, settings).extract_for_attempt(attempt.id)
    if settings.ai_memory_enabled:
        try:
            await _build_memory_service(session, settings).ingest_event(
                None,
                "vocabulary",
                attempt.id,
                {
                    "exercise_id": exercise_id,
                    "extracted_count": summary.get("extracted_count", 0),
                    "new_count": summary.get("new_count", 0),
                    "updated_count": summary.get("updated_count", 0),
                },
            )
        except Exception:
            logger.exception(
                "memory ingest failed attempt_id=%s (vocabulary extraction is unaffected)",
                attempt.id,
            )
    return VocabularyExtractResponse(attempt_id=attempt.id, **summary)


@router.get("/{attempt_id}/vocabulary", response_model=AttemptVocabularyResponse)
async def get_attempt_vocabulary(
    session: DbSession,
    exercise_id: str,
    attempt_id: str,
) -> AttemptVocabularyResponse:
    """Vocabulary entries discovered from this attempt, newest first."""
    attempt = await ExerciseAttemptRepository(session).get_for_exercise(exercise_id, attempt_id)
    if attempt is None:
        raise NotFoundError(f"Attempt '{attempt_id}' not found for this exercise")
    rows = await VocabularyDiscoveryRepository(session).list_by_attempt(attempt.id)
    items = [
        AttemptVocabularyItem(
            id=entry.id,
            expression=entry.expression,
            reading=entry.reading,
            type=entry.type.value,
            meaning_vi=entry.meaning_vi,
            estimated_jlpt_level=entry.estimated_jlpt_level,
            difficulty=entry.difficulty,
            importance=entry.importance,
            confidence=entry.confidence.value,
            source_type=discovery.source_type.value,
            user_expression=discovery.user_expression,
            learning_reason=discovery.learning_reason,
            example_sentence=discovery.example_sentence or entry.example_sentence,
            created_at=discovery.created_at,
        )
        for discovery, entry in rows
    ]
    return AttemptVocabularyResponse(items=items, total=len(items))
