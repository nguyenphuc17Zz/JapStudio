"""Writing Drill API endpoints (Phase 18).

Provides dedicated REST endpoints for targeted writing drills:
- Session generation from learner weaknesses
- Progressive hint reveals
- Item attempts and evaluations
- Due retests / drill weaknesses listing
- Session retrieval and history
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.db.session import get_session
from app.models.writing_drill import WritingDrillSession
from app.repositories.writing_drill import WritingDrillSessionRepository
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.schemas.writing_drill import (
    DrillAttemptRequest,
    DrillAttemptResultOut,
    DrillGenerateRequest,
    DrillHintOut,
    DrillItemOut,
    DrillOutcomeOut,
    DrillRevealOut,
    DrillSessionListResponse,
    DrillSessionOut,
    DueDrillListResponse,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.writing_drill_service import WritingDrillService

router = APIRouter(tags=["writing-drills"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_drill_service(session: AsyncSession, settings: Settings) -> WritingDrillService:
    return WritingDrillService(
        drill_repository=WritingDrillSessionRepository(session),
        weakness_repository=WritingWeaknessRepository(session),
        settings=settings,
        ai_service=AIService(settings=settings),
    )


def _serialize_session(session: WritingDrillSession) -> DrillSessionOut:
    items_out = []
    for it in session.items or []:
        items_out.append(DrillItemOut.model_validate(it))

    outcome_out = None
    if session.outcome:
        outcome_out = DrillOutcomeOut.model_validate(session.outcome)

    return DrillSessionOut(
        id=session.id,
        user_id=session.user_id,
        weakness_id=session.weakness_id,
        weakness_category=session.weakness_category,
        weakness_subtype=session.weakness_subtype,
        title=session.title,
        target_focus=session.target_focus,
        jlpt_level=session.jlpt_level,
        difficulty=session.difficulty,
        status=session.status,
        current_item_index=session.current_item_index,
        total_items=len(session.items or []),
        items=items_out,
        attempts=session.attempts or [],
        outcome=outcome_out,
        mastery_delta=session.mastery_delta,
        created_at=session.created_at,
        completed_at=session.completed_at,
    )


@router.post("/generate", response_model=DrillSessionOut, status_code=201)
async def generate_writing_drill_session(
    payload: DrillGenerateRequest,
    session: DbSession,
) -> DrillSessionOut:
    """Generates a targeted, adaptive drill session from a learner weakness."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_drill_service(session, settings)
    drill_session = await service.generate_session(
        user_id=None,
        weakness_id=payload.weakness_id,
        category=payload.category,
        subtype=payload.subtype,
        jlpt_level=payload.jlpt_level,
        difficulty=payload.difficulty or 5,
        context_domain=payload.context_domain,
        provider=payload.provider,
        model=payload.model,
    )
    return _serialize_session(drill_session)


@router.get("/due", response_model=DueDrillListResponse)
async def list_due_writing_drills(
    session: DbSession,
) -> DueDrillListResponse:
    """Lists high-priority weaknesses and due spaced-retests ready for drill practice."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_drill_service(session, settings)
    items = await service.list_due_drills(user_id=None)
    return DueDrillListResponse(items=items, total=len(items))


@router.get("/{drill_id}", response_model=DrillSessionOut)
async def get_writing_drill_session(
    drill_id: str,
    session: DbSession,
) -> DrillSessionOut:
    """Retrieves an existing drill session with items, attempts, and current state."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_drill_service(session, settings)
    drill_session = await service.get_session(drill_id)
    return _serialize_session(drill_session)


@router.post("/{drill_id}/attempt", response_model=DrillAttemptResultOut)
async def submit_writing_drill_attempt(
    drill_id: str,
    payload: DrillAttemptRequest,
    session: DbSession,
) -> DrillAttemptResultOut:
    """Submits an attempt for the current or specified drill item and receives immediate feedback."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_drill_service(session, settings)
    return await service.submit_attempt(
        session_id=drill_id,
        user_answer=payload.answer_text,
        item_id=payload.item_id,
        item_index=payload.item_index,
        provider=payload.provider,
        model=payload.model,
    )


@router.post("/{drill_id}/hint", response_model=DrillHintOut)
async def request_writing_drill_hint(
    drill_id: str,
    session: DbSession,
    item_id: str | None = Query(default=None),
) -> DrillHintOut:
    """Reveals the next progressive hint for the current drill item."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_drill_service(session, settings)
    return await service.request_hint(session_id=drill_id, item_id=item_id)


@router.post("/{drill_id}/reveal", response_model=DrillRevealOut)
async def reveal_writing_drill_answer(
    drill_id: str,
    session: DbSession,
    item_id: str | None = Query(default=None),
) -> DrillRevealOut:
    """Reveals target exemplar answer and explanation for the current drill item."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_drill_service(session, settings)
    return await service.reveal_answer(session_id=drill_id, item_id=item_id)


@router.get("", response_model=DrillSessionListResponse)
async def list_writing_drill_sessions(
    session: DbSession,
    status: str | None = Query(default=None),
    weakness_id: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> DrillSessionListResponse:
    """Lists past writing drill sessions with optional status/weakness filtering."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_drill_service(session, settings)
    items, total = await service.list_sessions(
        user_id=None, status=status, weakness_id=weakness_id, skip=skip, limit=limit
    )
    return DrillSessionListResponse(
        items=[_serialize_session(it) for it in items],
        total=total,
        skip=skip,
        limit=limit,
    )
