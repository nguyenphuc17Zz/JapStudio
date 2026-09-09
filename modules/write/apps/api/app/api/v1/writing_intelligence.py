"""Writing Intelligence API endpoints (Phase 16).

Provides user-facing intelligence on recurring writing weaknesses,
mastery lifecycle, aggregated writing fingerprints, and summary metrics.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.repositories import (
    DiscourseEvaluationRepository,
    ExerciseAttemptRepository,
    LearnerProfileRepository,
)
from app.repositories.writing_intelligence import WritingWeaknessRepository
from app.schemas.adaptive_curriculum import (
    DailyPlan,
    SessionDoneRequest,
    SessionDoneResult,
    WeaknessPriorityResponse,
)
from app.schemas.writing_intelligence import (
    DueRetestListResponse,
    EvidenceSummaryOut,
    MasteryHistoryEventOut,
    MasteryNarrativeOut,
    MasteryStateOut,
    WeaknessDetailOut,
    WeaknessListResponse,
    WritingIntelligenceProfileOut,
    WritingIntelligenceSummaryOut,
    WritingWeaknessOut,
)
from app.schemas.writing_intelligence_ai import WritingDiagnosisResult
from app.services.adaptive_curriculum_service import AdaptiveCurriculumService
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.curriculum_enrichment_service import CurriculumEnrichmentService
from app.services.learner_evidence import LearnerEvidenceService
from app.services.learner_profile_service import LearnerProfileService
from app.services.writing_intelligence_service import WritingIntelligenceService

router = APIRouter(tags=["writing-intelligence"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_service(session: AsyncSession, settings: Settings) -> WritingIntelligenceService:
    return WritingIntelligenceService(
        weakness_repository=WritingWeaknessRepository(session),
        settings=settings,
        ai_service=AIService(settings=settings),
    )


def _build_curriculum_service(
    session: AsyncSession, settings: Settings, ai_service: AIService
) -> AdaptiveCurriculumService:
    profile_service = LearnerProfileService(
        repository=LearnerProfileRepository(session),
        evidence_service=LearnerEvidenceService(
            ExerciseAttemptRepository(session), settings, DiscourseEvaluationRepository(session)
        ),
        ai_service=ai_service,
        settings=settings,
    )
    enrichment_service = CurriculumEnrichmentService(ai_service=ai_service, settings=settings)
    return AdaptiveCurriculumService(
        weakness_repository=WritingWeaknessRepository(session),
        settings=settings,
        ai_service=ai_service,
        profile_service=profile_service,
        enrichment_service=enrichment_service,
    )


@router.get("/profile", response_model=WritingIntelligenceProfileOut)
async def get_writing_intelligence_profile(
    session: DbSession,
) -> WritingIntelligenceProfileOut:
    """Aggregated Writing Intelligence profile with full dimensions & fingerprint."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    data = await service.get_profile(None)
    return WritingIntelligenceProfileOut.model_validate(data)


