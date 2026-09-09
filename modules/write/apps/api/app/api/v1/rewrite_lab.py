"""Rewrite Lab & Self-Correction API endpoints (Phase 19).

Provides REST endpoints for:
- Self-correction review pipeline sessions & progressive scaffolding
- Controlled comparison reveals & synthesis
- Transfer exercise generation and evaluation
- 6-mode style transformations
- Linguistic chunk diffs with grammatical reasoning
- Socratic pattern-oriented AI coaching
"""

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.models.rewrite_lab import RewriteLabSession
from app.repositories import (
    LearnerMemoryRepository,
    LearnerProfileRepository,
    RewriteLabRepository,
)
from app.schemas.rewrite_lab import (
    DiffExplainRequest,
    RecentSnippetsResponse,
    RewriteLabSessionOut,
    RewriteModeResult,
    RewriteTransformRequest,
    SelfCorrectionAttemptRequest,
    SelfCorrectionAttemptResult,
    SelfCorrectionSessionCreate,
    SocraticCoachRequest,
    SocraticCoachResult,
    TransferAttemptRequest,
    TransferEvaluationResult,
    TransferTaskResult,
)
from app.schemas.rewrite_lab_ai import (
    DiffExplanationResult,
    RewriteVariantsResult,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.memory_service import MemoryService
from app.services.rewrite_lab_service import RewriteLabService

router = APIRouter(prefix="/rewrite-lab", tags=["rewrite-lab"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_rewrite_lab_service(session: AsyncSession, settings: Settings) -> RewriteLabService:
    return RewriteLabService(
        repository=RewriteLabRepository(session),
        ai_service=AIService(settings=settings),
        settings=settings,
    )


def _build_memory_service(session: AsyncSession, settings: Settings) -> MemoryService:
    return MemoryService(
        repository=LearnerMemoryRepository(session),
        profile_repository=LearnerProfileRepository(session),
        ai_service=AIService(settings=settings),
        settings=settings,
    )


def _build_profile_service(session: AsyncSession, settings: Settings) -> LearnerProfileService:
    from app.repositories import DiscourseEvaluationRepository, ExerciseAttemptRepository

    return LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(
            ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
        ),
        ai_service=AIService(settings=settings),
        settings=settings,
    )


def _serialize_session(session: RewriteLabSession) -> RewriteLabSessionOut:
    revealed_variants = None
    if session.revealed_variants:
        revealed_variants = RewriteVariantsResult.model_validate(session.revealed_variants)

    transfer_task = None
    if session.transfer_task:
        transfer_task = TransferTaskResult.model_validate(session.transfer_task)

    return RewriteLabSessionOut(
        id=session.id,
        user_id=session.user_id,
        source_type=session.source_type,
        source_id=session.source_id,
        original_text=session.original_text,
        context_vi=session.context_vi,
        has_issue=session.has_issue,
        issue_category=session.issue_category,
        issue_category_name_vi=session.issue_category_name_vi,
        issue_explanation_vi=session.issue_explanation_vi,
        target_concept=session.target_concept,
        target_segment=session.target_segment,
        current_step=session.current_step,
        status=session.status,
        clue=session.clue,
        pattern=session.pattern,
        attempts=session.attempts or [],
        revealed_variants=revealed_variants,
        transfer_task=transfer_task,
        transfer_attempts=session.transfer_attempts or [],
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.post("/sessions", response_model=RewriteLabSessionOut, status_code=201)
async def create_self_correction_session(
    payload: SelfCorrectionSessionCreate,
    session: DbSession,
) -> RewriteLabSessionOut:
    """Initiates a Self-Correction / Rewrite session, detects issues, and presents Step 2 category explanation."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_rewrite_lab_service(session, settings)
    lab_session = await service.start_session(
        text=payload.text,
        context_vi=payload.context_vi,
        source_type=payload.source_type,
        source_id=payload.source_id,
        user_id=None,
        provider=payload.provider,
        model=payload.model,
    )
    return _serialize_session(lab_session)


@router.get("/sessions/{session_id}", response_model=RewriteLabSessionOut)
async def get_self_correction_session(
    session_id: str,
    session: DbSession,
) -> RewriteLabSessionOut:
    """Retrieves current state of a Rewrite Lab session."""
    lab_session = await RewriteLabRepository(session).get(session_id)
    if lab_session is None:
        raise NotFoundError(f"Rewrite Lab session '{session_id}' not found")
    return _serialize_session(lab_session)


@router.get("/sessions", response_model=list[RewriteLabSessionOut])
async def list_self_correction_sessions(
    session: DbSession,
    status: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
) -> list[RewriteLabSessionOut]:
    """Lists recent Rewrite Lab sessions."""
    items, _ = await RewriteLabRepository(session).list_by_user(
        user_id=None,
        status=status,
        source_type=source_type,
        skip=skip,
        limit=limit,
    )
    return [_serialize_session(item) for item in items]


@router.post("/sessions/{session_id}/attempt", response_model=SelfCorrectionAttemptResult)
async def submit_self_correction_attempt(
    session_id: str,
    payload: SelfCorrectionAttemptRequest,
    session: DbSession,
) -> SelfCorrectionAttemptResult:
    """Submits a self-correction attempt for Step 3, 4, or 5."""
    settings = await AIConfigService().get_effective_settings(session)
    repo = RewriteLabRepository(session)
    lab_session = await repo.get(session_id)
    if lab_session is None:
        raise NotFoundError(f"Rewrite Lab session '{session_id}' not found")

    service = _build_rewrite_lab_service(session, settings)
    result, _ = await service.submit_attempt(
        session=lab_session,
        attempt_text=payload.attempt_text,
        provider=payload.provider,
        model=payload.model,
    )
    return result


@router.post("/sessions/{session_id}/reveal", response_model=RewriteVariantsResult)
async def reveal_controlled_rewrites(
    session_id: str,
    session: DbSession,
    provider: str | None = Query(default=None),
    model: str | None = Query(default=None),
) -> RewriteVariantsResult:
    """Reveals controlled 4-way comparison variants (Step 6) and synthesis requirement."""
    settings = await AIConfigService().get_effective_settings(session)
    repo = RewriteLabRepository(session)
    lab_session = await repo.get(session_id)
    if lab_session is None:
        raise NotFoundError(f"Rewrite Lab session '{session_id}' not found")

    service = _build_rewrite_lab_service(session, settings)
    variants, _ = await service.reveal_rewrites(
        session=lab_session,
        provider=provider,
        model=model,
    )
    return variants


@router.post("/sessions/{session_id}/transfer", response_model=TransferTaskResult)
async def generate_transfer_task(
    session_id: str,
    session: DbSession,
    provider: str | None = Query(default=None),
    model: str | None = Query(default=None),
) -> TransferTaskResult:
    """Generates a novel transfer scenario prompt testing the same underlying pattern."""
    settings = await AIConfigService().get_effective_settings(session)
    repo = RewriteLabRepository(session)
    lab_session = await repo.get(session_id)
    if lab_session is None:
        raise NotFoundError(f"Rewrite Lab session '{session_id}' not found")

    profile_block = ""
    try:
        profile = await _build_profile_service(session, settings).profile_summary(None)
        skills = profile.get("skills") or {}
        profile_block = ", ".join(f"{k}: {v.get('score', 0)}" for k, v in skills.items())
    except Exception:
        profile_block = ""

    memory_block = ""
    if settings.ai_memory_enabled:
        try:
            memory_block = await _build_memory_service(session, settings).context_builder().memory_block(None, "coach")
        except Exception:
            memory_block = ""

    service = _build_rewrite_lab_service(session, settings)
    task, _ = await service.generate_transfer_task(
        session=lab_session,
        profile_block=profile_block[:1000],
        memory_block=memory_block[:1000],
        provider=provider,
        model=model,
    )
    return task


@router.post("/sessions/{session_id}/transfer/attempt", response_model=TransferEvaluationResult)
async def submit_transfer_attempt(
    session_id: str,
    payload: TransferAttemptRequest,
    session: DbSession,
) -> TransferEvaluationResult:
    """Evaluates whether the transfer sentence correctly applies the target pattern."""
    settings = await AIConfigService().get_effective_settings(session)
    repo = RewriteLabRepository(session)
    lab_session = await repo.get(session_id)
    if lab_session is None:
        raise NotFoundError(f"Rewrite Lab session '{session_id}' not found")

    service = _build_rewrite_lab_service(session, settings)
    result, _ = await service.submit_transfer_attempt(
        session=lab_session,
        transfer_text=payload.transfer_text,
        provider=payload.provider,
        model=payload.model,
    )
    return result


@router.post("/transform", response_model=RewriteModeResult)
async def transform_sentence_mode(
    payload: RewriteTransformRequest,
    session: DbSession,
) -> RewriteModeResult:
    """Transforms a Japanese sentence according to 1 of 6 rewrite modes."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_rewrite_lab_service(session, settings)
    return await service.transform_mode(
        text=payload.text,
        mode=payload.mode,
        target_register=payload.target_register,
        provider=payload.provider,
        model=payload.model,
    )


@router.post("/diff", response_model=DiffExplanationResult)
async def explain_sentence_diff(
    payload: DiffExplainRequest,
    session: DbSession,
) -> DiffExplanationResult:
    """Computes a linguistic chunk diff with grammatical rationales and improvement rating."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_rewrite_lab_service(session, settings)
    return await service.explain_diff(
        before=payload.before,
        after=payload.after,
        provider=payload.provider,
        model=payload.model,
    )


@router.post("/coach", response_model=SocraticCoachResult)
async def ask_socratic_writing_coach(
    payload: SocraticCoachRequest,
    session: DbSession,
) -> SocraticCoachResult:
    """Asks the Socratic coach for pattern-oriented writing advice."""
    settings = await AIConfigService().get_effective_settings(session)
    lab_session = None
    if payload.session_id:
        lab_session = await RewriteLabRepository(session).get(payload.session_id)

    profile_block = ""
    try:
        profile = await _build_profile_service(session, settings).profile_summary(None)
        skills = profile.get("skills") or {}
        profile_block = ", ".join(f"{k}: {v.get('score', 0)}" for k, v in skills.items())
    except Exception:
        profile_block = ""

    memory_block = ""
    if settings.ai_memory_enabled:
        try:
            memory_block = await _build_memory_service(session, settings).context_builder().memory_block(None, "coach")
        except Exception:
            memory_block = ""

    service = _build_rewrite_lab_service(session, settings)
    return await service.ask_socratic_coach(
        question=payload.question,
        session=lab_session,
        current_weakness=payload.current_weakness,
        profile_block=profile_block[:1000],
        memory_block=memory_block[:1000],
        provider=payload.provider,
        model=payload.model,
    )


@router.get(
    "/recent-snippets",
    response_model=RecentSnippetsResponse,
    summary="Get recent Japanese sentence snippets for quick import into Rewrite Lab",
)
async def get_recent_snippets(
    session: DbSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> RecentSnippetsResponse:
    """Returns recent Japanese sentences from practice attempts, free writing, simulations, and weaknesses."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_rewrite_lab_service(session, settings)
    snippets = await service.get_recent_snippets(user_id=None, limit=limit)
    return RecentSnippetsResponse(snippets=snippets, total=len(snippets))

