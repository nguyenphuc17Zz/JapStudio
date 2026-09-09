"""Exercise generation and retrieval endpoints.

- POST /api/v1/exercises/generate -> AI-generated exercise (all preferences optional)
- GET  /api/v1/exercises          -> filtered listing
- GET  /api/v1/exercises/{id}     -> single exercise

When a curriculum journey is active, generated exercises are linked to the
current objective (``objective_id``) so their attempts feed objective evidence.

Responses never contain credentials or raw provider data.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.meta import require_admin

from app.api.v1.attempts import router as attempts_router
from app.core.config import Settings
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.models import ExerciseType, JlptLevel, Register
from app.repositories import ExerciseRepository, LearnerMemoryRepository, LearnerProfileRepository
from app.schemas.exercise import (
    ExerciseGenerationRequest,
    ExerciseListResponse,
    ExerciseSchema,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.exercise_generation_service import ExerciseGenerationService
from app.services.memory_service import MemoryService

logger = logging.getLogger("app.exercises")

router = APIRouter(tags=["exercises"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_ai_service(settings: Settings) -> AIService:
    return AIService(settings=settings)


@router.post("/generate", response_model=ExerciseSchema, status_code=201)
async def generate_exercise(
    session: DbSession,
    payload: ExerciseGenerationRequest | None = None,
) -> ExerciseSchema:
    settings = await AIConfigService().get_effective_settings(session)
    service = ExerciseGenerationService(
        ai_service=_build_ai_service(settings),
        repository=ExerciseRepository(session),
        settings=settings,
    )
    memory_service = MemoryService(
        repository=LearnerMemoryRepository(session),
        profile_repository=LearnerProfileRepository(session),
        ai_service=_build_ai_service(settings),
        settings=settings,
    )
    memory_block = await memory_service.context_builder().memory_block(None, "exercise_generation")
    exercise = await service.generate(payload, memory_block=memory_block)
    if settings.ai_curriculum_enabled:
        try:
            from app.services.curriculum_service import CurriculumService

            context = await CurriculumService(session, settings).get_objective_context(None)
            if context is not None:
                exercise.objective_id = context["objective_id"]
                await ExerciseRepository(session).update(exercise)
        except Exception:
            logger.exception("curriculum linkage failed (exercise is unaffected)")
    return ExerciseSchema.model_validate(exercise)


@router.get("", response_model=ExerciseListResponse)
async def list_exercises(
    session: DbSession,
    exercise_type: ExerciseType | None = None,
    topic: str | None = Query(default=None, max_length=100),
    register: Register | None = None,
    jlpt_level: JlptLevel | None = None,
    difficulty: int | None = Query(default=None, ge=1, le=10),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> ExerciseListResponse:
    repository = ExerciseRepository(session)
    items, total = await repository.list_with_filters(
        exercise_type=exercise_type,
        topic=topic,
        register=register,
        jlpt_level=jlpt_level,
        difficulty=difficulty,
        skip=skip,
        limit=limit,
    )
    return ExerciseListResponse(
        items=[ExerciseSchema.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{exercise_id}", response_model=ExerciseSchema)
async def get_exercise(
    session: DbSession,
    exercise_id: str,
) -> ExerciseSchema:
    exercise = await ExerciseRepository(session).get(exercise_id)
    if exercise is None:
        raise NotFoundError(f"Exercise '{exercise_id}' not found")
    from app.repositories.analytics import AnalyticsEventRepository
    from app.services.analytics.events import AnalyticsEventService

    await AnalyticsEventService(AnalyticsEventRepository(session)).record_exercise_opened(
        exercise.id
    )
    return ExerciseSchema.model_validate(exercise)


@router.delete("/{exercise_id}", status_code=204)
async def delete_exercise(
    session: DbSession,
    exercise_id: str,
    request: Request,
    _: None = Depends(require_admin),
) -> None:
    repository = ExerciseRepository(session)
    if not await repository.delete_by_id(exercise_id):
        raise NotFoundError(f"Exercise '{exercise_id}' not found")


@router.delete("", status_code=200)
async def delete_all_exercises(
    session: DbSession,
    request: Request,
    confirm: str = Query(default="", description="Must be 'yes' to confirm bulk delete"),
    _: None = Depends(require_admin),
) -> dict[str, int]:
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.is_test and confirm != "yes":
        from fastapi import HTTPException

        raise HTTPException(status_code=422, detail="confirm=yes required")
    repository = ExerciseRepository(session)
    deleted_count = await repository.delete_all()
    return {"deleted": deleted_count}


router.include_router(attempts_router, prefix="/{exercise_id}/attempts")
