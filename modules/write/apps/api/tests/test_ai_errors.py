import pytest
from app.providers.ai.errors import (
    AIAuthenticationError,
    AIConfigurationError,
    AIError,
    AIInvalidRequestError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AIResponseError,
    AITimeoutError,
    AIUnsupportedFeatureError,
    map_http_status,
)
from app.providers.ai.fake import FakeAIProvider
from pydantic import BaseModel


def test_error_hierarchy_membership() -> None:
    for error_class in (
        AIConfigurationError,
        AIAuthenticationError,
        AIRateLimitError,
        AITimeoutError,
        AIProviderUnavailableError,
        AIInvalidRequestError,
        AIResponseError,
        AIUnsupportedFeatureError,
    ):
        assert issubclass(error_class, AIError)


def test_retryable_flags() -> None:
    assert AIRateLimitError("x").retryable
    assert AITimeoutError("x").retryable
    assert AIProviderUnavailableError("x").retryable
    assert not AIConfigurationError("x").retryable
    assert not AIAuthenticationError("x").retryable
    assert not AIInvalidRequestError("x").retryable
    assert not AIResponseError("x").retryable
    assert not AIUnsupportedFeatureError("x").retryable


def test_http_status_mapping() -> None:
    assert isinstance(map_http_status(401, "x", provider="gemini"), AIAuthenticationError)
    assert isinstance(map_http_status(403, "x", provider="gemini"), AIAuthenticationError)
    assert isinstance(map_http_status(429, "x", provider="groq"), AIRateLimitError)
    assert isinstance(map_http_status(400, "x", provider="ollama"), AIInvalidRequestError)
    assert isinstance(map_http_status(422, "x", provider="ollama"), AIInvalidRequestError)
    assert isinstance(map_http_status(500, "x", provider="gemini"), AIProviderUnavailableError)
    assert isinstance(map_http_status(503, "x", provider="groq"), AIProviderUnavailableError)
    assert isinstance(map_http_status(300, "x", provider="gemini"), AIResponseError)


def test_error_http_statuses() -> None:
    assert AIConfigurationError("x").status_code == 500
    assert AITimeoutError("x").status_code == 504
    assert AIProviderUnavailableError("x").status_code == 503
    assert AIRateLimitError("x").status_code == 429
    assert AIUnsupportedFeatureError("x").status_code == 501


def test_error_carries_provider_and_model() -> None:
    error = AITimeoutError("boom", provider="gemini", model="gemini-2.5-flash")
    assert error.provider == "gemini"
    assert error.model == "gemini-2.5-flash"
    assert "gemini" in str(error)


@pytest.mark.parametrize(
    ("mode", "error_class"),
    [
        ("timeout", AITimeoutError),
        ("rate_limit", AIRateLimitError),
        ("unavailable", AIProviderUnavailableError),
        ("authentication_error", AIAuthenticationError),
        ("configuration_error", AIConfigurationError),
    ],
)
async def test_fake_fail_modes_raise(mode: str, error_class: type) -> None:
    provider = FakeAIProvider(fail_mode=mode)  # type: ignore[arg-type]
    with pytest.raises(error_class):
        await provider.generate("x")


async def test_fake_invalid_structured_mode_raises() -> None:
    class Feedback(BaseModel):
        score: int

    provider = FakeAIProvider(fail_mode="invalid_structured")
    with pytest.raises(AIResponseError):
        await provider.generate_structured("x", Feedback)
