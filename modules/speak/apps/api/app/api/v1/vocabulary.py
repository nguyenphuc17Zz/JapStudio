from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.users.service import UserService
from app.domains.vocabulary.schemas import (
    SaveVocabularyNotebookRequest,
    SaveVocabularyNotebookResponse,
    VocabularyLookupRequest,
    VocabularyLookupResponse,
)
from app.domains.vocabulary.service import VocabularyService
from app.infrastructure.database.session import get_db

router = APIRouter(prefix="/vocabulary", tags=["Context-Aware AI Vocabulary Lookup"])


async def get_current_user_id(db: AsyncSession = Depends(get_db)) -> str:
    """Resolves current active user."""
    user_service = UserService(db)
    user = await user_service.get_or_create_default_user()
    return user.id


@router.post(
    "/ai-lookup",
    response_model=VocabularyLookupResponse,
    summary="Context-Aware Highlight & AI Vocabulary Lookup",
    status_code=status.HTTP_200_OK,
)
async def ai_lookup_vocabulary(
    payload: VocabularyLookupRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> VocabularyLookupResponse:
    """
    Performs multidimensional, context-aware Japanese vocabulary analysis using AI.
    Analyzes nuance, register, JLPT level, natural collocations, situation examples, and alternatives.
    """
    service = VocabularyService(db)
    return await service.lookup_contextual_vocabulary(payload=payload, user_id=user_id)


@router.post(
    "/save-notebook",
    response_model=SaveVocabularyNotebookResponse,
    summary="Save Looked-up Vocabulary to Learner Memory & Learning Items Notebook",
    status_code=status.HTTP_200_OK,
)
async def save_vocabulary_notebook(
    payload: SaveVocabularyNotebookRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> SaveVocabularyNotebookResponse:
    """
    Persists the vocabulary item into the user's notebook and learning training plan.
    """
    service = VocabularyService(db)
    return await service.save_to_notebook(payload=payload, user_id=user_id)


@router.get(
    "/frequency",
    summary="Query High-Frequency BCCWJ Daily Vocabulary Dataset",
    status_code=status.HTTP_200_OK,
)
async def get_frequency_vocabulary(
    category: str | None = None,
    tier: int | None = None,
    jlpt: str | None = None,
    query: str | None = None,
    limit: int = 100,
):
    """
    Returns authentic Japanese high-frequency vocabulary based on BCCWJ & Spoken Japanese Corpus.
    Supports filtering by communicative category, frequency tier (1, 2, 3), JLPT level, and keyword.
    """
    from app.domains.vocabulary.bccwj_frequency_pool import (
        get_all_frequency_words,
        search_frequency_words,
        CATEGORY_WORDS_MAP,
    )

    words = get_all_frequency_words()
    if query:
        words = search_frequency_words(query)
    else:
        if category and category != "all":
            words = [w for w in words if w.category == category]
        if tier:
            words = [w for w in words if w.tier == tier]

    if jlpt and jlpt != "all":
        words = [w for w in words if w.jlpt.upper() == jlpt.upper()]

    limited_words = [
        {
            "rank": w.rank,
            "word": w.word,
            "reading": w.reading,
            "pos": w.pos,
            "category": w.category,
            "meaning_vi": w.meaning_vi,
            "synonyms_vi": w.synonyms_vi,
            "collocation_ja": w.collocation_ja,
            "collocation_vi": w.collocation_vi,
            "example_ja": w.example_ja,
            "example_vi": w.example_vi,
            "jlpt": w.jlpt,
            "tier": w.tier,
            "frequency_score": w.frequency_score,
            "frequency_badge": f"⭐ Top #{w.rank}" if w.rank <= 1000 else f"🔥 Tier {w.tier}",
        }
        for w in words[:limit]
    ]

    return {
        "total": len(words),
        "count": len(limited_words),
        "words": limited_words,
        "categories": list(CATEGORY_WORDS_MAP.keys()),
    }


@router.get(
    "/frequency/random",
    summary="Get Next Non-Repeating High-Frequency Word (Shuffle-Bag)",
    status_code=status.HTTP_200_OK,
)
async def get_random_frequency_word(
    category: str | None = None,
    tier: int | None = None,
    jlpt: str | None = None,
    query: str | None = None,
):
    """
    Returns next word using non-repeating shuffle-bag algorithm in < 2ms latency.
    """
    from app.domains.vocabulary.frequency_service import get_frequency_vocabulary_service

    service = get_frequency_vocabulary_service()
    entry = service.get_next_word(category=category, tier=tier, jlpt=jlpt, query=query)

    return {
        "rank": entry.rank,
        "word": entry.word,
        "reading": entry.reading,
        "pos": entry.pos,
        "category": entry.category,
        "meaning_vi": entry.meaning_vi,
        "synonyms_vi": entry.synonyms_vi,
        "collocation_ja": entry.collocation_ja,
        "collocation_vi": entry.collocation_vi,
        "example_ja": entry.example_ja,
        "example_vi": entry.example_vi,
        "jlpt": entry.jlpt,
        "tier": entry.tier,
        "frequency_score": entry.frequency_score,
        "frequency_badge": f"⭐ Top #{entry.rank}" if entry.rank <= 1000 else f"🔥 Tier {entry.tier}",
    }
