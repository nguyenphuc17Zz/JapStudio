"""AI diagnostics and configuration endpoints.

- GET  /api/v1/ai/providers        -> provider status (configured / available)
- GET  /api/v1/ai/providers/config -> masked credential view (never raw keys)
- PUT  /api/v1/ai/providers/config -> persist API keys / base URLs
- GET  /api/v1/ai/models            -> models advertised by configured providers
- POST /api/v1/ai/generate          -> dev/test tooling (disabled in production)

No endpoint ever returns or logs API keys.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.providers.ai.errors import AIError
from app.schemas.ai import (
    AiGenerateRequest,
    AiGenerateResponse,
    ModelInfoSchema,
    ProviderConfigResponse,
    ProviderConfigUpdate,
    ProviderModelsResponse,
    ProviderStatusResponse,
)
from app.services.ai_config_service import AIConfigService, ProviderCredentialView
from app.services.ai_service import AIService

logger = logging.getLogger("app.ai")

router = APIRouter(tags=["ai"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


def _require_not_fake_provider(provider: str | None, settings: Settings) -> None:
    if provider and provider.lower() == "fake" and not settings.is_test:
        raise HTTPException(status_code=404, detail="Provider not found")


def _ai_service(settings: Settings) -> AIService:
    return AIService(settings=settings)


@router.get("/providers", response_model=ProviderStatusResponse)
async def provider_status(
    session: DbSession,
) -> ProviderStatusResponse:
    settings = await AIConfigService().get_effective_settings(session)
    service = _ai_service(settings)
    statuses = await service.provider_status()
    visible_statuses = [
        s for s in statuses if s.name != "fake" or settings.is_test
    ]
    default_provider = settings.ai_default_provider
    if default_provider == "fake" and not settings.is_test:
        for s in visible_statuses:
            if s.available or s.configured:
                default_provider = s.name
                break
        if default_provider == "fake" and visible_statuses:
            default_provider = visible_statuses[0].name

    return ProviderStatusResponse(
        default_provider=default_provider,
        fallback_providers=[p for p in settings.ai_fallback_provider_list if p != "fake" or settings.is_test],
        providers=[
            {
                "name": status.name,
                "configured": status.configured,
                "available": status.available,
                "default_model": status.default_model,
                "capabilities": {
                    "generate": status.capabilities.generate,
                    "generate_structured": status.capabilities.generate_structured,
                    "stream": status.capabilities.stream,
                },
            }
            for status in visible_statuses
        ],
    )


@router.get("/providers/config", response_model=ProviderConfigResponse)
async def provider_config(
    session: DbSession,
) -> dict[str, ProviderCredentialView]:
    return await AIConfigService().get_config_view(session)


@router.put("/providers/config", response_model=ProviderConfigResponse)
async def update_provider_config(
    payload: ProviderConfigUpdate,
    session: DbSession,
) -> dict[str, ProviderCredentialView]:
    service = AIConfigService()
    await service.update(
        session,
        gemini_api_key=payload.gemini_api_key,
        gemini_default_model=payload.gemini_default_model,
        groq_api_key=payload.groq_api_key,
        groq_default_model=payload.groq_default_model,
        ollama_base_url=payload.ollama_base_url,
        ollama_default_model=payload.ollama_default_model,
        default_provider=payload.default_provider,
    )
    return await service.get_config_view(session)


@router.get("/models", response_model=list[ProviderModelsResponse])
async def provider_models(
    session: DbSession,
    provider: str | None = None,
) -> list[ProviderModelsResponse]:
    settings = await AIConfigService().get_effective_settings(session)
    _require_not_fake_provider(provider, settings)
    service = _ai_service(settings)
    responses: list[ProviderModelsResponse] = []
    for status in await service.provider_status():
        if provider and status.name != provider:
            continue
        if status.name == "fake" and not settings.is_test:
            continue
        if not status.configured:
            responses.append(
                ProviderModelsResponse(provider=status.name, models=[], error="not_configured")
            )
            continue
        if not status.available and status.name == "ollama":
            responses.append(
                ProviderModelsResponse(provider=status.name, models=[], error="unavailable")
            )
            continue
        try:
            models = await service.list_models(status.name)
            responses.append(
                ProviderModelsResponse(
                    provider=status.name,
                    models=[
                        ModelInfoSchema(
                            id=model.id,
                            provider=model.provider,
                            display_name=model.display_name,
                            owned_by=model.owned_by,
                        )
                        for model in models
                    ],
                )
            )
        except AIError as exc:
            logger.warning("ai.models provider=%s failed: %s", status.name, type(exc).__name__)
            responses.append(
                ProviderModelsResponse(provider=status.name, models=[], error=exc.code)
            )
    return responses


@router.post("/generate", response_model=AiGenerateResponse)
async def generate_text(
    payload: AiGenerateRequest,
    session: DbSession,
) -> AiGenerateResponse:
    settings = get_settings()
    if settings.app_env.lower() == "production":
        raise HTTPException(status_code=404, detail="Not found")
    _require_not_fake_provider(payload.provider, settings)
    effective = await AIConfigService().get_effective_settings(session)
    result = await _ai_service(effective).generate_text(
        payload.prompt,
        system=payload.system,
        provider=payload.provider,
        model=payload.model,
        temperature=payload.temperature,
    )
    return AiGenerateResponse(
        text=result.text,
        provider=result.provider,
        model=result.model,
        usage=result.usage,
    )
