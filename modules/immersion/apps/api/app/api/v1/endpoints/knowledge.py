from typing import Optional
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.knowledge import (
    UserVocabularyResponse,
    VocabularyDetailResponse,
    VocabularyListResponse,
    UserExpressionResponse,
    ExpressionListResponse,
    UserGrammarResponse,
    GrammarListResponse,
    SaveSentenceRequest,
    UserSavedSentenceResponse,
    SavedSentenceListResponse,
    UpdateStatusRequest,
    LearningEventRequest,
    LearningEventResponse,
    ReviewSessionStartRequest,
    ReviewSessionResponse,
    SubmitReviewAnswerRequest,
    SubmitReviewAnswerResponse,
    FinishReviewSessionRequest,
    SuspendReviewItemRequest,
    DueBreakdownResponse,
    KnowledgeStatsResponse,
    KnowledgeGapsResponse,
    SrsPreferenceResponse,
    SrsPreferenceUpdateRequest,
    ReviewForecastResponse,
)
from app.services.knowledge_service import KnowledgeService

router = APIRouter(tags=["Personal Japanese Knowledge & Spaced Review"])


# ---------------------------------------------------------------------------
# 1. Knowledge Profile & Stats
# ---------------------------------------------------------------------------

@router.get("/immersion/knowledge/stats", response_model=KnowledgeStatsResponse)
async def get_knowledge_stats(
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves high-level personal knowledge statistics, mastery breakdown, and growth metrics."""
    return await KnowledgeService.get_knowledge_stats(db=db, user_id=x_user_id)


@router.get("/immersion/knowledge/gaps", response_model=KnowledgeGapsResponse)
async def get_knowledge_gaps(
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Detects recall lags, nuance confusion, and grammar blindspots with authentic examples."""
    return await KnowledgeService.get_knowledge_gaps(db=db, user_id=x_user_id)


# ---------------------------------------------------------------------------
# 2. Vocabulary Library
# ---------------------------------------------------------------------------

@router.get("/immersion/knowledge/vocabulary", response_model=VocabularyListResponse)
async def list_vocabulary(
    status: Optional[str] = Query(None, description="Filter by status: NEW, SEEN, LEARNING, FAMILIAR, MASTERED, IGNORED"),
    search: Optional[str] = Query(None, description="Search term, reading, or meaning"),
    difficulty: Optional[int] = Query(None, description="Filter by JLPT level or difficulty"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Lists vocabulary from the user's personal knowledge library with multi-criteria filters."""
    return await KnowledgeService.get_vocabulary_list(
        db=db,
        user_id=x_user_id,
        status=status,
        search=search,
        difficulty=difficulty,
        page=page,
        limit=limit,
    )


@router.get("/immersion/knowledge/vocabulary/{vocab_id}", response_model=VocabularyDetailResponse)
async def get_vocabulary_detail(
    vocab_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves comprehensive vocabulary detail with encounter history and authentic sentence contexts."""
    try:
        return await KnowledgeService.get_vocabulary_detail(db=db, user_id=x_user_id, vocab_id=vocab_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/immersion/knowledge/vocabulary/{vocab_id}/enrich", response_model=VocabularyDetailResponse)
async def enrich_vocabulary_detail(
    vocab_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """On-demand AI enrichment for a previously saved word (nuance, examples, alternatives).

    Uses the word's most recent saved context. Returns 502 when the AI
    provider fails so the frontend can offer a retry; the saved word itself
    is never harmed.
    """
    try:
        return await KnowledgeService.enrich_vocabulary_detail(db=db, user_id=x_user_id, vocab_id=vocab_id)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=msg)


# ---------------------------------------------------------------------------
# 3. Expressions & Grammar Libraries
# ---------------------------------------------------------------------------

@router.post("/immersion/knowledge/expressions/auto-collect")
async def auto_collect_expressions(
    content_id: int = Query(..., description="Article to collect collocations from"),
    max_items: int = Query(12, ge=1, le=50),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Finds an article's collocations and saves them into the library.

    Reuses stored enrichment when available, otherwise runs one AI scan.
    Idempotent: repeats only top up newly appeared expressions.
    """
    try:
        return await KnowledgeService.auto_collect_expressions(
            db=db, user_id=x_user_id, content_id=content_id, max_items=max_items
        )
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=msg)


@router.post("/immersion/knowledge/expressions/{expression_id}/enrich", response_model=UserExpressionResponse)
async def enrich_expression_detail(
    expression_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """On-demand AI enrichment for a collected expression (usage, composition, examples).

    Uses the expression's most recent saved context. Returns 502 when the AI
    provider fails so the frontend can offer a retry; the saved entry itself
    is never harmed.
    """
    try:
        return await KnowledgeService.enrich_expression_detail(
            db=db, user_id=x_user_id, expression_id=expression_id
        )
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=msg)

@router.get("/immersion/knowledge/expressions", response_model=ExpressionListResponse)
async def list_expressions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search expression, reading, or meaning"),
    expr_type: Optional[str] = Query(None, alias="type", description="Filter: COLLOCATION, IDIOM, SLANG, FORMAL_PATTERN"),
    status: Optional[str] = Query(None, description="Filter: NEW, LEARNING, FAMILIAR, MASTERED, IGNORED"),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Lists encountered collocations, set phrases, and idioms."""
    return await KnowledgeService.get_expressions_list(
        db=db,
        user_id=x_user_id,
        page=page,
        limit=limit,
        search=search,
        expr_type=expr_type,
        status=status,
    )


@router.get("/immersion/knowledge/grammar", response_model=GrammarListResponse)
async def list_grammar(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search pattern or meaning"),
    confidence: Optional[str] = Query(None, description="Filter: HIGH, MEDIUM, LOW"),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Lists encountered grammar patterns with accuracy and confidence tracking."""
    return await KnowledgeService.get_grammar_list(
        db=db,
        user_id=x_user_id,
        page=page,
        limit=limit,
        search=search,
        confidence=confidence,
    )


@router.post("/immersion/knowledge/grammar/{grammar_id}/enrich", response_model=UserGrammarResponse)
async def enrich_grammar_detail(
    grammar_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """On-demand AI enrichment for a previously saved pattern (formation, usage, examples).

    Uses the pattern's most recent saved context. Returns 502 when the AI
    provider fails so the frontend can offer a retry; the saved pattern
    itself is never harmed.
    """
    try:
        return await KnowledgeService.enrich_grammar_detail(db=db, user_id=x_user_id, grammar_id=grammar_id)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=msg)


# ---------------------------------------------------------------------------
# 4. Saved Sentences
# ---------------------------------------------------------------------------

@router.get("/immersion/knowledge/sentences", response_model=SavedSentenceListResponse)
async def list_saved_sentences(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search sentence or translation text"),
    reason: Optional[str] = Query(None, description="Filter by save reason"),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves saved sentences with paging, text search, and reason filter."""
    return await KnowledgeService.get_saved_sentences(
        db=db, user_id=x_user_id, page=page, limit=limit, search=search, reason=reason
    )


@router.post("/immersion/knowledge/sentences", response_model=UserSavedSentenceResponse)
async def save_sentence(
    payload: SaveSentenceRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Saves a memorable Japanese sentence with source context."""
    return await KnowledgeService.save_sentence(db=db, user_id=x_user_id, req=payload)


@router.delete("/immersion/knowledge/sentences/{sentence_id}")
async def delete_saved_sentence(
    sentence_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Deletes a saved sentence from the user library."""
    success = await KnowledgeService.delete_saved_sentence(db=db, user_id=x_user_id, sentence_id=sentence_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved sentence not found")
    return {"success": True, "sentence_id": sentence_id}


# ---------------------------------------------------------------------------
# 5. Item Status Management (Ignore, Master, etc.)
# ---------------------------------------------------------------------------

@router.post("/immersion/knowledge/{item_type}/{item_id}/status")
async def update_item_status(
    item_type: str,
    item_id: int,
    payload: UpdateStatusRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Updates learning status (e.g. IGNORED, MASTERED, LEARNING) of an item."""
    success = await KnowledgeService.update_item_status(
        db=db,
        user_id=x_user_id,
        item_type=item_type.upper(),
        item_id=item_id,
        new_status=payload.status,
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{item_type} with id {item_id} not found")
    return {"success": True, "item_id": item_id, "new_status": payload.status}


# ---------------------------------------------------------------------------
# 6. Centralized Event Ingestion
# ---------------------------------------------------------------------------

@router.post("/immersion/knowledge/events", response_model=LearningEventResponse)
async def ingest_learning_event(
    payload: LearningEventRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Ingests a decoupled learning event from reading, context guessing, or quizzes."""
    return await KnowledgeService.ingest_learning_event(db=db, user_id=x_user_id, req=payload)


# ---------------------------------------------------------------------------
# 7. Spaced Review Studio (FSRS Algorithm)
# ---------------------------------------------------------------------------

@router.get("/immersion/review/preferences", response_model=SrsPreferenceResponse)
async def get_review_preferences(
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Returns the user's SRS tuning (desired retention, interval cap, new-card pace)."""
    return await KnowledgeService.get_srs_preferences(db=db, user_id=x_user_id)


@router.put("/immersion/review/preferences", response_model=SrsPreferenceResponse)
async def update_review_preferences(
    payload: SrsPreferenceUpdateRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Updates SRS tuning; retention is clamped to 0.8–0.99."""
    return await KnowledgeService.update_srs_preferences(db=db, user_id=x_user_id, req=payload)


@router.get("/immersion/review/forecast", response_model=ReviewForecastResponse)
async def get_review_forecast(
    days: int = Query(30, ge=1, le=90),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Forecasts due counts per day plus the measured 30-day recall rate."""
    return await KnowledgeService.forecast_review_load(db=db, user_id=x_user_id, days=days)


@router.get("/immersion/review/due-breakdown", response_model=DueBreakdownResponse)
async def get_due_breakdown(
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Returns due counts split by item type plus never-reviewed cards."""
    return await KnowledgeService.get_due_breakdown(db=db, user_id=x_user_id)


@router.post("/immersion/review/suspend")
async def suspend_review_item(
    payload: SuspendReviewItemRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Manually suspends one card from the SRS queue."""
    try:
        return await KnowledgeService.suspend_review_item(
            db=db, user_id=x_user_id, item_type=payload.item_type, item_id=payload.item_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/immersion/review/session/{session_id}/finish")
async def finish_review_session(
    session_id: int,
    payload: FinishReviewSessionRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Persists session completion stats (items done + ratings breakdown)."""
    try:
        return await KnowledgeService.finish_review_session(
            db=db,
            user_id=x_user_id,
            session_id=session_id,
            items_completed=payload.items_completed,
            ratings=payload.ratings,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/immersion/review/due")
async def get_due_reviews_count(
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Returns number of items currently due for spaced review."""
    count = await KnowledgeService.get_due_review_count(db=db, user_id=x_user_id)
    return {"due_count": count}


@router.post("/immersion/review/session", response_model=ReviewSessionResponse)
async def start_review_session(
    payload: ReviewSessionStartRequest = ReviewSessionStartRequest(),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Generates an authentic context-grounded review session with questions and distractors."""
    try:
        return await KnowledgeService.start_review_session(
            db=db,
            user_id=x_user_id,
            limit=payload.limit,
            item_type=payload.item_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.post("/immersion/review/session/answer", response_model=SubmitReviewAnswerResponse)
@router.post("/immersion/review/session/{session_id}/answer", response_model=SubmitReviewAnswerResponse)
async def submit_review_answer(
    payload: SubmitReviewAnswerRequest,
    session_id: Optional[int] = None,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Applies FSRS 4-tier rating (Again, Hard, Good, Easy) and updates next review schedule."""
    try:
        return await KnowledgeService.submit_review_rating(db=db, user_id=x_user_id, req=payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
