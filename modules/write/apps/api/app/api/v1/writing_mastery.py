"""Writing Mastery & Boss Assessment API Endpoints (Phase 23).

Provides endpoints for:
- 8-dimension Writing Mastery profile & 5-criterion proof checks.
- Unassisted Boss Writing task generation & submission evaluation.
- Longitudinal Writing Evolution timeline & debriefs.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.db.session import get_session
from app.repositories import (
    DiscourseEvaluationRepository,
    ExerciseAttemptRepository,
    LearnerProfileRepository,
)
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.repositories.writing_mastery import (
    BossWritingSubmissionRepository,
    BossWritingTaskRepository,
)
from app.schemas.writing_mastery import (
    BossEvaluationResultOut,
    BossHistoryItemOut,
    BossTaskGenerateRequest,
    BossTaskResponse,
    BossTaskSubmitRequest,
    WritingEvolutionTimelineOut,
    WritingMasteryProfileOut,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.writing_mastery_service import WritingMasteryService

router = APIRouter(tags=["writing-mastery"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_mastery_service(session: AsyncSession, settings: Settings) -> WritingMasteryService:
    ai_service = AIService(settings=settings)
    return WritingMasteryService(
        weakness_repository=WritingWeaknessRepository(session),
        task_repository=BossWritingTaskRepository(session),
        submission_repository=BossWritingSubmissionRepository(session),
        discourse_repository=DiscourseEvaluationRepository(session),
        attempt_repository=ExerciseAttemptRepository(session),
        profile_repository=LearnerProfileRepository(session),
        ai_service=ai_service,
        settings=settings,
    )


@router.get("/profile", response_model=WritingMasteryProfileOut)
async def get_writing_mastery_profile(
    session: DbSession,
) -> WritingMasteryProfileOut:
    """Get the 8-dimension Writing Mastery profile with 5-criterion proof breakdown."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_mastery_service(session, settings)
    return await service.get_mastery_profile(None)


@router.get("/evolution", response_model=WritingEvolutionTimelineOut)
async def get_writing_evolution_timeline(
    session: DbSession,
    provider: str | None = Query(default=None),
    model: str | None = Query(default=None),
) -> WritingEvolutionTimelineOut:
    """Get longitudinal writing evolution timeline, eliminated weaknesses, and AI debrief."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_mastery_service(session, settings)
    return await service.get_evolution_timeline(None, provider=provider, model=model)


@router.post("/boss/generate", response_model=BossTaskResponse)
async def generate_boss_task(
    payload: BossTaskGenerateRequest,
    session: DbSession,
) -> BossTaskResponse:
    """Generate an unseen, unassisted Boss Writing task targeting learner's weak points."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_mastery_service(session, settings)
    return await service.generate_boss_task(
        user_id=None,
        task_type=payload.task_type,
        jlpt_level=payload.jlpt_level,
        target_register=payload.target_register,
        provider=payload.provider,
        model=payload.model,
    )


@router.get("/boss/pending", response_model=BossTaskResponse | None)
async def get_pending_boss_task(
    session: DbSession,
) -> BossTaskResponse | None:
    """Get the current active or pending Boss Writing task, if any."""
    task_repo = BossWritingTaskRepository(session)
    task = await task_repo.get_pending_task(None)
    if not task:
        return None
    return BossTaskResponse.model_validate(task)


@router.post("/boss/{task_id}/submit", response_model=BossEvaluationResultOut)
async def submit_boss_writing_task(
    task_id: str,
    payload: BossTaskSubmitRequest,
    session: DbSession,
) -> BossEvaluationResultOut:
    """Submit unassisted boss writing for rigorous 8-dimension evaluation & 3-tier rewrites."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_mastery_service(session, settings)
    try:
        return await service.evaluate_boss_submission(
            task_id=task_id,
            user_id=None,
            learner_text=payload.text,
            duration_seconds=payload.duration_seconds,
            provider=payload.provider,
            model=payload.model,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get("/boss/history", response_model=list[BossHistoryItemOut])
async def list_boss_assessment_history(
    session: DbSession,
    limit: int = Query(default=30, ge=1, le=100),
) -> list[BossHistoryItemOut]:
    """List historical Boss Assessment attempts."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_mastery_service(session, settings)
    return await service.list_boss_history(None, limit=limit)
