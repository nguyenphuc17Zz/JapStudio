import httpx
import pytest
from app.providers.ai.errors import (
    AIAuthenticationError,
    AIInvalidRequestError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AIResponseError,
    AITimeoutError,
)
from app.providers.ai.ollama import DEFAULT_OLLAMA_HOST, OllamaProvider
from ollama import ResponseError
from pydantic import BaseModel


class Feedback(BaseModel):
    score: int
    summary: str


def _chat_response(
    *, content: str = "Hello", done: bool = True, prompt: int = 7, eval: int = 3
) -> object:
    message = type("Message", (), {"content": content})()
    response = type("Chat", (), {"message": message, "done": done})()
    response.prompt_eval_count = prompt
    response.eval_count = eval
    return response


def _fake_client(monkeypatch, chat_result=None, list_result=None) -> object:
    client = type("Client", (), {})()
    if chat_result is not None:
        client.chat = chat_result
    if list_result is not None:
        client.list = list_result
    monkeypatch.setattr("app.providers.ai.ollama.AsyncClient", lambda **kw: client)
    return client


@pytest.fixture
def provider() -> OllamaProvider:
    return OllamaProvider()


def test_default_host_and_configured(provider: OllamaProvider) -> None:
    provider.validate_configuration()
    assert provider.default_model == "llama3.2"


def test_custom_base_url() -> None:
    assert (
        OllamaProvider(base_url="http://192.168.1.5:11434")._base_url == "http://192.168.1.5:11434"
    )
    assert OllamaProvider(base_url="")._base_url == DEFAULT_OLLAMA_HOST


async def test_is_available_probes_server(monkeypatch, provider: OllamaProvider) -> None:
    from unittest.mock import AsyncMock

    _fake_client(monkeypatch, list_result=AsyncMock(return_value=object()))
    assert await provider.is_available()

    _fake_client(monkeypatch, list_result=AsyncMock(side_effect=httpx.ConnectError("down")))
    assert not await provider.is_available()


async def test_generate_normalizes_response(monkeypatch, provider: OllamaProvider) -> None:
    from unittest.mock import AsyncMock

    mock = AsyncMock(return_value=_chat_response(content="Xin chào"))
    _fake_client(monkeypatch, chat_result=mock)
    result = await provider.generate("Viết một câu", system="Bạn là giáo viên")
    assert result.text == "Xin chào"
    assert result.provider == "ollama"
    assert result.usage is not None
    assert result.usage.input_tokens == 7
    assert result.usage.output_tokens == 3
    assert result.usage.total_tokens == 10


async def test_generate_passes_messages_and_options(monkeypatch, provider: OllamaProvider) -> None:
    from unittest.mock import AsyncMock

    mock = AsyncMock(return_value=_chat_response())
    _fake_client(monkeypatch, chat_result=mock)
    await provider.generate("x", system="sys", temperature=0.5, max_tokens=64)
    call = mock.await_args
    assert call.kwargs["model"] == "llama3.2"
    assert call.kwargs["options"] == {"temperature": 0.5, "num_predict": 64}
    assert call.kwargs["messages"] == [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "x"},
    ]
    assert call.kwargs["stream"] is False


async def test_generate_structured_uses_json_format(monkeypatch, provider: OllamaProvider) -> None:
    from unittest.mock import AsyncMock

    mock = AsyncMock(return_value=_chat_response(content='{"score": 4, "summary": "hay"}'))
    _fake_client(monkeypatch, chat_result=mock)
    parsed, result = await provider.generate_structured("Đánh giá", Feedback)
    assert isinstance(parsed, Feedback)
    assert parsed.score == 4
    assert mock.await_args.kwargs["format"] == "json"


async def test_generate_structured_invalid_json(monkeypatch, provider: OllamaProvider) -> None:
    from unittest.mock import AsyncMock

    _fake_client(monkeypatch, chat_result=AsyncMock(return_value=_chat_response(content="nope")))
    with pytest.raises(AIResponseError):
        await provider.generate_structured("x", Feedback)


@pytest.mark.parametrize(
    ("status", "error_class"),
    [
        (401, AIAuthenticationError),
        (429, AIRateLimitError),
        (400, AIInvalidRequestError),
        (500, AIProviderUnavailableError),
    ],
)
async def test_error_mapping(
    monkeypatch, provider: OllamaProvider, status: int, error_class: type
) -> None:
    from unittest.mock import AsyncMock

    _fake_client(
        monkeypatch,
        chat_result=AsyncMock(side_effect=ResponseError("boom", status)),
    )
    with pytest.raises(error_class):
        await provider.generate("x")


async def test_timeout_and_connection_errors(monkeypatch, provider: OllamaProvider) -> None:
    from unittest.mock import AsyncMock

    _fake_client(monkeypatch, chat_result=AsyncMock(side_effect=httpx.TimeoutException("slow")))
    with pytest.raises(AITimeoutError):
        await provider.generate("x")

    _fake_client(monkeypatch, chat_result=AsyncMock(side_effect=httpx.ConnectError("down")))
    with pytest.raises(AIProviderUnavailableError):
        await provider.generate("x")


async def test_stream_emits_chunks_and_final(monkeypatch, provider: OllamaProvider) -> None:
    from unittest.mock import AsyncMock

    async def _stream():
        yield _chat_response(content="Kon", done=False, prompt=0, eval=0)
        yield _chat_response(content="nichiwa", done=True)

    _fake_client(monkeypatch, chat_result=AsyncMock(return_value=_stream()))
    chunks = [chunk async for chunk in provider.stream("hi")]
    assert chunks[0].text == "Kon"
    assert not chunks[0].is_final
    assert chunks[1].text == "nichiwa"
    assert chunks[1].is_final
    assert chunks[1].usage is not None
    assert chunks[1].usage.total_tokens == 10


async def test_list_models(monkeypatch, provider: OllamaProvider) -> None:
    from unittest.mock import AsyncMock

    details = type("Details", (), {"family": "llama", "parameter_size": "8B"})()
    model = type("Model", (), {"model": "aya-expanse:8b", "details": details})()
    response = type("List", (), {"models": [model]})()
    client = _fake_client(monkeypatch)
    client.list = AsyncMock(return_value=response)
    models = await provider.list_models()
    assert models[0].id == "aya-expanse:8b"
    assert models[0].display_name == "llama 8B"