@router.get("/summary", response_model=WritingIntelligenceSummaryOut)
async def get_writing_intelligence_summary(
    session: DbSession,
) -> WritingIntelligenceSummaryOut:
    """Lightweight writing intelligence summary for dashboards and sidebars."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    data = await service.get_summary(None)
    return WritingIntelligenceSummaryOut.model_validate(data)


@router.get("/weaknesses", response_model=WeaknessListResponse)
async def list_writing_weaknesses(
    session: DbSession,
    category: str | None = Query(default=None),
    status: str | None = Query(default=None),
    lifecycle_state: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> WeaknessListResponse:
    """List tracked writing weaknesses with optional filtering."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    items, total = await service.list_weaknesses(
        None,
        category=category,
        status=status,
        lifecycle_state=lifecycle_state,
        severity=severity,
        skip=skip,
        limit=limit,
    )
    return WeaknessListResponse(
        items=[WritingWeaknessOut.model_validate(item, from_attributes=True) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/retests/due", response_model=DueRetestListResponse)
async def list_due_retests(
    session: DbSession,
    due_only: bool = Query(default=False),
) -> DueRetestListResponse:
    """List writing weaknesses scheduled or currently due for spaced retesting."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    items = await service.get_due_retests(None, due_only=due_only)
    return DueRetestListResponse(items=items, total=len(items))


@router.get("/evidence/summary", response_model=EvidenceSummaryOut)
async def get_evidence_summary(
    session: DbSession,
) -> EvidenceSummaryOut:
    """Aggregated evidence and context generalization summary across all tracked weaknesses."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    return await service.get_evidence_summary(None)


@router.get("/weaknesses/{weakness_id}", response_model=WritingWeaknessOut)
async def get_writing_weakness(
    session: DbSession,
    weakness_id: str,
) -> WritingWeaknessOut:
    """Get single writing weakness by ID with full recurrence history."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    weakness = await service.get_weakness_by_id(weakness_id)
    if weakness is None:
        raise NotFoundError(f"Writing weakness '{weakness_id}' not found")
    return WritingWeaknessOut.model_validate(weakness, from_attributes=True)


@router.get("/weaknesses/{weakness_id}/detail", response_model=WeaknessDetailOut)
async def get_writing_weakness_detail(
    session: DbSession,
    weakness_id: str,
) -> WeaknessDetailOut:
    """Get comprehensive weakness detail with evidence breakdown and narrative."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    detail = await service.get_weakness_detail(weakness_id)
    if detail is None:
        raise NotFoundError(f"Writing weakness '{weakness_id}' not found")
    return detail


@router.get("/weaknesses/{weakness_id}/mastery", response_model=MasteryStateOut)
async def get_writing_weakness_mastery(
    session: DbSession,
    weakness_id: str,
) -> MasteryStateOut:
    """Get current mastery lifecycle state, deterministic score and evidence."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    mastery = await service.get_mastery_state(weakness_id)
    if mastery is None:
        raise NotFoundError(f"Writing weakness '{weakness_id}' not found")
    return mastery


@router.get("/weaknesses/{weakness_id}/history", response_model=list[MasteryHistoryEventOut])
async def get_writing_weakness_history(
    session: DbSession,
    weakness_id: str,
) -> list[MasteryHistoryEventOut]:
    """Get chronological state machine transition history for a weakness."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    history = await service.get_mastery_history(weakness_id)
    if history is None:
        raise NotFoundError(f"Writing weakness '{weakness_id}' not found")
    return [MasteryHistoryEventOut.model_validate(h) for h in history]


@router.post("/weaknesses/{weakness_id}/narrative", response_model=MasteryNarrativeOut)
async def generate_weakness_narrative(
    session: DbSession,
    weakness_id: str,
    provider: str | None = Query(default=None),
    model: str | None = Query(default=None),
) -> MasteryNarrativeOut:
    """Generate or refresh AI narrative for a weakness based on deterministic evidence."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    narrative = await service.generate_narrative_for_weakness(
        weakness_id, provider=provider, model=model
    )
    if narrative is None:
        raise NotFoundError(f"Writing weakness '{weakness_id}' not found")
    return narrative


@router.post("/diagnose", response_model=WritingDiagnosisResult)
async def diagnose_writing_tendencies(
    session: DbSession,
    provider: str | None = Query(default=None),
    model: str | None = Query(default=None),
) -> WritingDiagnosisResult:
    """AI-powered root-cause writing diagnosis and personalized remediation plan."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    return await service.diagnose_writing(None, provider=provider, model=model)


# ---------------------------------------------------------------------------
# Phase 22: Adaptive Writing Curriculum 2.0 Endpoints
# ---------------------------------------------------------------------------


@router.get("/curriculum/daily-plan", response_model=DailyPlan)
async def get_curriculum_daily_plan(
    session: DbSession,
    enrich: bool = Query(default=True),
    total_tasks: int = Query(default=4, ge=2, le=8),
) -> DailyPlan:
    """Generate today's tailored 70/20/10 writing plan."""
    settings = await AIConfigService().get_effective_settings(session)
    ai_service = AIService(settings=settings)
    service = _build_curriculum_service(session, settings, ai_service)
    return await service.build_daily_plan(None, total_tasks=total_tasks, enrich=enrich)


@router.get("/curriculum/priorities", response_model=WeaknessPriorityResponse)
async def get_curriculum_priorities(
    session: DbSession,
    enrich: bool = Query(default=False),
    limit: int = Query(default=10, ge=1, le=50),
) -> WeaknessPriorityResponse:
    """Get writing weaknesses ranked by the 8-signal WritingPriorityEngine."""
    settings = await AIConfigService().get_effective_settings(session)
    ai_service = AIService(settings=settings)
    service = _build_curriculum_service(session, settings, ai_service)
    items, enriched = await service.get_priorities(None, limit=limit, enrich=enrich)
    return WeaknessPriorityResponse(items=items, total=len(items), enriched=enriched)


@router.post("/curriculum/session-done", response_model=SessionDoneResult)
async def mark_curriculum_session_done(
    session: DbSession,
    body: SessionDoneRequest,
    enrich: bool = Query(default=True),
) -> SessionDoneResult:
    """Advance context rotation for completed tasks and generate optional debrief."""
    settings = await AIConfigService().get_effective_settings(session)
    ai_service = AIService(settings=settings)
    service = _build_curriculum_service(session, settings, ai_service)
    return await service.mark_session_done(
        None, completed_task_ids=body.completed_task_ids, enrich=enrich
    )

