import httpx
import pytest
from app.providers.ai.errors import (
    AIAuthenticationError,
    AIConfigurationError,
    AIInvalidRequestError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AIResponseError,
    AITimeoutError,
)
from app.providers.ai.groq import GroqProvider
from groq import APIConnectionError, APIStatusError, APITimeoutError, RateLimitError
from pydantic import BaseModel


class Feedback(BaseModel):
    score: int
    summary: str


def _completion(*, content: str = "Hello", usage: object | None = None) -> object:
    message = type("Message", (), {"content": content})()
    choice = type("Choice", (), {"message": message})()
    response = type("Completion", (), {"choices": [choice], "usage": usage})()
    return response


def _usage(*, prompt: int = 7, completion: int = 3) -> object:
    usage = type("Usage", (), {})()
    usage.prompt_tokens = prompt
    usage.completion_tokens = completion
    usage.total_tokens = prompt + completion
    return usage


def _fake_client(monkeypatch, **overrides) -> object:
    chat = type("Chat", (), {})()
    completions = type("Completions", (), {})()
    chat.completions = completions
    client = type("Client", (), {"chat": chat, "models": type("Models", (), {})()})()
    for name, value in overrides.items():
        setattr(completions, name, value)
    monkeypatch.setattr("app.providers.ai.groq.AsyncGroq", lambda **kw: client)
    return client


@pytest.fixture
def provider() -> GroqProvider:
    return GroqProvider(api_key="test-key")


def test_requires_api_key(provider: GroqProvider) -> None:
    provider.validate_configuration()
    with pytest.raises(AIConfigurationError):
        GroqProvider().validate_configuration()


async def test_generate_normalizes_response(monkeypatch, provider: GroqProvider) -> None:
    from unittest.mock import AsyncMock

    usage = _usage()
    _fake_client(
        monkeypatch,
        create=AsyncMock(return_value=_completion(content="Xin chào", usage=usage)),
    )
    result = await provider.generate("Viết một câu", system="Bạn là giáo viên")
    assert result.text == "Xin chào"
    assert result.provider == "groq"
    assert result.model == "llama-3.3-70b-versatile"
    assert result.usage is not None
    assert result.usage.input_tokens == 7
    assert result.usage.output_tokens == 3
    assert result.usage.total_tokens == 10


async def test_generate_passes_messages_and_args(monkeypatch, provider: GroqProvider) -> None:
    from unittest.mock import AsyncMock

    mock = AsyncMock(return_value=_completion())
    _fake_client(monkeypatch, create=mock)
    await provider.generate("x", system="sys", temperature=0.5, max_tokens=64)
    call = mock.await_args
    assert call.kwargs["model"] == "llama-3.3-70b-versatile"
    assert call.kwargs["temperature"] == 0.5
    assert call.kwargs["max_tokens"] == 64
    assert call.kwargs["messages"] == [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "x"},
    ]


async def test_generate_structured_uses_json_object(monkeypatch, provider: GroqProvider) -> None:
    from unittest.mock import AsyncMock

    mock = AsyncMock(return_value=_completion(content='{"score": 4, "summary": "hay"}'))
    _fake_client(monkeypatch, create=mock)
    parsed, result = await provider.generate_structured("Đánh giá", Feedback)
    assert isinstance(parsed, Feedback)
    assert parsed.score == 4
    assert mock.await_args.kwargs["response_format"] == {"type": "json_object"}


async def test_generate_structured_invalid_json(monkeypatch, provider: GroqProvider) -> None:
    from unittest.mock import AsyncMock

    _fake_client(monkeypatch, create=AsyncMock(return_value=_completion(content="nope")))
    with pytest.raises(AIResponseError):
        await provider.generate_structured("x", Feedback)


def _status_error(status: int, message: str = "boom"):
    response = httpx.Response(status, request=httpx.Request("POST", "http://x"))
    if status == 429:
        return RateLimitError(message, response=response, body=None)
    return APIStatusError(message, response=response, body=None)


@pytest.mark.parametrize(
    ("status", "error_class"),
    [
        (401, AIAuthenticationError),
        (403, AIAuthenticationError),
        (429, AIRateLimitError),
        (400, AIInvalidRequestError),
        (500, AIProviderUnavailableError),
        (503, AIProviderUnavailableError),
    ],
)
async def test_error_mapping(
    monkeypatch, provider: GroqProvider, status: int, error_class: type
) -> None:
    from unittest.mock import AsyncMock

    error = _status_error(status)
    _fake_client(monkeypatch, create=AsyncMock(side_effect=error))
    with pytest.raises(error_class):
        await provider.generate("x")


async def test_timeout_and_connection_errors(monkeypatch, provider: GroqProvider) -> None:
    from unittest.mock import AsyncMock

    request = httpx.Request("POST", "http://x")
    _fake_client(monkeypatch, create=AsyncMock(side_effect=APITimeoutError(request=request)))
    with pytest.raises(AITimeoutError):
        await provider.generate("x")

    _fake_client(
        monkeypatch,
        create=AsyncMock(side_effect=APIConnectionError(message="down", request=request)),
    )
    with pytest.raises(AIProviderUnavailableError):
        await provider.generate("x")


async def test_stream_emits_chunks_and_final(monkeypatch, provider: GroqProvider) -> None:
    from unittest.mock import AsyncMock

    async def _stream():
        chunk1 = type("Chunk", (), {})()
        chunk1.choices = [type("Choice", (), {"delta": type("Delta", (), {"content": "Kon"})()})]
        chunk1.usage = None
        chunk2 = type("Chunk", (), {})()
        chunk2.choices = []
        chunk2.usage = _usage()
        yield chunk1
        yield chunk2

    _fake_client(monkeypatch, create=AsyncMock(return_value=_stream()))
    chunks = [chunk async for chunk in provider.stream("hi")]
    assert chunks[0].text == "Kon"
    assert not chunks[0].is_final
    assert chunks[1].is_final
    assert chunks[1].usage is not None
    assert chunks[1].usage.total_tokens == 10


async def test_list_models(monkeypatch, provider: GroqProvider) -> None:
    from unittest.mock import AsyncMock

    model = type("Model", (), {})()
    model.id = "llama-3.3-70b-versatile"
    model.owned_by = "groq"
    response = type("List", (), {"data": [model]})()
    client = _fake_client(monkeypatch)
    client.models.list = AsyncMock(return_value=response)
    models = await provider.list_models()
    assert models[0].id == "llama-3.3-70b-versatile"
    assert models[0].owned_by == "groq"


async def test_list_models_unconfigured_raises() -> None:
    with pytest.raises(AIConfigurationError):
        await GroqProvider().list_models()
