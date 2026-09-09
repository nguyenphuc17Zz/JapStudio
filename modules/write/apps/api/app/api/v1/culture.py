"""API routes for Japanese cultural features (Hanko, Haiku, Omikuji, Kotowaza, Kitsune)."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.cultural_ai import (
    HaikuGenerateRequest,
    HaikuGenerateResponse,
    HankoSuggestionResponse,
    KitsuneChatRequest,
    KitsuneChatResponse,
    KitsuneDialogueRequest,
    KitsuneDialogueResponse,
    KotowazaGenerateRequest,
    KotowazaResponse,
    OmikujiDrawRequest,
    OmikujiFortuneResponse,
)
from app.services.ai_config_service import AIConfigService
from app.services.ai_service import AIService
from app.services.cultural_service import CulturalService

logger = logging.getLogger("app.culture")

router = APIRouter(tags=["culture"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


class HankoRequest(BaseModel):
    name: str = Field(default="", max_length=50)
    provider: str | None = None
    model: str | None = None


class HaikuRequest(BaseModel):
    season: str | None = None
    theme: str | None = None
    streak_days: int | None = None
    provider: str | None = None
    model: str | None = None


class OmikujiRequest(BaseModel):
    clan_id: str | None = None
    study_focus: str | None = None
    provider: str | None = None
    model: str | None = None


class KotowazaRequest(BaseModel):
    category: str | None = None
    jlpt_level: str | None = None
    provider: str | None = None
    model: str | None = None


class KitsuneRequest(BaseModel):
    streak: int = 0
    today_completed_count: int = 0
    current_clan: str = "sakura"
    user_mood: str | None = None
    page_context: str | None = None
    provider: str | None = None
    model: str | None = None


async def _build_cultural_service(session: AsyncSession) -> CulturalService:
    settings = await AIConfigService().get_effective_settings(session)
    ai_service = AIService(settings=settings)
    return CulturalService(ai_service=ai_service, settings=settings)


@router.post("/hanko/suggest", response_model=HankoSuggestionResponse)
async def suggest_hanko(
    session: DbSession,
    req: HankoRequest,
) -> HankoSuggestionResponse:
    """Suggest personalized Kanji options for a Hanko seal based on Vietnamese name or random artistic inspiration."""
    service = await _build_cultural_service(session)
    return await service.suggest_hanko(req.name, provider=req.provider, model=req.model)


@router.post("/haiku/generate", response_model=HaikuGenerateResponse)
async def generate_haiku(
    session: DbSession,
    req: HaikuRequest,
) -> HaikuGenerateResponse:
    """Generate a contextual 5-7-5 Japanese Haiku with poetic Vietnamese translation."""
    service = await _build_cultural_service(session)
    haiku_req = HaikuGenerateRequest(
        season=req.season,
        theme=req.theme,
        streak_days=req.streak_days,
    )
    return await service.generate_haiku(haiku_req, provider=req.provider, model=req.model)


@router.post("/omikuji/draw", response_model=OmikujiFortuneResponse)
async def draw_omikuji(
    session: DbSession,
    req: OmikujiRequest,
) -> OmikujiFortuneResponse:
    """Draw a Shinto Omikuji fortune with oracle verse and writing insights."""
    service = await _build_cultural_service(session)
    omikuji_req = OmikujiDrawRequest(
        clan_id=req.clan_id,
        study_focus=req.study_focus,
    )
    return await service.draw_omikuji(omikuji_req, provider=req.provider, model=req.model)


@router.post("/kotowaza/random", response_model=KotowazaResponse)
async def get_random_kotowaza(
    session: DbSession,
    req: KotowazaRequest,
) -> KotowazaResponse:
    """Get a Japanese proverb / Yojijukugo with Vietnamese equivalent and practice challenge."""
    service = await _build_cultural_service(session)
    kotowaza_req = KotowazaGenerateRequest(
        category=req.category,
        jlpt_level=req.jlpt_level,
    )
    return await service.get_kotowaza(kotowaza_req, provider=req.provider, model=req.model)


@router.post("/kitsune/dialogue", response_model=KitsuneDialogueResponse)
async def get_kitsune_dialogue(
    session: DbSession,
    req: KitsuneRequest,
) -> KitsuneDialogueResponse:
    """Get dynamic companion dialogue and encouragement from Kitsune."""
    service = await _build_cultural_service(session)
    kitsune_req = KitsuneDialogueRequest(
        streak=req.streak,
        today_completed_count=req.today_completed_count,
        current_clan=req.current_clan,
        user_mood=req.user_mood,
        page_context=req.page_context,
    )
    return await service.get_kitsune_dialogue(kitsune_req, provider=req.provider, model=req.model)


@router.post("/kitsune/chat", response_model=KitsuneChatResponse)
async def chat_kitsune(
    session: DbSession,
    req: KitsuneChatRequest,
) -> KitsuneChatResponse:
    """Chat interactively with Inari Kitsune the AI calligraphy companion."""
    service = await _build_cultural_service(session)
    return await service.chat_kitsune(req)


