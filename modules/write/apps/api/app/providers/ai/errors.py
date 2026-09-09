"""AI error hierarchy.

All provider errors are normalized into this hierarchy so the router and
business services can react consistently (retry, fallback, HTTP mapping).
Every error subclasses AppError, so the existing exception envelope handler
in app.core.errors applies without changes.
"""

from typing import Any

from app.core.errors import AppError


class AIError(AppError):
    """Base class for every AI provider error."""

    code = "ai_error"
    status_code = 500
    retryable = False

    def __init__(
        self,
        message: str,
        *,
        provider: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(message, **kwargs)
        self.provider = provider
        self.model = model

    def __str__(self) -> str:
        where = f" [{self.provider}]" if self.provider else ""
        return f"{super().__str__()}{where}"


class AIConfigurationError(AIError):
    """Provider missing/invalid configuration (missing key, bad URL, ...)."""

    status_code = 500
    code = "ai_configuration_error"
    retryable = False


class AIAuthenticationError(AIError):
    """API key rejected by the provider."""

    status_code = 502
    code = "ai_authentication_error"
    retryable = False


class AIRateLimitError(AIError):
    """Provider returned a rate-limit / quota error (429)."""

    status_code = 429
    code = "ai_rate_limit_error"
    retryable = True


class AITimeoutError(AIError):
    """Request exceeded the configured timeout."""

    status_code = 504
    code = "ai_timeout_error"
    retryable = True


class AIProviderUnavailableError(AIError):
    """Provider unreachable or returned a server error (5xx, connection refused)."""

    status_code = 503
    code = "ai_provider_unavailable_error"
    retryable = True


class AIInvalidRequestError(AIError):
    """Request rejected by the provider (400-class, bad payload)."""

    status_code = 400
    code = "ai_invalid_request_error"
    retryable = False


class AIResponseError(AIError):
    """Provider returned something we could not parse or validate."""

    status_code = 502
    code = "ai_response_error"
    retryable = False


class AIUnsupportedFeatureError(AIError):
    """Provider does not support the requested capability (e.g. structured output)."""

    status_code = 501
    code = "ai_unsupported_feature_error"
    retryable = False


def map_http_status(
    status: int,
    message: str,
    *,
    provider: str,
    model: str | None = None,
) -> AIError:
    """Map an HTTP status code from any provider SDK onto the AIError hierarchy."""
    if status in (401, 403):
        return AIAuthenticationError(message, provider=provider, model=model)
    if status == 429:
        return AIRateLimitError(message, provider=provider, model=model)
    if status in (400, 404, 422):
        return AIInvalidRequestError(message, provider=provider, model=model)
    if status >= 500:
        return AIProviderUnavailableError(message, provider=provider, model=model)
    return AIResponseError(message, provider=provider, model=model)
