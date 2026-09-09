"""Learner memory endpoints (Phase 12)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.repositories import (
    ExerciseAttemptRepository,
    LearnerMemoryRepository,
    LearnerProfileRepository,
    SimulationSessionRepository,
)
from app.schemas.memory import (
    LearnerMemoryCreate,
    LearnerMemoryResponse,
    MemoryListResponse,
    MemoryRefreshResponse,
)
from app.services.ai_service import AIService
from app.services.memory_service import MemoryService

router = APIRouter(tags=["learning"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_memory_service(session: AsyncSession, settings: Settings) -> MemoryService:
    return MemoryService(
        repository=LearnerMemoryRepository(session),
        profile_repository=LearnerProfileRepository(session),
        ai_service=AIService(settings=settings),
        settings=settings,
        attempt_repository=ExerciseAttemptRepository(session),
        simulation_repository=SimulationSessionRepository(session),
    )


@router.get("/memory", response_model=MemoryListResponse)
async def list_memories(
    session: DbSession,
    category: str | None = Query(default=None, max_length=32),
    type: str | None = Query(default=None, max_length=16),
    source: str | None = Query(default=None, max_length=32),
    status: str | None = Query(default=None, max_length=16),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> MemoryListResponse:
    service = _build_memory_service(session, get_settings())
    items, total = await service.list_for_user(
        None,
        category=category,
        memory_type=type,
        source=source,
        status=status,
        skip=skip,
        limit=limit,
    )
    return MemoryListResponse(
        items=[LearnerMemoryResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/memory", response_model=LearnerMemoryResponse, status_code=201)
async def create_memory(
    payload: LearnerMemoryCreate,
    session: DbSession,
) -> LearnerMemoryResponse:
    service = _build_memory_service(session, get_settings())
    memory = await service.create_explicit(
        None,
        category=payload.category,
        memory_type=payload.type,
        content=payload.content,
        importance=payload.importance,
    )
    return LearnerMemoryResponse.model_validate(memory)


@router.get("/memory/{memory_id}", response_model=LearnerMemoryResponse)
async def get_memory(
    memory_id: str,
    session: DbSession,
) -> LearnerMemoryResponse:
    service = _build_memory_service(session, get_settings())
    memory = await service.get_for_user(None, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="memory not found")
    return LearnerMemoryResponse.model_validate(memory)


@router.delete("/memory/{memory_id}", status_code=204)
async def forget_memory(
    memory_id: str,
    session: DbSession,
) -> None:
    service = _build_memory_service(session, get_settings())
    if not await service.forget(None, memory_id):
        raise HTTPException(status_code=404, detail="memory not found")


@router.post("/memory/{memory_id}/archive", response_model=LearnerMemoryResponse)
async def archive_memory(
    memory_id: str,
    session: DbSession,
) -> LearnerMemoryResponse:
    service = _build_memory_service(session, get_settings())
    if not await service.archive(None, memory_id):
        raise HTTPException(status_code=404, detail="memory not found")
    memory = await service.get_for_user(None, memory_id)
    return LearnerMemoryResponse.model_validate(memory)


@router.post("/memory/refresh", response_model=MemoryRefreshResponse)
async def refresh_memories(
    session: DbSession,
) -> MemoryRefreshResponse:
    service = _build_memory_service(session, get_settings())
    counts = await service.refresh(None)
    return MemoryRefreshResponse(**counts)
