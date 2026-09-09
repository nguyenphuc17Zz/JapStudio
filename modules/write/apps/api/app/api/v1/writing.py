"""Long-form writing endpoints (Phase 8): submissions, revisions,
evaluation reads, comparison, hints/reveal and the AI writing coach.

- POST /api/v1/writing/submissions                    -> first draft evaluation
- GET  /api/v1/writing/submissions/{id}               -> submission + revisions
- GET  /api/v1/writing/submissions/{id}/evaluation    -> persisted (no AI re-run)
- POST /api/v1/writing/submissions/{id}/revisions     -> next immutable draft
- GET  /api/v1/writing/submissions/{id}/compare       -> revision comparison
- POST /api/v1/writing/submissions/{id}/hint          -> next progressive hint
- POST /api/v1/writing/submissions/{id}/reveal        -> explicit rewrite reveal
- POST /api/v1/writing/submissions/{id}/coach         -> bounded AI coaching

Each revision creates one ExerciseAttempt, so the Phase 5/6/7 hooks
(vocabulary / adaptive / gamification) run exactly like normal attempts.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError, NotFoundError
from app.db.session import get_session
from app.models import Exercise, WritingSubmission
from app.repositories import (
    DailyGoalRepository,
    DailyMissionRepository,
    DiscourseEvaluationRepository,
    DiscourseIssueRepository,
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
    WritingRevisionRepository,
    WritingScenarioRepository,
    WritingSubmissionRepository,
    WritingWeaknessRepository,
    XPEventRepository,
)
from app.schemas.writing import (
    RevisionCompareResponse,
    WritingCoachRequest,
    WritingCoachResponse,
    WritingEvaluationResponse,
    WritingHintResponse,
    WritingRevealResponse,
    WritingRevisionCreate,
    WritingRevisionResponse,
    WritingSubmissionCreate,
    WritingSubmissionResponse,
)
from app.schemas.writing_scaffold import (
    WritingScaffoldRequest,
    WritingScaffoldResponse,
)
from app.prompts.writing_scaffold import build_writing_scaffold_prompt
from app.services.adaptive_learning_service import AdaptiveLearningService
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.discourse_segmentation import split_sentences
from app.services.discourse_service import DiscourseService
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

logger = logging.getLogger("app.writing")

router = APIRouter(tags=["writing"])

DbSession = Annotated[AsyncSession, Depends(get_session)]

LONG_FORM_TARGET_LENGTHS = {"multi_sentence", "paragraph", "long_writing"}


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


def _build_discourse_service(session: AsyncSession, settings: Settings) -> DiscourseService:
    return DiscourseService(
        evaluation_service=EvaluationService(
            ai_service=_build_ai_service(settings),
            attempt_repository=ExerciseAttemptRepository(session),
            feedback_repository=WritingFeedbackRepository(session),
            settings=settings,
        ),
        ai_service=_build_ai_service(settings),
        submission_repository=WritingSubmissionRepository(session),
        revision_repository=WritingRevisionRepository(session),
        evaluation_repository=DiscourseEvaluationRepository(session),
        issue_repository=DiscourseIssueRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        settings=settings,
        scenario_repository=WritingScenarioRepository(session),
    )


def _build_profile_service(session: AsyncSession, settings: Settings) -> LearnerProfileService:
    return LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(
            ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
        ),
        ai_service=_build_ai_service(settings),
        settings=settings,
    )


def _build_writing_intelligence_service(
    session: AsyncSession, settings: Settings
) -> WritingIntelligenceService:
    return WritingIntelligenceService(
        weakness_repository=WritingWeaknessRepository(session),
        settings=settings,
    )


def _validate_long_form_text(text: str, max_sentences: int, *, scenario: bool = False) -> str:
    cleaned = text.strip()
    min_length = 5 if scenario else 10
    if len(cleaned) < min_length:
        message = (
            "Bài viết quá ngắn để đánh giá (cần ít nhất 5 ký tự)."
            if scenario
            else "Bài viết quá ngắn để đánh giá đoạn văn (cần ít nhất 2 câu)."
        )
        raise AppError(
            message,
            status_code=422,
            code="validation_error",
        )
    if not scenario and len(split_sentences(cleaned, max_sentences)) < 2:
        raise AppError(
            "Bài viết cần có ít nhất 2 câu để đánh giá mạch lạc. Với bài 1 câu, hãy dùng "
            "luồng luyện tập thông thường.",
            status_code=422,
            code="validation_error",
        )
    return cleaned


async def _get_submission(session: AsyncSession, submission_id: str) -> WritingSubmission:
    submission = await WritingSubmissionRepository(session).get_for_user(None, submission_id)
    if submission is None:
        raise NotFoundError(f"Writing submission '{submission_id}' not found")
    return submission


async def _get_exercise(session: AsyncSession, exercise_id: str) -> Exercise:
    exercise = await ExerciseRepository(session).get(exercise_id)
    if exercise is None:
        raise NotFoundError(f"Exercise '{exercise_id}' not found")
    return exercise


async def _run_hooks(
    session: AsyncSession,
    settings: Settings,
    exercise: Exercise,
    attempt_id: str,
    scores: dict,
    is_first_attempt: bool,
    issues: list[dict],
) -> None:
    if settings.ai_vocabulary_auto_extract_enabled:
        try:
            await _build_vocabulary_service(session, settings).extract_for_attempt(attempt_id)
        except Exception:
            logger.exception(
                "vocabulary auto-extraction failed attempt_id=%s (evaluation itself is unaffected)",
                attempt_id,
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
                issues,
                context={
                    "exercise_type": ex_type,
                    "writing_context_type": "free_writing",
                    "register": reg,
                    "topic": exercise.topic,
                    "jlpt_level": jlpt,
                },
            )
        except Exception:
            logger.exception(
                "adaptive learning update failed attempt_id=%s (evaluation itself is unaffected)",
                attempt_id,
            )
    if settings.ai_memory_enabled:
        try:
            await _build_memory_service(session, settings).ingest_event(
                None,
                "scenario" if exercise.scenario_id is not None else "evaluation",
                attempt_id,
                {
                    "exercise_id": exercise.id,
                    "topic": exercise.topic,
                    "register": getattr(exercise.register, "value", exercise.register),
                    "jlpt_level": getattr(exercise.jlpt_level, "value", exercise.jlpt_level),
                    "difficulty": exercise.difficulty,
                    "scenario_id": exercise.scenario_id,
                    "scores": scores,
                    "top_issues": issues[:5],
                },
            )
        except Exception:
            logger.exception(
                "memory ingest failed attempt_id=%s (evaluation itself is unaffected)",
                attempt_id,
            )
    if settings.gamification_enabled:
        try:
            await _build_gamification_service(session, settings).record_exercise_activity(
                None,
                exercise=exercise,
                attempt_id=attempt_id,
                scores=scores,
                is_first_attempt=is_first_attempt,
                previous_best=await ExerciseAttemptRepository(session).previous_best(
                    None, exercise.id, attempt_id
                ),
            )
        except Exception:
            logger.exception(
                "gamification update failed attempt_id=%s (evaluation itself is unaffected)",
                attempt_id,
            )
    try:
        context = {
            "register": getattr(exercise.register, "value", exercise.register),
            "topic": exercise.topic,
            "jlpt_level": getattr(exercise.jlpt_level, "value", exercise.jlpt_level),
            "difficulty": exercise.difficulty,
            "scenario_genre": (exercise.generation_metadata or {}).get("scenario_genre") if exercise else None,
        }
        await _build_writing_intelligence_service(session, settings).aggregate_from_discourse(
            None,
            issues,
            attempt_id,
            context=context,
            score=scores.get("overall_writing"),
        )
    except Exception:
        logger.exception(
            "writing intelligence discourse aggregation failed attempt_id=%s (evaluation itself is unaffected)",
            attempt_id,
        )


async def _submission_response(
    session: AsyncSession, submission: WritingSubmission
) -> WritingSubmissionResponse:
    exercise = await _get_exercise(session, submission.exercise_id)
    revisions = await WritingRevisionRepository(session).list_by_submission(submission.id)
    items = []
    for revision in revisions:
        evaluation = await DiscourseEvaluationRepository(session).get_by_revision(revision.id)
        items.append(
            {
                "id": revision.id,
                "revision_number": revision.revision_number,
                "sentence_count": revision.sentence_count,
                "overall_writing": evaluation.overall_writing if evaluation else None,
                "status": revision.status,
                "created_at": revision.created_at,
            }
        )
    return WritingSubmissionResponse(
        id=submission.id,
        exercise_id=exercise.id,
        exercise_type=exercise.exercise_type.value,
        target_length=exercise.target_length.value,
        register=exercise.register.value,
        topic=exercise.topic,
        prompt_vi=exercise.prompt_vi,
        mode=submission.mode,
        status=submission.status,
        revision_count=len(items),
        revisions=items,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
    )


@router.post("/submissions", response_model=WritingEvaluationResponse, status_code=201)
async def create_submission(
    session: DbSession,
    payload: WritingSubmissionCreate,
) -> WritingEvaluationResponse:
    settings = await AIConfigService().get_effective_settings(session)
    if not settings.ai_long_form_enabled:
        raise AppError(
            "Tính năng viết đoạn văn dài hiện đang tắt trong cấu hình máy chủ.",
            status_code=400,
            code="feature_disabled",
        )
    exercise = await _get_exercise(session, payload.exercise_id)
    if exercise.target_length.value not in LONG_FORM_TARGET_LENGTHS:
        raise AppError(
            "Bài tập này không hỗ trợ viết đoạn văn dài (target_length = "
            f"'{exercise.target_length.value}').",
            status_code=400,
            code="unsupported_exercise",
        )
    text = _validate_long_form_text(
        payload.text,
        settings.ai_long_form_max_sentences,
        scenario=exercise.scenario_id is not None,
    )

    result = await _build_discourse_service(session, settings).submit(
        exercise, text, provider=payload.provider, model=payload.model
    )
    await _run_hooks(
        session,
        settings,
        exercise,
        result.attempt_id,
        result.scores,
        result.is_first_attempt,
        result.issues,
    )
    return result.response


@router.get("/submissions/{submission_id}", response_model=WritingSubmissionResponse)
async def get_submission(
    session: DbSession,
    submission_id: str,
) -> WritingSubmissionResponse:
    submission = await _get_submission(session, submission_id)
    return await _submission_response(session, submission)


@router.get("/submissions/{submission_id}/evaluation", response_model=WritingEvaluationResponse)
async def get_submission_evaluation(
    session: DbSession,
    submission_id: str,
) -> WritingEvaluationResponse:
    """Persisted evaluation of the latest revision; never re-triggers the AI."""
    settings = await AIConfigService().get_effective_settings(session)
    submission = await _get_submission(session, submission_id)
    exercise = await _get_exercise(session, submission.exercise_id)
    revisions = await WritingRevisionRepository(session).list_by_submission(submission.id)
    if not revisions:
        raise NotFoundError("Submission has no revisions yet")
    return await _build_discourse_service(session, settings).evaluation_response(
        submission, exercise, revisions[-1]
    )


@router.post(
    "/submissions/{submission_id}/revisions",
    response_model=WritingRevisionResponse,
    status_code=201,
)
async def create_revision(
    session: DbSession,
    submission_id: str,
    payload: WritingRevisionCreate,
) -> WritingRevisionResponse:
    settings = await AIConfigService().get_effective_settings(session)
    submission = await _get_submission(session, submission_id)
    exercise = await _get_exercise(session, submission.exercise_id)
    text = _validate_long_form_text(
        payload.text,
        settings.ai_long_form_max_sentences,
        scenario=exercise.scenario_id is not None,
    )

    service = _build_discourse_service(session, settings)
    result = await service.add_revision(
        submission, exercise, text, provider=payload.provider, model=payload.model
    )
    await _run_hooks(
        session,
        settings,
        exercise,
        result.attempt_id,
        result.scores,
        result.is_first_attempt,
        result.issues,
    )

    revisions = await WritingRevisionRepository(session).list_by_submission(submission.id)
    previous = None
    if len(revisions) >= 2:
        previous = await DiscourseEvaluationRepository(session).get_by_revision(revisions[-2].id)
    deltas: dict[str, int] = {}
    if previous is not None:
        deltas = {
            "overall_writing": result.response.scores.overall_writing - previous.overall_writing,
            "sentence_quality": result.response.scores.sentence_quality - previous.sentence_quality,
            "discourse_quality": result.response.scores.discourse_quality
            - previous.discourse_quality,
        }
    return WritingRevisionResponse(
        submission_id=submission.id,
        revision_number=result.response.revision_number,
        text=text,
        scores=result.response.scores,
        deltas=deltas,
        created_at=result.response.created_at,
    )


@router.get("/submissions/{submission_id}/compare", response_model=RevisionCompareResponse)
async def compare_revisions(
    session: DbSession,
    submission_id: str,
    from_revision: int = Query(ge=1),
    to_revision: int = Query(ge=2),
) -> RevisionCompareResponse:
    settings = await AIConfigService().get_effective_settings(session)
    submission = await _get_submission(session, submission_id)
    result = await _build_discourse_service(session, settings).compare(
        submission, from_revision, to_revision
    )
    return RevisionCompareResponse(
        submission_id=result["submission_id"],
        from_revision=result["from_revision"],
        to_revision=result["to_revision"],
        deltas=result["deltas"],
        sentence_diff=result["sentence_diff"],
        guidance=result["guidance"],
        guidance_version=result["guidance_version"],
    )


@router.post("/submissions/{submission_id}/hint", response_model=WritingHintResponse)
async def next_discourse_hint(
    session: DbSession,
    submission_id: str,
) -> WritingHintResponse:
    settings = await AIConfigService().get_effective_settings(session)
    submission = await _get_submission(session, submission_id)
    exercise = await _get_exercise(session, submission.exercise_id)
    revisions = await WritingRevisionRepository(session).list_by_submission(submission.id)
    if not revisions:
        raise NotFoundError("Submission has no revisions yet")
    hint, revealed, total = await _build_discourse_service(session, settings).next_hint(
        submission, exercise, revisions[-1]
    )
    return WritingHintResponse(
        hint=hint,
        hints_revealed_count=revealed,
        hints_total=total,
        reveal_available=revealed >= total,
    )


@router.post("/submissions/{submission_id}/reveal", response_model=WritingRevealResponse)
async def reveal_writing(
    session: DbSession,
    submission_id: str,
) -> WritingRevealResponse:
    settings = await AIConfigService().get_effective_settings(session)
    submission = await _get_submission(session, submission_id)
    exercise = await _get_exercise(session, submission.exercise_id)
    revisions = await WritingRevisionRepository(session).list_by_submission(submission.id)
    if not revisions:
        raise NotFoundError("Submission has no revisions yet")
    result = await _build_discourse_service(session, settings).reveal(
        submission, exercise, revisions[-1]
    )
    return WritingRevealResponse(
        submission_id=result["submission_id"],
        revision_number=result["revision_number"],
        rewrites=result["rewrites"],
        revealed=result["revealed"],
    )


@router.post("/submissions/{submission_id}/coach", response_model=WritingCoachResponse)
async def ask_writing_coach(
    session: DbSession,
    submission_id: str,
    payload: WritingCoachRequest,
) -> WritingCoachResponse:
    settings = await AIConfigService().get_effective_settings(session)
    submission = await _get_submission(session, submission_id)
    exercise = await _get_exercise(session, submission.exercise_id)

    profile = await _build_profile_service(session, settings).profile_summary(None)
    skills = profile.get("skills") or {}
    profile_block = ", ".join(
        f"{skill}: {value.get('score', 0)}" for skill, value in skills.items()
    )
    vocabulary = await UserVocabularyRepository(session).list_recent_for_user(None, limit=8)
    vocabulary_block = "; ".join(f"{v.expression} ({v.reading})" for v in vocabulary)
    memory_block = (
        await _build_memory_service(session, settings).context_builder().memory_block(None, "coach")
    )

    result = await _build_discourse_service(session, settings).coach(
        exercise,
        submission,
        payload.question,
        profile_block=profile_block[:2000],
        vocabulary_block=vocabulary_block[:1000],
        memory_block=memory_block,
        provider=payload.provider,
        model=payload.model,
    )
    return WritingCoachResponse(answer=result["answer"], suggestions=result["suggestions"])


@router.post("/scaffold", response_model=WritingScaffoldResponse)
async def get_writing_scaffold(
    session: DbSession,
    payload: WritingScaffoldRequest,
) -> WritingScaffoldResponse:
    """Generate dynamic pedagogical scaffolding (outline, angles, golden phrases) for a writing task."""
    settings = await AIConfigService().get_effective_settings(session)
    system_prompt, user_prompt = build_writing_scaffold_prompt(
        prompt_vi=payload.prompt_vi,
        context_vi=payload.context_vi,
        jlpt_level=payload.jlpt_level,
        register=payload.register,
        genre=payload.genre,
        keywords=payload.keywords,
    )
    ai_service = AIService(settings=settings)
    parsed, _ = await ai_service.generate_structured(
        user_prompt,
        WritingScaffoldResponse,
        system=system_prompt,
        provider=payload.provider,
        model=payload.model,
    )
    return parsed

