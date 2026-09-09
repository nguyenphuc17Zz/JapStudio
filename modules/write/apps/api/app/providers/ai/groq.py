"""Groq provider backed by the official groq SDK (OpenAI-compatible API).

SDK usage is fully isolated in this module; the rest of the application only
sees the normalized AIProvider interface.
"""

from collections.abc import AsyncIterator
from typing import Any, ClassVar

import httpx
from groq import APIConnectionError, APIStatusError, APITimeoutError, AsyncGroq, RateLimitError
from pydantic import BaseModel

from app.providers.ai.base import (
    AICapabilities,
    AIGenerationResult,
    AIModelInfo,
    AIProvider,
    AIStreamChunk,
    AIUsage,
)
from app.providers.ai.errors import (
    AIConfigurationError,
    AIError,
    AIProviderUnavailableError,
    AIResponseError,
    AITimeoutError,
    map_http_status,
)
from app.providers.ai.redaction import redact_message
from app.providers.ai.structured import validate_structured


class GroqProvider(AIProvider):
    """Groq cloud inference (https://console.groq.com)."""

    name = "groq"
    capabilities = AICapabilities()
    _default_model_fallback: ClassVar[str] = "llama-3.3-70b-versatile"

    def __init__(
        self,
        *,
        api_key: str = "",
        default_model: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self._api_key = api_key
        self._default_model = default_model or self._default_model_fallback
        self._timeout = timeout

    @property
    def default_model(self) -> str:
        return self._default_model

    def validate_configuration(self) -> None:
        if not self._api_key:
            raise AIConfigurationError(
                "Groq is not configured: GROQ_API_KEY is empty", provider=self.name
            )

    async def is_available(self) -> bool:
        return bool(self._api_key)

    def _client(self) -> AsyncGroq:
        return AsyncGroq(api_key=self._api_key, timeout=self._timeout)

    def _resolve_model(self, model: str | None) -> str:
        return model or self._default_model

    @staticmethod
    def _messages(system: str | None, prompt: str) -> list[dict[str, str]]:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        return messages

    @staticmethod
    def _map_error(exc: Exception, model: str) -> Exception:
        if isinstance(exc, RateLimitError):
            return map_http_status(429, redact_message(str(exc)), provider="groq", model=model)
        if isinstance(exc, APIStatusError):
            return map_http_status(
                exc.status_code, redact_message(str(exc)), provider="groq", model=model
            )
        if isinstance(exc, APITimeoutError):
            return AITimeoutError("Groq request timed out", provider="groq", model=model)
        if isinstance(exc, (APIConnectionError, httpx.ConnectError)):
            return AIProviderUnavailableError(
                redact_message(f"Groq connection failed: {exc}"),
                provider="groq",
                model=model,
            )
        if isinstance(exc, AIError):
            return exc
        return AIResponseError(
            redact_message(f"Groq API error: {exc}"), provider="groq", model=model
        )

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AIGenerationResult:
        resolved_model = self._resolve_model(model)
        try:
            response = await self._client().chat.completions.create(
                model=resolved_model,
                messages=self._messages(system, prompt),
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc
        text = response.choices[0].message.content or ""
        return AIGenerationResult(
            text=text,
            provider=self.name,
            model=resolved_model,
            usage=_usage_from_response(response),
            raw=response,
        )

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
        *,
        system: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        **kwargs: Any,
    ) -> tuple[BaseModel, AIGenerationResult]:
        resolved_model = self._resolve_model(model)
        try:
            response = await self._client().chat.completions.create(
                model=resolved_model,
                messages=self._messages(system, prompt),
                temperature=temperature,
                response_format={"type": "json_object"},
            )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc
        text = response.choices[0].message.content or ""
        parsed = validate_structured(text, response_model, provider=self.name, model=resolved_model)
        return parsed, AIGenerationResult(
            text=text,
            provider=self.name,
            model=resolved_model,
            usage=_usage_from_response(response),
            raw=response,
        )

    async def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[AIStreamChunk]:
        resolved_model = self._resolve_model(model)
        try:
            stream = await self._client().chat.completions.create(
                model=resolved_model,
                messages=self._messages(system, prompt),
                stream=True,
            )
            usage: AIUsage | None = None
            async for chunk in stream:
                if chunk.usage is not None:
                    usage = _usage_from_usage(chunk.usage)
                delta = ""
                if chunk.choices:
                    delta = chunk.choices[0].delta.content or ""
                yield AIStreamChunk(
                    text=delta,
                    provider=self.name,
                    model=resolved_model,
                    is_final=not chunk.choices and chunk.usage is not None,
                    usage=usage if (not chunk.choices and chunk.usage is not None) else None,
                )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc

    async def list_models(self) -> list[AIModelInfo]:
        self.validate_configuration()
        try:
            response = await self._client().models.list()
        except Exception as exc:
            raise self._map_error(exc, self._default_model) from exc
        return [
            AIModelInfo(id=model.id, provider=self.name, owned_by=model.owned_by)
            for model in response.data
        ]


def _usage_from_usage(usage: Any) -> AIUsage:
    return AIUsage(
        input_tokens=getattr(usage, "prompt_tokens", None),
        output_tokens=getattr(usage, "completion_tokens", None),
        total_tokens=getattr(usage, "total_tokens", None),
    )


def _usage_from_response(response: Any) -> AIUsage | None:
    return _usage_from_usage(response.usage) if response.usage is not None else None
