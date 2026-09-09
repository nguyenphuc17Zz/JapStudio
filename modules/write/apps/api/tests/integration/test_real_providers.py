"""Optional integration tests against real providers.

Skipped unless the matching RUN_*_INTEGRATION environment variable is 'true':
    RUN_GEMINI_INTEGRATION=true pytest tests/integration
    RUN_GROQ_INTEGRATION=true pytest tests/integration
    RUN_OLLAMA_INTEGRATION=true pytest tests/integration

These tests require real credentials / servers and make network calls, so
they are never run by the default test suite.
"""

import os

import pytest
from app.core.config import get_settings
from app.providers.ai.gemini import GeminiProvider
from app.providers.ai.groq import GroqProvider
from app.providers.ai.ollama import OllamaProvider
from pydantic import BaseModel

RUN_GEMINI = os.environ.get("RUN_GEMINI_INTEGRATION") == "true"
RUN_GROQ = os.environ.get("RUN_GROQ_INTEGRATION") == "true"
RUN_OLLAMA = os.environ.get("RUN_OLLAMA_INTEGRATION") == "true"

pytestmark = [
    pytest.mark.skipif(
        not (RUN_GEMINI or RUN_GROQ or RUN_OLLAMA),
        reason="integration tests opt-in: set RUN_*_INTEGRATION=true",
    )
]


class Feedback(BaseModel):
    score: int
    summary: str


async def _check_provider(provider, name: str) -> None:
    provider.validate_configuration()
    result = await provider.generate("Say exactly: integration-ok", max_tokens=32)
    assert result.provider == name
    assert result.text
    parsed, structured = await provider.generate_structured(
        "Grade this essay: がんばりました", Feedback, max_tokens=256
    )
    assert isinstance(parsed, Feedback)
    assert structured.text
    models = await provider.list_models()
    assert models


@pytest.mark.skipif(not RUN_GEMINI, reason="RUN_GEMINI_INTEGRATION not set")
async def test_gemini_integration() -> None:
    settings = get_settings()
    await _check_provider(
        GeminiProvider(
            api_key=settings.gemini_api_key,
            default_model=settings.gemini_default_model,
            timeout=settings.ai_request_timeout,
        ),
        "gemini",
    )


@pytest.mark.skipif(not RUN_GROQ, reason="RUN_GROQ_INTEGRATION not set")
async def test_groq_integration() -> None:
    settings = get_settings()
    await _check_provider(
        GroqProvider(
            api_key=settings.groq_api_key,
            default_model=settings.groq_default_model,
            timeout=settings.ai_request_timeout,
        ),
        "groq",
    )


@pytest.mark.skipif(not RUN_OLLAMA, reason="RUN_OLLAMA_INTEGRATION not set")
async def test_ollama_integration() -> None:
    settings = get_settings()
    await _check_provider(
        OllamaProvider(
            base_url=settings.ollama_base_url,
            default_model=settings.ollama_default_model,
            timeout=max(settings.ai_request_timeout, 120.0),
        ),
        "ollama",
    )
