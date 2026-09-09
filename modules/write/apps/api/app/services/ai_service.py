from collections.abc import AsyncIterator
from typing import Any

from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.providers.ai import AIGenerationResult
from app.providers.ai.base import AIModelInfo, AIStreamChunk
from app.providers.ai.router import AIRouter, ProviderStatus, create_default_router


class AIService:
    """Business-facing wrapper around the AI router.

    Services and routers use this class; they never touch providers directly.
    """

    def __init__(
        self,
        ai_router: AIRouter | None = None,
        settings: Settings | None = None,
    ) -> None:
        resolved = settings or get_settings()
        self._router = ai_router or create_default_router(resolved)

    @property
    def available_providers(self) -> list[str]:
        return self._router.available_providers()

    async def provider_status(self) -> list[ProviderStatus]:
        return await self._router.provider_status()

    async def list_models(self, provider: str | None = None) -> list[AIModelInfo]:
        return await self._router.list_models(provider)

    async def generate_text(
        self,
        prompt: str,
        *,
        system: str | None = None,
        provider: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> AIGenerationResult:
        return await self._router.generate(
            prompt, system=system, provider=provider, model=model, **kwargs
        )

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
        *,
        system: str | None = None,
        provider: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> tuple[BaseModel, AIGenerationResult]:
        return await self._router.generate_structured(
            prompt, response_model, system=system, provider=provider, model=model, **kwargs
        )

    def stream_text(
        self,
        prompt: str,
        *,
        system: str | None = None,
        provider: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[AIStreamChunk]:
        return self._router.stream(prompt, system=system, provider=provider, model=model, **kwargs)
