"""Vocabulary Bank endpoints (Phase 5).

- GET  /api/v1/vocabulary                  -> filtered, paginated bank list
- GET  /api/v1/vocabulary/{id}             -> learning-oriented detail
- POST /api/v1/vocabulary/reprocess/{attempt_id} -> re-run extraction safely

Extraction also runs automatically after every evaluation (never breaks it);
the extract endpoint under attempts can be used explicitly.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.db.session import get_session
from app.models import UserVocabulary, VocabularyEntry
from app.repositories import (
    ExerciseAttemptRepository,
    ExerciseRepository,
    UserVocabularyRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
    WritingFeedbackRepository,
)
from app.schemas.vocabulary import (
    VocabLookupRequest,
    VocabLookupResponse,
    VocabSaveLookupRequest,
    VocabSaveLookupResponse,
    VocabularyDetail,
    VocabularyDiscoveryInfo,
    VocabularyExtractResponse,
    VocabularyListItem,
    VocabularyListResponse,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.vocabulary_service import VocabularyService

router = APIRouter(tags=["vocabulary"])


DbSession = Annotated[AsyncSession, Depends(get_session)]


async def _build_service(session: AsyncSession) -> VocabularyService:
    settings = await AIConfigService().get_effective_settings(session)
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



def _list_item(entry: VocabularyEntry, state: UserVocabulary | None) -> VocabularyListItem:
    return VocabularyListItem(
        id=entry.id,
        expression=entry.expression,
        reading=entry.reading,
        type=entry.type.value,
        meaning_vi=entry.meaning_vi,
        part_of_speech=entry.part_of_speech,
        estimated_jlpt_level=entry.estimated_jlpt_level,
        difficulty=entry.difficulty,
        register=entry.register,
        usage_context=entry.usage_context,
        example_sentence=entry.example_sentence,
        natural_alternatives=entry.natural_alternatives or [],
        notes=entry.notes,
        importance=entry.importance,
        confidence=entry.confidence.value,
        familiarity=state.familiarity.value if state else "new",
        discovered_count=state.discovered_count if state else 0,
        seen_count=state.seen_count if state else 0,
        used_count=state.used_count if state else 0,
        incorrect_count=state.incorrect_count if state else 0,
        correct_usage_count=state.correct_usage_count if state else 0,
        last_seen=state.last_seen if state else None,
        created_at=entry.created_at,
    )


@router.get("", response_model=VocabularyListResponse)
async def list_vocabulary(
    session: DbSession,
    vocabulary_type: str | None = Query(
        default=None, alias="type", description="word|expression|collocation"
    ),
    jlpt_level: str | None = Query(default=None, description="N5..N1"),
    difficulty_min: int | None = Query(default=None, ge=1, le=10),
    difficulty_max: int | None = Query(default=None, ge=1, le=10),
    register: str | None = Query(default=None, description="casual|polite|business|mixed"),
    source_type: str | None = Query(
        default=None,
        description="user_answer|ai_correction|ai_natural|ai_native|ai_register_variant|ai_explanation",
    ),
    search: str | None = Query(default=None, max_length=100),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> VocabularyListResponse:
    service = await _build_service(session)
    rows, total = await service.list_bank(
        vocabulary_type=vocabulary_type,
        jlpt_level=jlpt_level,
        difficulty_min=difficulty_min,
        difficulty_max=difficulty_max,
        register=register,
        source_type=source_type,
        search=search,
        skip=skip,
        limit=limit,
    )
    return VocabularyListResponse(
        items=[_list_item(entry, state) for entry, state in rows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/reprocess/{attempt_id}", response_model=VocabularyExtractResponse)
async def reprocess_attempt(
    session: DbSession,
    attempt_id: str,
) -> VocabularyExtractResponse:
    """Re-run extraction for an attempt (idempotent; merges duplicates)."""
    service = await _build_service(session)
    summary = await service.extract_for_attempt(attempt_id)
    return VocabularyExtractResponse(attempt_id=attempt_id, **summary)


@router.post("/ai-lookup", response_model=VocabLookupResponse)
async def ai_lookup(
    payload: VocabLookupRequest,
    session: DbSession,
) -> VocabLookupResponse:
    """Look up Japanese/Vietnamese vocabulary in context using AI."""
    service = await _build_service(session)
    return await service.ai_lookup(payload)


@router.post("/save-lookup", response_model=VocabSaveLookupResponse)
async def save_lookup(
    payload: VocabSaveLookupRequest,
    session: DbSession,
) -> VocabSaveLookupResponse:
    """Save a looked-up vocabulary word into the user's personal Vocabulary Bank."""
    service = await _build_service(session)
    entry_id, is_new = await service.save_lookup_entry(payload)
    msg = (
        "Đã thêm từ vựng mới vào sổ tay"
        if is_new
        else "Từ vựng đã có trong sổ tay, đã cập nhật số lần gặp"
    )
    return VocabSaveLookupResponse(entry_id=entry_id, is_new=is_new, message=msg)



@router.get("/{vocabulary_id}", response_model=VocabularyDetail)
async def get_vocabulary(
    session: DbSession,
    vocabulary_id: str,
) -> VocabularyDetail:
    service = await _build_service(session)
    result = await service.get_detail(vocabulary_id)
    if result is None:
        raise NotFoundError(f"Vocabulary entry '{vocabulary_id}' not found")
    entry, state = result

    discoveries = await VocabularyDiscoveryRepository(session).list_by_entry(entry.id)
    discovery_info = []
    for discovery, attempt in discoveries:
        exercise = await ExerciseRepository(session).get(discovery.exercise_id)
        provenance = discovery.provenance or {}
        discovery_info.append(
            VocabularyDiscoveryInfo(
                id=discovery.id,
                attempt_id=discovery.attempt_id,
                exercise_id=discovery.exercise_id,
                attempt_number=attempt.attempt_number,
                exercise_prompt_vi=exercise.prompt_vi if exercise else None,
                source_type=discovery.source_type.value,
                user_expression=discovery.user_expression,
                learning_reason=discovery.learning_reason,
                context_snippet=discovery.context_snippet,
                example_sentence=discovery.example_sentence,
                provider=provenance.get("provider") or "unknown",
                model=provenance.get("model") or "unknown",
                prompt_version=provenance.get("prompt_version") or "unknown",
                vocabulary_version=provenance.get("vocabulary_version") or "unknown",
                created_at=discovery.created_at,
            )
        )
    provenance = entry.provenance or {}
    detail = VocabularyDetail(
        **_list_item(entry, state).model_dump(),
        source_attempt_id=state.source_attempt_id if state else None,
        source_exercise_id=state.source_exercise_id if state else None,
        user_expression=state.user_expression if state else None,
        learning_reason=state.learning_reason if state else entry.meaning_vi,
        discovered_at=state.discovered_at if state else None,
        updated_at=entry.updated_at,
        provider=provenance.get("provider") or "unknown",
        model=provenance.get("model") or "unknown",
        prompt_version=provenance.get("prompt_version") or "unknown",
        vocabulary_version=provenance.get("vocabulary_version") or "unknown",
        discoveries=discovery_info,
    )
    return detail
