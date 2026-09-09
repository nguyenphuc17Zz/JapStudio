"""API endpoints for Furigana & Japanese tokenization using SudachiPy."""

from fastapi import APIRouter
from app.schemas.furigana import (
    FuriganaBatchRequest,
    FuriganaConvertRequest,
    FuriganaConvertResponse,
)
from app.services.furigana_service import furigana_service, get_cached_furigana

router = APIRouter(tags=["Furigana"])


@router.post("/convert", response_model=FuriganaConvertResponse)
async def convert_furigana(payload: FuriganaConvertRequest) -> FuriganaConvertResponse:
    """Tokenize Japanese text and return Furigana annotations and HTML Ruby markup."""
    # Use cached function for short/medium texts
    if len(payload.text) <= 500:
        return get_cached_furigana(payload.text, payload.mode)
    return furigana_service.tokenize_and_convert(payload.text, payload.mode)


@router.post("/batch", response_model=list[FuriganaConvertResponse])
async def convert_furigana_batch(payload: FuriganaBatchRequest) -> list[FuriganaConvertResponse]:
    """Batch convert multiple Japanese texts (each truncated to 500 chars for cache)."""
    results: list[FuriganaConvertResponse] = []
    for item in payload.texts:
        txt = item[:500] if len(item) > 500 else item
        if len(txt) <= 500:
            results.append(get_cached_furigana(txt, payload.mode))
        else:
            results.append(furigana_service.tokenize_and_convert(txt, payload.mode))
    return results
