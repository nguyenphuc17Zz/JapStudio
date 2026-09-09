from unittest.mock import AsyncMock

import pytest
from app.core.errors import ProviderError
from app.providers.ai.base import AIStreamChunk
from app.providers.ai.errors import (
    AIAuthenticationError,
    AIConfigurationError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AITimeoutError,
)
from app.providers.ai.fake import FakeAIProvider
from app.providers.ai.router import AIRouter
from pydantic import BaseModel


def _failing_router(
    mode: str,
    *,
    default: str = "fake",
    fallbacks: list[str] | None = None,
    max_retries: int = 2,
    retry_backoff: float = 0.0,
) -> tuple[AIRouter, dict[str, int]]:
    counter: dict[str, int] = {"calls": 0}

    def fake_factory() -> FakeAIProvider:
        provider = FakeAIProvider(fail_mode=mode)  # type: ignore[arg-type]
        original = provider.generate

        async def wrapped(prompt: str, **kwargs):
            counter["calls"] += 1
            return await original(prompt, **kwargs)

        provider.generate = wrapped
        return provider

    router = AIRouter(
        {"fake": fake_factory, "backup": lambda: FakeAIProvider(seed_text="Backup")},
        default_provider=default,
        max_retries=max_retries,
        retry_backoff=retry_backoff,
        fallback_providers=fallbacks or [],
    )
    return router, counter


def test_selection_priority_explicit_provider_over_default() -> None:
    router = AIRouter(
        {
            "fake": FakeAIProvider,
            "backup": lambda: FakeAIProvider(seed_text="Backup"),
        },
        default_provider="fake",
        fallback_providers=[],
    )
    provider = router.get_provider("backup")
    assert isinstance(provider, FakeAIProvider)
    assert provider._seed_text == "Backup"


async def test_model_override_reaches_provider() -> None:
    calls: dict[str, str] = {}

    class ModelAwareProvider(FakeAIProvider):
        async def generate(self, prompt, *, model=None, **kwargs):
            calls["model"] = model
            return await super().generate(prompt, model=model, **kwargs)

    router = AIRouter({"fake": ModelAwareProvider}, default_provider="fake", fallback_providers=[])
    await router.generate("x", model="special-model")
    assert calls["model"] == "special-model"


async def test_transient_error_is_retried_with_backoff(monkeypatch) -> None:
    router, counter = _failing_router("timeout", max_retries=2, retry_backoff=1.0)
    sleeps: list[float] = []
    monkeypatch.setattr(
        "app.providers.ai.router.asyncio.sleep", AsyncMock(side_effect=lambda w: sleeps.append(w))
    )
    with pytest.raises(AITimeoutError):
        await router.generate("x")
    assert counter["calls"] == 3
    assert sleeps == [1.0, 2.0]


async def test_rate_limit_is_retried(monkeypatch) -> None:
    router, counter = _failing_router("rate_limit", max_retries=1, retry_backoff=0.5)
    monkeypatch.setattr("app.providers.ai.router.asyncio.sleep", AsyncMock())
    with pytest.raises(AIRateLimitError):
        await router.generate("x")
    assert counter["calls"] == 2


async def test_permanent_errors_are_not_retried(monkeypatch) -> None:
    router, counter = _failing_router("authentication_error", max_retries=2, retry_backoff=1.0)
    monkeypatch.setattr("app.providers.ai.router.asyncio.sleep", AsyncMock())
    with pytest.raises(AIAuthenticationError):
        await router.generate("x")
    assert counter["calls"] == 1


async def test_fallback_chain_after_retries_exhausted(monkeypatch) -> None:
    router, counter = _failing_router(
        "rate_limit", max_retries=1, retry_backoff=0.0, fallbacks=["backup"]
    )
    monkeypatch.setattr("app.providers.ai.router.asyncio.sleep", AsyncMock())
    result = await router.generate("x")
    assert result.text.startswith("Backup")
    assert counter["calls"] == 2


