from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.reader import (
    FeedListResponse,
    ReaderContentResponse,
    FeedItemResponse,
    TranslateRequest,
    TranslateResponse,
    ExplainRequest,
    SentenceExplanationResponse,
    SelectionLookupRequest,
    SelectionLookupResponse,
    GrammarLookupRequest,
    GrammarLookupResponse,
    ExpressionLookupRequest,
    ExpressionLookupResponse,
    FuriganaBatchRequest,
    FuriganaBatchResponse,
    FuriganaBatchResult,
    FuriganaTokenOut,
    ProgressUpdateRequest,
    ProgressUpdateResponse,
    ReadingHistoryGroupedResponse,
)
from app.services.reader_service import ReaderService
from app.services.furigana_service import FuriganaService

router = APIRouter(prefix="/immersion", tags=["Immersion Feed & Smart Reader"])


@router.get("/feed", response_model=FeedListResponse)
async def get_feed(
    tab: str = Query("ALL", description="ALL, NEWS, SOCIAL, BLOGS"),
    source_id: Optional[int] = Query(None),
    jlpt: Optional[str] = Query(None, description="N5, N4, N3, N2, N1"),
    target_jlpt: Optional[str] = Query(None, description="Alias for jlpt"),
    topic: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("relevant", description="relevant, newest, easiest, hardest, useful, random"),
    seed: Optional[int] = Query(None, description="Random seed for stable pagination during shuffle"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves ranked Japanese immersion feed items with diversity and reading state."""
    effective_jlpt = jlpt or target_jlpt
    return await ReaderService.get_feed(
        db=db,
        user_id=x_user_id,
        tab=tab.upper(),
        source_id=source_id,
        jlpt=effective_jlpt,
        topic=topic,
        search=search,
        sort_by=sort_by.lower(),
        seed=seed,
        page=page,
        page_size=page_size
    )


@router.get("/search", response_model=FeedListResponse)
async def search_content(
    q: str = Query("", description="Search term in Japanese or English"),
    jlpt: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Searches Japanese articles by title, content, or topics."""
    return await ReaderService.get_feed(
        db=db,
        user_id=x_user_id,
        search=q,
        jlpt=jlpt,
        topic=topic,
        page=page,
        page_size=page_size
    )


@router.get("/content/{content_id}", response_model=ReaderContentResponse)
async def get_reader_content(
    content_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Loads full article with annotated sentences, vocabulary, grammar, and user progress."""
    content = await ReaderService.get_content_for_reader(
        db=db,
        content_id=content_id,
        user_id=x_user_id
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content not found or unavailable")
    return content


@router.post("/content/{content_id}/refetch", response_model=ReaderContentResponse)
async def refetch_reader_content(
    content_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Deep-scrapes original article URL to re-extract genuine full body text, re-segment sentences, and update content."""
    try:
        updated = await ReaderService.refetch_content(
            db=db,
            content_id=content_id,
            user_id=x_user_id
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Content not found or unavailable")
        return updated
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to scrape full content from source: {str(exc)}")


@router.get("/content/{content_id}/related", response_model=List[FeedItemResponse])
async def get_related_content(
    content_id: int,
    limit: int = Query(4, ge=1, le=10),
    db: AsyncSession = Depends(get_db)
):
    """Returns related Japanese articles matching topic, entity, or difficulty."""
    return await ReaderService.get_related_contents(db=db, content_id=content_id, limit=limit)


@router.post("/content/{content_id}/translate", response_model=TranslateResponse)
async def translate_content(
    content_id: int,
    req: TranslateRequest,
    model_provider: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """On-demand Vietnamese translation for an entire article or a specific sentence (cached)."""
    effective_provider = req.model_provider or model_provider
    return await ReaderService.translate_sentence_or_content(
        db=db,
        content_id=content_id,
        sentence_index=req.sentence_index,
        target_language=req.target_language,
        model_provider=effective_provider
    )


@router.post("/content/{content_id}/explain", response_model=SentenceExplanationResponse)
async def explain_sentence(
    content_id: int,
    req: Optional[ExplainRequest] = None,
    sentence_index: Optional[int] = Query(None, ge=1),
    model_provider: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Pedagogical context explanation for a specific Japanese sentence (cached)."""
    target_index = (req.sentence_index if req and req.sentence_index is not None else sentence_index)
    if not target_index:
        raise HTTPException(status_code=400, detail="sentence_index is required")
    effective_provider = (req.model_provider if req and req.model_provider else model_provider)
    return await ReaderService.explain_sentence(
        db=db,
        content_id=content_id,
        sentence_index=target_index,
        model_provider=effective_provider
    )


@router.post("/lookup", response_model=SelectionLookupResponse)
async def lookup_selection(
    req: SelectionLookupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Tra từ bôi đen: mặc định quick (reading + nghĩa, nhanh), detail=full để lấy chi tiết AI."""
    try:
        return await ReaderService.lookup_selection(
            db=db,
            query=req.query,
            context=req.context,
            content_id=req.content_id,
            model_provider=req.model_provider,
            detail=req.detail,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/lookup-grammar", response_model=GrammarLookupResponse)
async def lookup_grammar(
    req: GrammarLookupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Tra ngữ pháp: mặc định quick (formation + meaning), detail=full để lấy ví dụ đầy đủ."""
    try:
        return await ReaderService.lookup_grammar(
            db=db,
            pattern=req.pattern,
            context=req.context,
            content_id=req.content_id,
            model_provider=req.model_provider,
            detail=req.detail,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/lookup-expression", response_model=ExpressionLookupResponse)
async def lookup_expression(
    req: ExpressionLookupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Tra cụm từ: mặc định quick (nghĩa cốt lõi), detail=full để lấy chi tiết AI."""
    try:
        return await ReaderService.lookup_expression(
            db=db,
            expression=req.expression,
            context=req.context,
            content_id=req.content_id,
            model_provider=req.model_provider,
            detail=req.detail,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/furigana", response_model=FuriganaBatchResponse)
async def generate_furigana_batch(req: FuriganaBatchRequest):
    """Generates furigana tokens for a batch of saved texts (local morphology, no AI).

    Used by the library's saved-sentences tab to render ruby readings.
    """
    results = []
    for item in req.texts:
        try:
            _, tokens = FuriganaService.generate_sentence_furigana(item.text or "")
        except Exception:
            tokens = [{"text": item.text or "", "reading": None, "is_kanji": False}]
        results.append(
            FuriganaBatchResult(
                key=item.key,
                tokens=[
                    FuriganaTokenOut(
                        text=str(t.get("text", "")),
                        reading=t.get("reading"),
                        is_kanji=bool(t.get("is_kanji", False)),
                    )
                    for t in (tokens or [])
                    if isinstance(t, dict) and str(t.get("text", ""))
                ],
            )
        )
    return FuriganaBatchResponse(items=results)


@router.post("/content/{content_id}/save")
async def save_content(
    content_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Saves/bookmarks a content item."""
    is_saved = await ReaderService.toggle_save(db=db, user_id=x_user_id, content_id=content_id)
    return {"content_id": content_id, "is_saved": is_saved}


@router.delete("/content/{content_id}/save")
async def unsave_content(
    content_id: int,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Unsaves a bookmarked content item."""
    await ReaderService.toggle_save(db=db, user_id=x_user_id, content_id=content_id)
    return {"content_id": content_id, "is_saved": False}


@router.post("/content/{content_id}/progress", response_model=ProgressUpdateResponse)
async def update_reading_progress(
    content_id: int,
    req: ProgressUpdateRequest,
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Debounced update of user reading progress percentage and last sentence index."""
    return await ReaderService.update_progress(
        db=db,
        user_id=x_user_id,
        content_id=content_id,
        progress_percent=req.progress_percent,
        last_sentence_index=req.last_sentence_index,
        time_spent_seconds=req.time_spent_seconds,
        completed=req.completed
    )


@router.get("/saved", response_model=FeedListResponse)
async def get_saved_content(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Lists articles bookmarked/saved by user."""
    return await ReaderService.get_saved(db=db, user_id=x_user_id, page=page, page_size=page_size)


@router.get("/history", response_model=ReadingHistoryGroupedResponse)
async def get_reading_history(
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Returns user's reading history grouped chronologically: Today, Yesterday, This Week, Older."""
    return await ReaderService.get_history(db=db, user_id=x_user_id)


@router.get("/continue-reading", response_model=List[FeedItemResponse])
async def get_continue_reading(
    limit: int = Query(5, ge=1, le=10),
    x_user_id: str = Header("default_user", alias="X-User-Id"),
    db: AsyncSession = Depends(get_db)
):
    """Returns in-progress articles for the 'Continue Reading' shelf."""
    return await ReaderService.get_continue_reading(db=db, user_id=x_user_id, limit=limit)
