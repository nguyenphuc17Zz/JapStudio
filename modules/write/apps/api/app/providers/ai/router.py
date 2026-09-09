import asyncio
import logging
import time
from collections.abc import AsyncIterator, Callable, Mapping
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.errors import ProviderError
from app.providers.ai.base import (
    AICapabilities,
    AIGenerationResult,
    AIModelInfo,
    AIProvider,
    AIStreamChunk,
)
from app.providers.ai.errors import AIConfigurationError, AIError
from app.providers.ai.fake import FakeAIProvider
from app.providers.ai.gemini import GeminiProvider
from app.providers.ai.groq import GroqProvider
from app.providers.ai.ollama import OllamaProvider

logger = logging.getLogger("app.ai")

ProviderFactory = Callable[[], AIProvider]


@dataclass
class ProviderStatus:
    """Diagnostic view of one registered provider."""

    name: str
    configured: bool
    available: bool
    default_model: str
    capabilities: AICapabilities


class AIRouter:
    """Registry that maps provider names to provider factories.

    Business code selects providers by name (from configuration), never by
    importing Gemini/Groq/Ollama implementations directly.

    Selection priority: explicit request provider -> AI_DEFAULT_PROVIDER.
    Transient failures are retried with exponential backoff; after retries
    are exhausted the fallback chain (AI_FALLBACK_PROVIDERS) is tried.
    Configuration errors of the selected provider always raise immediately:
    permanent misconfiguration is never hidden by retries or fallbacks.
    """

    def __init__(
        self,
        providers: Mapping[str, ProviderFactory] | None = None,
        *,
        default_provider: str | None = None,
        max_retries: int | None = None,
        retry_backoff: float | None = None,
        fallback_providers: list[str] | None = None,
    ) -> None:
        settings = get_settings()
        self._providers: dict[str, ProviderFactory] = dict(providers or {})
        self._default = default_provider or settings.ai_default_provider
        self._max_retries = settings.ai_max_retries if max_retries is None else max_retries
        self._retry_backoff = settings.ai_retry_backoff if retry_backoff is None else retry_backoff
        self._fallbacks = (
            settings.ai_fallback_provider_list if fallback_providers is None else fallback_providers
        )

    def register(self, name: str, factory: ProviderFactory) -> None:
        self._providers[name] = factory

    def unregister(self, name: str) -> None:
        self._providers.pop(name, None)

    def available_providers(self) -> list[str]:
        return sorted(self._providers)

    def get_provider(self, name: str | None = None) -> AIProvider:
        selected = name or self._default
        factory = self._providers.get(selected)
        if factory is None:
            available = ", ".join(self.available_providers()) or "none"
            raise ProviderError(
                f"AI provider '{selected}' is not registered. Available providers: {available}"
            )
        return factory()

    def _resolve_name(self, name: str | None) -> str:
        selected = name or self._default
        if selected not in self._providers:
            available = ", ".join(self.available_providers()) or "none"
            raise ProviderError(
                f"AI provider '{selected}' is not registered. Available providers: {available}"
            )
        return selected

    def _fallback_chain(self, selected: str) -> list[str]:
        return [name for name in self._fallbacks if name != selected and name in self._providers]

    @staticmethod
    def _is_configured(provider: AIProvider) -> bool:
        try:
            provider.validate_configuration()
            return True
        except AIConfigurationError:
            return False

    def _log(
        self,
        *,
        provider: str,
        model: str | None,
        ok: bool,
        duration_ms: int,
        retries: int = 0,
        fallback: bool = False,
        error: AIError | None = None,
    ) -> None:
        if ok:
            logger.info(
                "ai.call provider=%s model=%s ok=true duration_ms=%d retries=%d fallback=%s",
                provider,
                model or "-",
                duration_ms,
                retries,
                fallback,
            )
        else:
            logger.warning(
                "ai.call provider=%s model=%s ok=false duration_ms=%d retries=%d "
                "fallback=%s error=%s",
                provider,
                model or "-",
                duration_ms,
                retries,
                fallback,
                type(error).__name__ if error else "-",
            )

    async def _attempt(
        self,
        factory: ProviderFactory,
        method: str,
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        """Run one provider call, retrying transient failures with backoff."""
        attempt = 0
        while True:
            try:
                provider = factory()
                provider.validate_configuration()
                return await getattr(provider, method)(*args, **kwargs)
            except AIError as exc:
                if not exc.retryable or attempt >= self._max_retries:
                    raise
                attempt += 1
                wait = self._retry_backoff * (2 ** (attempt - 1))
                logger.warning(
                    "ai.retry provider=%s method=%s attempt=%d wait=%.1fs error=%s",
                    exc.provider or "-",
                    method,
                    attempt,
                    wait,
                    type(exc).__name__,
                )
                await asyncio.sleep(wait)

    async def _generate_with_fallback(
        self,
        prompt: str,
        response_model: type[BaseModel] | None,
        *,
        selected: str,
        model: str | None,
        kwargs: dict[str, Any],
    ) -> Any:
        chain = [selected, *self._fallback_chain(selected)]
        last_error: AIError | None = None
        for index, name in enumerate(chain):
            factory = self._providers[name]
            started = time.monotonic()
            try:
                if response_model is None:
                    result = await self._attempt(factory, "generate", prompt, model=model, **kwargs)
                else:
                    result = await self._attempt(
                        factory,
                        "generate_structured",
                        prompt,
                        response_model,
                        model=model,
                        **kwargs,
                    )
                self._log(
                    provider=name,
                    model=model,
                    ok=True,
                    duration_ms=int((time.monotonic() - started) * 1000),
                    fallback=index > 0,
                )
                return result
            except AIError as exc:
                if isinstance(exc, AIConfigurationError) and name == selected:
                    raise
                if isinstance(exc, AIConfigurationError):
                    logger.warning("ai.fallback_skip provider=%s not configured", name)
                    continue
                last_error = exc
                self._log(
                    provider=name,
                    model=model,
                    ok=False,
                    duration_ms=int((time.monotonic() - started) * 1000),
                    fallback=index > 0,
                    error=exc,
                )
                continue
        raise last_error  # type: ignore[misc]

    async def generate(
        self,
        prompt: str,
        *,
        provider: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> AIGenerationResult:
        selected = self._resolve_name(provider)
        self._providers[selected]().validate_configuration()
        return await self._generate_with_fallback(
            prompt, None, selected=selected, model=model, kwargs=kwargs
        )

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
        *,
        provider: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> tuple[BaseModel, AIGenerationResult]:
        selected = self._resolve_name(provider)
        self._providers[selected]().validate_configuration()
        return await self._generate_with_fallback(
            prompt, response_model, selected=selected, model=model, kwargs=kwargs
        )

    def stream(
        self,
        prompt: str,
        *,
        provider: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[AIStreamChunk]:
        selected = self._resolve_name(provider)
        self._providers[selected]().validate_configuration()
        chain = [selected, *self._fallback_chain(selected)]
        return self._stream_chain(chain, prompt, model=model, kwargs=kwargs)

    async def _stream_chain(
        self,
        chain: list[str],
        prompt: str,
        *,
        model: str | None,
        kwargs: dict[str, Any],
    ) -> AsyncIterator[AIStreamChunk]:
        last_error: AIError | None = None
        for index, name in enumerate(chain):
            factory = self._providers[name]
            started = time.monotonic()
            yielded = False
            try:
                async for chunk in self._stream_with_retry(factory, prompt, model=model, **kwargs):
                    yielded = True
                    yield chunk
                self._log(
                    provider=name,
                    model=model,
                    ok=True,
                    duration_ms=int((time.monotonic() - started) * 1000),
                    fallback=index > 0,
                )
                return
            except AIError as exc:
                if isinstance(exc, AIConfigurationError) and name == chain[0]:
                    raise
                if isinstance(exc, AIConfigurationError):
                    logger.warning("ai.fallback_skip provider=%s not configured", name)
                    continue
                if yielded:
                    raise
                last_error = exc
                self._log(
                    provider=name,
                    model=model,
                    ok=False,
                    duration_ms=int((time.monotonic() - started) * 1000),
                    fallback=index > 0,
                    error=exc,
                )
        raise last_error  # type: ignore[misc]

    async def _stream_with_retry(
        self,
        factory: ProviderFactory,
        prompt: str,
        *,
        model: str | None,
        **kwargs: Any,
    ) -> AsyncIterator[AIStreamChunk]:
        attempt = 0
        while True:
            yielded = False
            try:
                provider = factory()
                provider.validate_configuration()
                async for chunk in provider.stream(prompt, model=model, **kwargs):
                    yielded = True
                    yield chunk
                return
            except AIError as exc:
                if yielded or not exc.retryable or attempt >= self._max_retries:
                    raise
                attempt += 1
                await asyncio.sleep(self._retry_backoff * (2 ** (attempt - 1)))

    async def provider_status(self) -> list[ProviderStatus]:
        async def _check(name: str, factory: ProviderFactory) -> ProviderStatus:
            provider = factory()
            configured = self._is_configured(provider)
            available = False
            if configured:
                try:
                    available = await provider.is_available()
                except Exception:
                    available = False
            return ProviderStatus(
                name=name,
                configured=configured,
                available=available,
                default_model=provider.default_model,
                capabilities=provider.capabilities,
            )

        tasks = [_check(name, self._providers[name]) for name in sorted(self._providers)]
        return list(await asyncio.gather(*tasks))

    async def list_models(self, provider: str | None = None) -> list[AIModelInfo]:
        selected = self._resolve_name(provider)
        provider_obj = self._providers[selected]()
        provider_obj.validate_configuration()
        return await provider_obj.list_models()


def create_default_router(settings: Settings | None = None) -> AIRouter:
    """Default registry: gemini, groq and ollama; fake only in test env."""
    resolved = settings or get_settings()
    router = AIRouter(
        default_provider=resolved.ai_default_provider,
        max_retries=resolved.ai_max_retries,
        retry_backoff=resolved.ai_retry_backoff,
        fallback_providers=resolved.ai_fallback_provider_list,
    )
    # Strict: fake provider only registered in test environment (or explicit override)
    if resolved.is_test:
        router.register(FakeAIProvider.name, lambda: FakeAIProvider())
    router.register(
        GeminiProvider.name,
        lambda: GeminiProvider(
            api_key=resolved.gemini_api_key,
            default_model=resolved.gemini_default_model,
            timeout=resolved.ai_request_timeout,
        ),
    )
    router.register(
        GroqProvider.name,
        lambda: GroqProvider(
            api_key=resolved.groq_api_key,
            default_model=resolved.groq_default_model,
            timeout=resolved.ai_request_timeout,
        ),
    )
    router.register(
        OllamaProvider.name,
        lambda: OllamaProvider(
            base_url=resolved.ollama_base_url,
            default_model=resolved.ollama_default_model,
            timeout=resolved.ai_request_timeout,
        ),
    )
    return router
