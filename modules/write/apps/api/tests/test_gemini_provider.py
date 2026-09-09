from unittest.mock import AsyncMock

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
from app.providers.ai.gemini import GeminiProvider
from google.genai import errors
from pydantic import BaseModel


class Feedback(BaseModel):
    score: int
    summary: str


def _fake_response(*, text: str = "Hello", usage: object | None = None) -> object:
    response = type("Resp", (), {})()
    response.text = text
    response.usage_metadata = usage
    return response


def _fake_client(monkeypatch, **overrides) -> object:
    client = type("Client", (), {})()
    models = type("Models", (), {})()
    client.aio = type("Aio", (), {"models": models})()
    for name, value in overrides.items():
        setattr(models, name, value)
    monkeypatch.setattr("app.providers.ai.gemini.genai.Client", lambda **kw: client)
    return client


@pytest.fixture
def provider() -> GeminiProvider:
    return GeminiProvider(api_key="test-key")


def test_requires_api_key(provider: GeminiProvider) -> None:
    provider.validate_configuration()
    with pytest.raises(AIConfigurationError):
        GeminiProvider().validate_configuration()


async def test_unconfigured_provider_not_available(provider: GeminiProvider) -> None:
    assert await provider.is_available()
    assert not await GeminiProvider().is_available()


async def test_generate_normalizes_response(monkeypatch, provider: GeminiProvider) -> None:

    usage = type("Usage", (), {})()
    usage.prompt_token_count = 10
    usage.candidates_token_count = 5
    usage.total_token_count = 15
    usage.thoughts_token_count = 2
    _fake_client(
        monkeypatch,
        generate_content=AsyncMock(return_value=_fake_response(text="Xin chào", usage=usage)),
    )
    result = await provider.generate("Viết một câu", system="Bạn là giáo viên")
    assert result.text == "Xin chào"
    assert result.provider == "gemini"
    assert result.model == "gemini-2.5-flash"
    assert result.usage is not None
    assert result.usage.input_tokens == 10
    assert result.usage.output_tokens == 5
    assert result.usage.total_tokens == 15


async def test_generate_passes_model_and_request_args(
    monkeypatch, provider: GeminiProvider
) -> None:

    mock = AsyncMock(return_value=_fake_response())
    _fake_client(monkeypatch, generate_content=mock)
    await provider.generate("x", model="gemini-2.0-flash", temperature=0.5, max_tokens=100)
    call = mock.await_args
    assert call.kwargs["model"] == "gemini-2.0-flash"
    config = call.kwargs["config"]
    assert config.temperature == 0.5
    assert config.max_output_tokens == 100
    assert config.system_instruction is None
    assert config.response_mime_type is None


async def test_generate_structured_uses_schema(monkeypatch, provider: GeminiProvider) -> None:

    mock = AsyncMock(return_value=_fake_response(text='{"score": 4, "summary": "hay"}'))
    _fake_client(monkeypatch, generate_content=mock)
    parsed, result = await provider.generate_structured("Đánh giá", Feedback)
    assert isinstance(parsed, Feedback)
    assert parsed.score == 4
    config = mock.await_args.kwargs["config"]
    assert config.response_mime_type == "application/json"
    assert config.response_schema["type"] == "object"


async def test_generate_structured_invalid_json(monkeypatch, provider: GeminiProvider) -> None:

    _fake_client(monkeypatch, generate_content=AsyncMock(return_value=_fake_response(text="oops")))
    with pytest.raises(AIResponseError):
        await provider.generate_structured("x", Feedback)


def _client_error(status: int) -> errors.ClientError:
    return errors.ClientError(
        status,
        {"error": {"message": f"boom {status}"}},
        response=httpx.Response(
            status, request=httpx.Request("POST", "http://generativelanguage.googleapis.com")
        ),
    )


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
    monkeypatch, provider: GeminiProvider, status: int, error_class: type
) -> None:

    mock = AsyncMock(side_effect=_client_error(status))
    _fake_client(monkeypatch, generate_content=mock)
    with pytest.raises(error_class):
        await provider.generate("x")


async def test_timeout_mapping(monkeypatch, provider: GeminiProvider) -> None:

    _fake_client(
        monkeypatch,
        generate_content=AsyncMock(side_effect=httpx.TimeoutException("slow")),
    )
    with pytest.raises(AITimeoutError):
        await provider.generate("x")


async def test_connection_error_mapping(monkeypatch, provider: GeminiProvider) -> None:

    _fake_client(
        monkeypatch,
        generate_content=AsyncMock(side_effect=httpx.ConnectError("down")),
    )
    with pytest.raises(AIProviderUnavailableError):
        await provider.generate("x")


async def test_stream_emits_chunks_and_final(monkeypatch, provider: GeminiProvider) -> None:

    usage = type("Usage", (), {})()
    usage.prompt_token_count = 3
    usage.candidates_token_count = 2
    usage.total_token_count = 5
    usage.thoughts_token_count = None

    async def _stream():
        yield _fake_response(text="Kon")
        yield _fake_response(text="nichiwa", usage=usage)

    _fake_client(monkeypatch, generate_content_stream=AsyncMock(return_value=_stream()))
    chunks = [chunk async for chunk in provider.stream("hi")]
    assert chunks[0].text == "Kon"
    assert not chunks[0].is_final
    assert chunks[1].is_final
    assert chunks[1].usage is not None
    assert chunks[1].usage.total_tokens == 5


async def test_list_models(monkeypatch, provider: GeminiProvider) -> None:
    model = type("Model", (), {})()
    model.name = "models/gemini-2.5-flash"
    model.display_name = "Gemini 2.5 Flash"
    model.supported_generation_methods = ["generateContent"]
    model2 = type("Model", (), {})()
    model2.name = "models/embedding-001"
    model2.display_name = "Embedding"
    model2.supported_generation_methods = ["embedContent"]

    async def _list():
        yield model
        yield model2

    _fake_client(monkeypatch, list=_list)
    models = await provider.list_models()
    assert [m.id for m in models] == ["gemini-2.5-flash"]
    assert models[0].display_name == "Gemini 2.5 Flash"


async def test_list_models_with_supported_actions(monkeypatch, provider: GeminiProvider) -> None:
    model1 = type("Model", (), {})()
    model1.name = "models/gemini-2.5-flash"
    model1.display_name = "Gemini 2.5 Flash"
    model1.supported_actions = ["generateContent"]

    model2 = type("Model", (), {})()
    model2.name = "models/text-embedding-004"
    model2.display_name = "Text Embedding"
    model2.supported_actions = ["embedContent"]

    _fake_client(monkeypatch, list=AsyncMock(return_value=[model1, model2]))
    models = await provider.list_models()
    assert [m.id for m in models] == ["gemini-2.5-flash"]
    assert models[0].display_name == "Gemini 2.5 Flash"


async def test_list_models_unconfigured_raises() -> None:
    with pytest.raises(AIConfigurationError):
        await GeminiProvider().list_models()
