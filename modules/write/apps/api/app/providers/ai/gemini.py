"""Gemini provider backed by the official google-genai SDK.

SDK usage is fully isolated in this module; the rest of the application only
sees the normalized AIProvider interface.
"""

from collections.abc import AsyncIterator
import inspect
from typing import Any, ClassVar

import httpx
from google import genai
from google.genai import errors, types
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


def _sanitize_schema_for_gemini(schema: Any) -> Any:
    """Sanitize OpenAPI / JSON Schema dictionary for Google Gemini Developer API.

    Gemini Developer API strictly rejects:
    - `additionalProperties` ("additionalProperties is only supported in Gemini Enterprise Agent Platform mode")
    - `pattern` regex constraints
    - `minLength`, `maxLength`, `minItems`, `maxItems`
    """
    if isinstance(schema, list):
        return [_sanitize_schema_for_gemini(item) for item in schema]
    if not isinstance(schema, dict):
        return schema

    cleaned: dict[str, Any] = {}
    for key, value in schema.items():
        if key in (
            "additionalProperties",
            "pattern",
            "minLength",
            "maxLength",
            "minItems",
            "maxItems",
        ):
            continue
        cleaned[key] = _sanitize_schema_for_gemini(value)

    if cleaned.get("type") == "object" and "properties" not in cleaned:
        cleaned["properties"] = {}

    return cleaned


class GeminiProvider(AIProvider):
    """Google Gemini via google-genai (https://ai.google.dev/gemini-api/docs)."""

    name = "gemini"
    capabilities = AICapabilities()
    _default_model_fallback: ClassVar[str] = "gemini-2.5-flash"

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
                "Gemini is not configured: GEMINI_API_KEY is empty",
                provider=self.name,
            )

    async def is_available(self) -> bool:
        return bool(self._api_key)

    def _client(self) -> genai.Client:
        return genai.Client(
            api_key=self._api_key,
            http_options=types.HttpOptions(timeout=int(self._timeout * 1000)),
        )

    def _resolve_model(self, model: str | None) -> str:
        return model or self._default_model

    @staticmethod
    def _map_error(exc: Exception, model: str) -> Exception:
        if isinstance(exc, errors.ClientError):
            return map_http_status(
                exc.code,
                redact_message(str(exc.message or "Gemini API error")),
                provider="gemini",
                model=model,
            )
        if isinstance(exc, httpx.TimeoutException):
            return AITimeoutError("Gemini request timed out", provider="gemini", model=model)
        if isinstance(exc, httpx.HTTPError):
            return AIProviderUnavailableError(
                redact_message(f"Gemini connection failed: {exc}"),
                provider="gemini",
                model=model,
            )
        if isinstance(exc, AIError):
            return exc
        return AIResponseError(
            redact_message(f"Gemini API error: {exc}"), provider="gemini", model=model
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
            response = await self._client().aio.models.generate_content(
                model=resolved_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc
        return AIGenerationResult(
            text=response.text or "",
            provider=self.name,
            model=resolved_model,
            usage=_usage_from_metadata(response.usage_metadata),
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
        raw_schema = response_model.model_json_schema()
        sanitized_schema = _sanitize_schema_for_gemini(raw_schema)
        try:
            response = await self._client().aio.models.generate_content(
                model=resolved_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    temperature=temperature,
                    response_mime_type="application/json",
                    response_schema=sanitized_schema,
                ),
            )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc
        text = response.text or ""
        parsed = validate_structured(text, response_model, provider=self.name, model=resolved_model)
        return parsed, AIGenerationResult(
            text=text,
            provider=self.name,
            model=resolved_model,
            usage=_usage_from_metadata(response.usage_metadata),
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
            stream = await self._client().aio.models.generate_content_stream(
                model=resolved_model,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=system),
            )
            async for chunk in stream:
                yield AIStreamChunk(
                    text=chunk.text or "",
                    provider=self.name,
                    model=resolved_model,
                    is_final=bool(chunk.usage_metadata),
                    usage=_usage_from_metadata(chunk.usage_metadata),
                )
        except Exception as exc:
            raise self._map_error(exc, resolved_model) from exc

    async def list_models(self) -> list[AIModelInfo]:
        self.validate_configuration()
        try:
            client = self._client()
            result_models: list[AIModelInfo] = []

            try:
                pager_or_gen = client.aio.models.list()
                if inspect.isawaitable(pager_or_gen):
                    pager_or_gen = await pager_or_gen

                if hasattr(pager_or_gen, "__aiter__"):
                    async for model in pager_or_gen:
                        actions = (
                            getattr(model, "supported_actions", None)
                            or getattr(model, "supported_generation_methods", None)
                            or []
                        )
                        if not actions or any(
                            "generate" in str(a).lower()
                            for a in actions
                        ):
                            name = getattr(model, "name", "")
                            clean_id = name.removeprefix("models/") if name else ""
                            if clean_id:
                                result_models.append(
                                    AIModelInfo(
                                        id=clean_id,
                                        provider=self.name,
                                        display_name=getattr(model, "display_name", None) or clean_id,
                                    )
                                )
                elif hasattr(pager_or_gen, "__iter__"):
                    for model in pager_or_gen:
                        actions = (
                            getattr(model, "supported_actions", None)
                            or getattr(model, "supported_generation_methods", None)
                            or []
                        )
                        if not actions or any(
                            "generate" in str(a).lower()
                            for a in actions
                        ):
                            name = getattr(model, "name", "")
                            clean_id = name.removeprefix("models/") if name else ""
                            if clean_id:
                                result_models.append(
                                    AIModelInfo(
                                        id=clean_id,
                                        provider=self.name,
                                        display_name=getattr(model, "display_name", None) or clean_id,
                                    )
                                )
            except Exception:
                import asyncio
                loop = asyncio.get_running_loop()

                def _sync_list() -> list[AIModelInfo]:
                    items: list[AIModelInfo] = []
                    for model in client.models.list():
                        actions = (
                            getattr(model, "supported_actions", None)
                            or getattr(model, "supported_generation_methods", None)
                            or []
                        )
                        if not actions or any(
                            "generate" in str(a).lower()
                            for a in actions
                        ):
                            name = getattr(model, "name", "")
                            clean_id = name.removeprefix("models/") if name else ""
                            if clean_id:
                                items.append(
                                    AIModelInfo(
                                        id=clean_id,
                                        provider=self.name,
                                        display_name=getattr(model, "display_name", None) or clean_id,
                                    )
                                )
                    return items

                result_models = await loop.run_in_executor(None, _sync_list)
        except Exception as exc:
            raise self._map_error(exc, self._default_model) from exc
        return result_models


def _usage_from_metadata(metadata: Any) -> AIUsage | None:
    if metadata is None:
        return None
    prompt = getattr(metadata, "prompt_token_count", None)
    candidates = getattr(metadata, "candidates_token_count", None)
    total = getattr(metadata, "total_token_count", None)
    if prompt is None and candidates is None and total is None:
        return None
    return AIUsage(
        input_tokens=prompt,
        output_tokens=candidates,
        total_tokens=total,
        extra={"thought_tokens": getattr(metadata, "thoughts_token_count", None)},
    )
