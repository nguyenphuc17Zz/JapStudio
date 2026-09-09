"""Challenge endpoints (Phase 7).

- POST /api/v1/challenges/generate          -> create one challenge (AI + selection)
- GET  /api/v1/challenges/{id}              -> challenge detail
- POST /api/v1/challenges/{id}/attempts     -> submit answer (Phase 4 evaluation + criteria)
- GET  /api/v1/challenges/{id}/attempts     -> attempt history

Challenge attempts reuse the Phase 4 evaluation pipeline on the linked
exercise; success and XP are deterministic. Successful attempts also feed
vocabulary auto-extraction (same isolated hook as exercise attempts).
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.gamification import build_gamification_service, build_profile_service
from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.repositories import (
    ChallengeAttemptRepository,
    ChallengeRepository,
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
)
from app.schemas.gamification import (
    ChallengeAttemptListResponse,
    ChallengeAttemptRequest,
    ChallengeAttemptResponse,
    ChallengeGenerateRequest,
    ChallengeResponse,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.challenge_service import ChallengeService
from app.services.vocabulary_service import VocabularyService

logger = logging.getLogger("app.challenges")

router = APIRouter(tags=["challenges"])

DbSession = Annotated[AsyncSession, Depends(get_session)]

ANONYMOUS_USER_ID: str | None = None


def build_challenge_service(session: AsyncSession, settings: Settings) -> ChallengeService:
    ai_service = AIService(settings=settings)
    profile_service = build_profile_service(session, settings)
    return ChallengeService(
        challenge_repository=ChallengeRepository(session),
        challenge_attempt_repository=ChallengeAttemptRepository(session),
        exercise_repository=ExerciseRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        vocabulary_repository=UserVocabularyRepository(session),
        profile_service=profile_service,
        gamification=build_gamification_service(session, settings),
        ai_service=ai_service,
        settings=settings,
    )


def _build_vocabulary_service(session: AsyncSession, settings: Settings) -> VocabularyService:
    return VocabularyService(
        ai_service=AIService(settings=settings),
        entry_repository=VocabularyEntryRepository(session),
        user_repository=UserVocabularyRepository(session),
        discovery_repository=VocabularyDiscoveryRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        feedback_repository=WritingFeedbackRepository(session),
        exercise_repository=ExerciseRepository(session),
        settings=settings,
    )


def _challenge_response(challenge: object) -> ChallengeResponse:
    return ChallengeResponse(
        id=challenge.id,
        challenge_type=challenge.challenge_type,
        instruction_vi=challenge.instruction_vi,
        source_text=challenge.source_text,
        target_skill=challenge.target_skill,
        difficulty=challenge.difficulty,
        objective=challenge.objective,
        required_expression=challenge.required_expression,
        exercise_id=challenge.exercise_id,
        status=challenge.status,
        success_criteria={"threshold": get_settings().ai_challenge_success_threshold},
        xp_reward=get_settings().xp_challenge_complete,
        completed=challenge.completed_at is not None,
        completed_at=challenge.completed_at,
        created_at=challenge.created_at,
    )


@router.post("/generate", response_model=ChallengeResponse, status_code=201)
async def generate_challenge(
    session: DbSession,
    payload: ChallengeGenerateRequest | None = None,
) -> ChallengeResponse:
    settings = await AIConfigService().get_effective_settings(session)
    objective_id = None
    if settings.ai_curriculum_enabled:
        try:
            from app.services.curriculum_service import CurriculumService

            context = await CurriculumService(session, settings).get_objective_context(
                ANONYMOUS_USER_ID
            )
            if context is not None:
                objective_id = context["objective_id"]
        except Exception:
            logger.exception("curriculum context failed (challenge is unaffected)")
    challenge = await build_challenge_service(session, settings).generate(
        ANONYMOUS_USER_ID,
        objective_id=objective_id,
        provider=payload.provider if payload else None,
        model=payload.model if payload else None,
    )
    return _challenge_response(challenge)


@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(session: DbSession, challenge_id: str) -> ChallengeResponse:
    settings = await AIConfigService().get_effective_settings(session)
    challenge = await build_challenge_service(session, settings).get(
        ANONYMOUS_USER_ID, challenge_id
    )
    if challenge is None:
        raise NotFoundError(f"Challenge '{challenge_id}' not found")
    return _challenge_response(challenge)


@router.post("/{challenge_id}/attempts", response_model=ChallengeAttemptResponse, status_code=201)
async def submit_challenge_attempt(
    session: DbSession,
    challenge_id: str,
    payload: ChallengeAttemptRequest,
) -> ChallengeAttemptResponse:
    settings = await AIConfigService().get_effective_settings(session)
    service = build_challenge_service(session, settings)
    challenge = await service.get(ANONYMOUS_USER_ID, challenge_id)
    if challenge is None:
        raise NotFoundError(f"Challenge '{challenge_id}' not found")
    result = await service.submit_attempt(
        ANONYMOUS_USER_ID,
        challenge,
        payload.answer_text,
        provider=payload.provider,
        model=payload.model,
    )
    if result["success"] and settings.ai_vocabulary_auto_extract_enabled:
        try:
            await _build_vocabulary_service(session, settings).extract_for_attempt(
                result["attempt"].id
            )
        except Exception:
            logger.exception(
                "challenge vocabulary extraction failed attempt_id=%s", result["attempt"].id
            )
    saved = await service.attempt_history(challenge)
    row = saved[-1][0] if saved else None
    attempt = result["attempt"]
    return ChallengeAttemptResponse(
        id=row.id if row else "",
        challenge_id=challenge.id,
        attempt_id=attempt.id,
        success=result["success"],
        score=result["score"],
        answer_text=attempt.answer_text,
        evaluation=result["evaluation"],
        xp_awarded=result["xp_awarded"],
        created_at=row.created_at if row else attempt.created_at,
    )


@router.get("/{challenge_id}/attempts", response_model=ChallengeAttemptListResponse)
async def list_challenge_attempts(
    session: DbSession, challenge_id: str
) -> ChallengeAttemptListResponse:
    settings = await AIConfigService().get_effective_settings(session)
    service = build_challenge_service(session, settings)
    challenge = await service.get(ANONYMOUS_USER_ID, challenge_id)
    if challenge is None:
        raise NotFoundError(f"Challenge '{challenge_id}' not found")
    items = []
    for row, attempt, feedback in await service.attempt_history(challenge):
        items.append(
            ChallengeAttemptResponse(
                id=row.id,
                challenge_id=challenge.id,
                attempt_id=row.attempt_id,
                success=row.success,
                score=row.score,
                answer_text=attempt.answer_text if attempt else "",
                evaluation=feedback.evaluation if feedback else {},
                xp_awarded=row.xp_awarded,
                created_at=row.created_at,
            )
        )
    return ChallengeAttemptListResponse(items=items, total=len(items))
