from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.comprehension import (
    InteractionLogRequest,
    InteractionLogResponse,
    ContextGuessResponse,
    CheckpointResponse,
    CheckpointSubmitRequest,
    CheckpointSubmitResponse,
    SentenceDecompositionResponse,
    AICompanionQueryRequest,
    AICompanionQueryResponse,
    ReadingSessionSummaryResponse,
    ResumeCheckpointResponse,
    ComprehensionSignalsResponse,
)
from app.services.comprehension_service import ComprehensionService

router = APIRouter(prefix="/immersion", tags=["Interactive Reading Intelligence"])


@router.post("/reading/interactions", response_model=InteractionLogResponse)
async def record_interaction(
    payload: InteractionLogRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Records a learner reading interaction event (guess, check, checkpoint)."""
    return await ComprehensionService.record_interaction(
        db=db,
        user_id=x_user_id,
        data=payload,
    )


@router.post("/content/{id}/context-guess", response_model=ContextGuessResponse)
async def get_context_guess(
    id: int,
    vocabulary_id: int = Query(..., description="ID of target vocabulary"),
    sentence_index: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Generates a 3-stage progressive context guess for target vocabulary."""
    try:
        return await ComprehensionService.generate_context_guess(
            db=db,
            content_id=id,
            vocabulary_id=vocabulary_id,
            sentence_index=sentence_index,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/content/{id}/checkpoints", response_model=List[CheckpointResponse])
async def get_content_checkpoints(
    id: int,
    force_regenerate: bool = Query(False, description="Force AI re-generation of checkpoints"),
    model_provider: Optional[str] = Query(None, description="Format: provider:model or model"),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves section comprehension checkpoints for an article, optionally forcing AI regeneration."""
    return await ComprehensionService.get_content_checkpoints(
        db=db,
        content_id=id,
        user_id=x_user_id,
        force_regenerate=force_regenerate,
        model_provider=model_provider,
    )


@router.post("/content/{id}/checkpoints/regenerate", response_model=List[CheckpointResponse])
async def regenerate_content_checkpoints(
    id: int,
    model_provider: Optional[str] = Query(None, description="Format: provider:model or model"),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Explicitly triggers AI re-generation of comprehension checkpoints for an article."""
    return await ComprehensionService.get_content_checkpoints(
        db=db,
        content_id=id,
        user_id=x_user_id,
        force_regenerate=True,
        model_provider=model_provider,
    )


@router.post("/content/{id}/checkpoints/{checkpoint_id}/submit", response_model=CheckpointSubmitResponse)
async def submit_checkpoint_answer(
    id: int,
    checkpoint_id: int,
    payload: CheckpointSubmitRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Submits an answer for a reading checkpoint and returns instant pedagogical feedback."""
    try:
        return await ComprehensionService.evaluate_checkpoint(
            db=db,
            checkpoint_id=checkpoint_id,
            user_id=x_user_id,
            selected_option_id=payload.selected_option_id,
            confidence=payload.confidence,
            time_spent_ms=payload.time_spent_ms,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/content/{id}/companion", response_model=AICompanionQueryResponse)
async def query_ai_companion(
    id: int,
    payload: AICompanionQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """Queries the AI Reading Companion with compact context window and persistent cache."""
    return await ComprehensionService.query_ai_companion(
        db=db,
        content_id=id,
        req=payload,
    )


@router.post("/content/{id}/decompose-sentence", response_model=SentenceDecompositionResponse)
async def decompose_sentence(
    id: int,
    sentence_index: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_db),
):
    """Provides visual syntax decomposition of a selected Japanese sentence."""
    return await ComprehensionService.decompose_sentence(
        db=db,
        content_id=id,
        sentence_index=sentence_index,
    )


@router.get("/content/{id}/session-summary", response_model=ReadingSessionSummaryResponse)
async def get_session_summary(
    id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Generates reading session summary and comprehension signals."""
    return await ComprehensionService.get_session_summary(
        db=db,
        content_id=id,
        user_id=x_user_id,
    )


@router.get("/content/{id}/resume-point", response_model=ResumeCheckpointResponse)
async def get_resume_checkpoint(
    id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Checks if learner had marked sentences as unclear in previous sessions."""
    return await ComprehensionService.get_resume_checkpoint(
        db=db,
        content_id=id,
        user_id=x_user_id,
    )
