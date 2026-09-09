"""Ollama provider backed by the official ollama python package.

SDK usage is fully isolated in this module; the rest of the application only
sees the normalized AIProvider interface. Ollama always has a default host
(localhost), so it is always "configured"; availability depends on whether
the local server actually answers.
"""

import json
from collections.abc import AsyncIterator
from typing import Any, ClassVar

import httpx
from ollama import AsyncClient, ResponseError
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
    AIError,
    AIProviderUnavailableError,
    AIResponseError,
    AITimeoutError,
    map_http_status,
)
from app.providers.ai.redaction import redact_message
from app.providers.ai.structured import validate_structured

DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434"


class OllamaProvider(AIProvider):
    """Local Ollama server (https://ollama.com)."""

    name = "ollama"
    capabilities = AICapabilities()
    _default_model_fallback: ClassVar[str] = "llama3.2"

    def __init__(
        self,
        *,
        base_url: str = "",
        default_model: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self._base_url = base_url.strip() or DEFAULT_OLLAMA_HOST
        self._default_model = default_model or self._default_model_fallback
        self._timeout = timeout

    @property
    def default_model(self) -> str:
        return self._default_model

    def validate_configuration(self) -> None:
        pass

    async def is_available(self) -> bool:
        try:
            await self._client(timeout=1.5).list()
            return True
        except Exception:
            return False

    def _client(self, *, timeout: float | None = None) -> AsyncClient:
        return AsyncClient(host=self._base_url, timeout=timeout or self._timeout)

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
        if isinstance(exc, ResponseError):
            if exc.status_code is not None:
                return map_http_status(
                    exc.status_code, redact_message(str(exc)), provider="ollama", model=model
                )
            return AIProviderUnavailableError(
                redact_message(str(exc)), provider="ollama", model=model
            )
        if isinstance(exc, httpx.TimeoutException):
            return AITimeoutError("Ollama request timed out", provider="ollama", model=model)
        if isinstance(exc, httpx.HTTPError):
            return AIProviderUnavailableError(
                redact_message(f"Ollama connection failed: {exc}"),
                provider="ollama",
                model=model,
            )
        if isinstance(exc, AIError):
            return exc
        return AIResponseError(
            redact_message(f"Ollama API error: {exc}"), provider="ollama", model=model
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
        options: dict[str, Any] = {}
        if temperature is not None:
            options["temperature"] = temperature
        if max_tokens is not None:
            options["num_predict"] = max_tokens
        try:
            response = await self._client().chat(
                model=resolved_model,
                messages=self._messages(system, prompt),
                stream=False,
                options=options,
            )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc
        text = response.message.content or ""
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
        options: dict[str, Any] = {}
        if temperature is not None:
            options["temperature"] = temperature
        schema_hint = json.dumps(response_model.model_json_schema(), ensure_ascii=False)
        structured_system = "\n".join(
            part
            for part in (
                system,
                "Respond with a single JSON object matching exactly this JSON schema:",
                schema_hint,
                "Do not include markdown, explanations or text outside the JSON object.",
            )
            if part
        )
        try:
            response = await self._client().chat(
                model=resolved_model,
                messages=self._messages(structured_system, prompt),
                stream=False,
                format="json",
                options=options,
            )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc
        text = response.message.content or ""
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
            stream = await self._client().chat(
                model=resolved_model,
                messages=self._messages(system, prompt),
                stream=True,
            )
            usage: AIUsage | None = None
            async for part in stream:
                if part.done:
                    usage = _usage_from_response(part)
                yield AIStreamChunk(
                    text=part.message.content if part.message else "",
                    provider=self.name,
                    model=resolved_model,
                    is_final=bool(part.done),
                    usage=usage if part.done else None,
                )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc

    async def list_models(self) -> list[AIModelInfo]:
        try:
            response = await self._client(timeout=min(self._timeout, 10.0)).list()
        except Exception as exc:
            raise self._map_error(exc, self._default_model) from exc
        result: list[AIModelInfo] = []
        for model in response.models:
            details = getattr(model, "details", None)
            family = getattr(details, "family", None)
            parameter_size = getattr(details, "parameter_size", None)
            display = " ".join(part for part in (family, parameter_size) if part)
            result.append(
                AIModelInfo(
                    id=model.model,
                    provider=self.name,
                    display_name=display or None,
                )
            )
        return result


def _usage_from_response(response: Any) -> AIUsage | None:
    prompt = getattr(response, "prompt_eval_count", None)
    eval_count = getattr(response, "eval_count", None)
    if prompt is None and eval_count is None:
        return None
    total = (prompt or 0) + (eval_count or 0)
    return AIUsage(input_tokens=prompt, output_tokens=eval_count, total_tokens=total)
