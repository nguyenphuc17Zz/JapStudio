"""Expression Intelligence API endpoints (Phase 21).

Provides user-facing intelligence on:
- Collocation naturalness and native combinations
- Personal Expression Bank querying and summaries
- Overuse pattern radar
- Vietnamese-to-Japanese transfer classifications
- 5-tier Register transformations
- Natural expression variation ("Write 3 ways")
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import NotFoundError
from app.db.session import get_session
from app.repositories.expression_intelligence import ExpressionRecordRepository
from app.schemas.expression_intelligence import (
    AnalyzeExpressionsRequest,
    ExpressionBankListResponse,
    ExpressionBankSummaryOut,
    ExpressionRecordOut,
    GenerateVariationsRequest,
    RegisterTransformRequest,
)
from app.schemas.expression_intelligence_ai import (
    CollocationAnalysisResult,
    CollocationSuggestionsResult,
    ExpressionVariationResult,
    RegisterTransformationResult,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.expression_intelligence_service import ExpressionIntelligenceService

router = APIRouter(tags=["expression-intelligence"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _build_service(session: AsyncSession, settings: Settings) -> ExpressionIntelligenceService:
    return ExpressionIntelligenceService(
        repository=ExpressionRecordRepository(session),
        settings=settings,
        ai_service=AIService(settings=settings),
    )


@router.post("/analyze", response_model=CollocationAnalysisResult)
async def analyze_expressions(
    payload: AnalyzeExpressionsRequest,
    session: DbSession,
) -> CollocationAnalysisResult:
    """Analyze a Japanese sentence for collocations, overuse patterns, and Vietnamese transfer issues."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    return await service.analyze_expressions(
        user_id=None,
        text=payload.text,
        context_vi=payload.context_vi,
        target_register=payload.target_register,
        provider=payload.provider,
        model=payload.model,
    )


@router.get("/bank", response_model=ExpressionBankListResponse)
async def list_expression_bank(
    session: DbSession,
    expression_type: str | None = Query(default=None),
    is_overused: bool | None = Query(default=None),
    vietnamese_literal: bool | None = Query(default=None),
    transfer_classification: str | None = Query(default=None),
    base_word: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> ExpressionBankListResponse:
    """List expression records tracked in the learner's Personal Expression Bank."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    items, total = await service.list_expressions(
        user_id=None,
        expression_type=expression_type,
        is_overused=is_overused,
        vietnamese_literal=vietnamese_literal,
        transfer_classification=transfer_classification,
        base_word=base_word,
        skip=skip,
        limit=limit,
    )
    return ExpressionBankListResponse(
        items=[ExpressionRecordOut.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/bank/summary", response_model=ExpressionBankSummaryOut)
async def get_expression_bank_summary(
    session: DbSession,
) -> ExpressionBankSummaryOut:
    """Get aggregated metrics and top insights from the Personal Expression Bank."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    summary_data = await service.get_bank_summary(user_id=None)
    return ExpressionBankSummaryOut.model_validate(summary_data)


@router.get("/bank/{expression_id}", response_model=ExpressionRecordOut)
async def get_expression_record(
    expression_id: str,
    session: DbSession,
) -> ExpressionRecordOut:
    """Get detail for a specific expression record."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    record = await service.get_expression(expression_id)
    if not record:
        raise NotFoundError(f"Expression record {expression_id} not found")
    return ExpressionRecordOut.model_validate(record)


@router.get("/overused", response_model=list[ExpressionRecordOut])
async def list_overused_expressions(
    session: DbSession,
    min_count: int = Query(default=3, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
) -> list[ExpressionRecordOut]:
    """List expressions identified as overused / repetitive in the learner's writing."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    items = await service.get_overused(user_id=None, min_count=min_count, limit=limit)
    return [ExpressionRecordOut.model_validate(item) for item in items]


@router.get("/transfers", response_model=list[ExpressionRecordOut])
async def list_transfer_expressions(
    session: DbSession,
    classification: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> list[ExpressionRecordOut]:
    """List expressions identified with Vietnamese L1 transfer / translationese issues."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    items = await service.get_transfers(user_id=None, classification=classification, limit=limit)
    return [ExpressionRecordOut.model_validate(item) for item in items]


@router.post("/variations", response_model=ExpressionVariationResult)
async def generate_expression_variations(
    payload: GenerateVariationsRequest,
    session: DbSession,
) -> ExpressionVariationResult:
    """Generate 3 distinct natural variations for expressing a thought in Japanese."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    return await service.generate_variations(
        text=payload.text,
        context_vi=payload.context_vi,
        provider=payload.provider,
        model=payload.model,
    )


@router.post("/register-transform", response_model=RegisterTransformationResult)
async def transform_register(
    payload: RegisterTransformRequest,
    session: DbSession,
) -> RegisterTransformationResult:
    """Transform a sentence across the 5-tier register ladder (casual -> highly_formal)."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    return await service.transform_register(
        text=payload.text,
        source_register=payload.source_register,
        target_register=payload.target_register,
        provider=payload.provider,
        model=payload.model,
    )


@router.get("/collocations/{base_word}", response_model=CollocationSuggestionsResult)
async def get_collocation_suggestions(
    base_word: str,
    session: DbSession,
    provider: str | None = Query(default=None),
    model: str | None = Query(default=None),
) -> CollocationSuggestionsResult:
    """Suggest native Japanese collocations and example usages for a base word."""
    settings = await AIConfigService().get_effective_settings(session)
    service = _build_service(session, settings)
    return await service.get_collocation_suggestions(
        base_word=base_word,
        provider=provider,
        model=model,
    )