async def test_unconfigured_fallback_is_skipped() -> None:
    router = AIRouter(
        {
            "fake": lambda: FakeAIProvider(fail_mode="unavailable"),
            "gemini": lambda: FakeAIProvider(fail_mode="configuration_error"),
        },
        default_provider="fake",
        max_retries=0,
        retry_backoff=0.0,
        fallback_providers=["gemini"],
    )
    with pytest.raises(AIProviderUnavailableError):
        await router.generate("x")


async def test_selected_provider_config_error_raises_immediately() -> None:
    router = AIRouter(
        {
            "fake": lambda: FakeAIProvider(fail_mode="configuration_error"),
            "backup": lambda: FakeAIProvider(seed_text="Backup"),
        },
        default_provider="fake",
        max_retries=2,
        retry_backoff=1.0,
        fallback_providers=["backup"],
    )
    with pytest.raises(AIConfigurationError):
        await router.generate("x")


async def test_structured_failure_falls_back() -> None:
    router = AIRouter(
        {
            "fake": lambda: FakeAIProvider(fail_mode="invalid_structured"),
            "backup": FakeAIProvider,
        },
        default_provider="fake",
        max_retries=0,
        retry_backoff=0.0,
        fallback_providers=["backup"],
    )

    class Outline(BaseModel):
        topic: str

    outline, result = await router.generate_structured("Tạo dàn ý", Outline)
    assert isinstance(outline, Outline)
    assert outline.topic == "sample"
    assert result.text == '{"topic": "sample"}'


async def test_stream_falls_back_on_first_chunk_failure() -> None:
    router = AIRouter(
        {
            "fake": lambda: FakeAIProvider(fail_mode="unavailable"),
            "backup": lambda: FakeAIProvider(seed_text="Backup"),
        },
        default_provider="fake",
        max_retries=0,
        retry_backoff=0.0,
        fallback_providers=["backup"],
    )
    chunks = [chunk async for chunk in router.stream("x")]
    assert "".join(chunk.text for chunk in chunks).strip() == "Backup"


async def test_stream_retries_before_fallback(monkeypatch) -> None:
    counter = {"attempts": 0}

    def factory() -> FakeAIProvider:
        provider = FakeAIProvider(fail_mode="unavailable")
        original = provider.stream

        async def wrapped(prompt: str, **kwargs):
            counter["attempts"] += 1
            async for chunk in original(prompt, **kwargs):
                yield chunk

        provider.stream = wrapped
        return provider

    router = AIRouter(
        {"fake": factory, "backup": lambda: FakeAIProvider(seed_text="Backup")},
        default_provider="fake",
        max_retries=1,
        retry_backoff=0.0,
        fallback_providers=["backup"],
    )
    monkeypatch.setattr("app.providers.ai.router.asyncio.sleep", AsyncMock())
    chunks = [chunk async for chunk in router.stream("x")]
    assert "".join(chunk.text for chunk in chunks).strip() == "Backup"
    assert counter["attempts"] == 2


async def test_stream_does_not_retry_after_partial_output() -> None:
    class PartialProvider(FakeAIProvider):
        async def stream(self, prompt, **kwargs):
            yield AIStreamChunk(text="partial ", provider="fake", model="m")
            raise AITimeoutError("mid-stream", provider="fake")

    router = AIRouter(
        {"fake": PartialProvider, "backup": FakeAIProvider},
        default_provider="fake",
        max_retries=3,
        retry_backoff=0.0,
        fallback_providers=["backup"],
    )
    chunks = []
    with pytest.raises(AITimeoutError):
        async for chunk in router.stream("x"):
            chunks.append(chunk)
    assert "".join(chunk.text for chunk in chunks) == "partial "


async def test_provider_status(monkeypatch) -> None:
    router, _ = _failing_router("rate_limit", fallbacks=["backup"])
    statuses = await router.provider_status()
    names = [status.name for status in statuses]
    assert names == ["backup", "fake"]
    by_name = {status.name: status for status in statuses}
    assert by_name["fake"].configured
    assert by_name["fake"].available
    assert by_name["fake"].default_model == "fake-model"
    assert by_name["fake"].capabilities.generate


async def test_unknown_provider_raises() -> None:
    router = AIRouter({"fake": FakeAIProvider}, default_provider="fake")
    with pytest.raises(ProviderError):
        await router.generate("x", provider="gemini")
