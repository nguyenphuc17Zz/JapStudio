import pytest
from app.core.errors import ProviderError
from app.providers.ai import AIProvider, FakeAIProvider
from app.providers.ai.router import AIRouter, create_default_router
from app.services.ai_service import AIService
from pydantic import BaseModel


def test_provider_interface_cannot_be_instantiated() -> None:
    with pytest.raises(TypeError):
        AIProvider()


async def test_fake_provider_generate() -> None:
    provider = FakeAIProvider()
    result = await provider.generate("Viết về Tokyo", system="Bạn là giáo viên tiếng Nhật")
    assert result.provider == "fake"
    assert result.model == "fake-model"
    assert "Viết về Tokyo" in result.text
    assert result.usage is not None


async def test_fake_provider_generate_structured() -> None:
    class Feedback(BaseModel):
        score: int
        summary: str

    provider = FakeAIProvider()
    feedback, result = await provider.generate_structured("Đánh giá bài viết", Feedback)
    assert isinstance(feedback, Feedback)
    assert feedback.score == 1
    assert feedback.summary == "sample"
    assert result.provider == "fake"


async def test_fake_provider_stream() -> None:
    provider = FakeAIProvider()
    chunks = [chunk async for chunk in provider.stream("Xin chào")]
    assert chunks
    assert "".join(chunk.text for chunk in chunks).strip() == "Fake AI response"
    assert chunks[-1].is_final
    assert chunks[-1].usage is not None
    assert chunks[-1].provider == "fake"


def test_router_registers_and_selects_default_provider(ai_router: AIRouter) -> None:
    assert ai_router.available_providers() == ["fake", "gemini", "groq", "ollama"]
    provider = ai_router.get_provider()
    assert isinstance(provider, FakeAIProvider)
    assert ai_router.get_provider("fake") is not None


def test_router_unknown_provider_raises(ai_router: AIRouter) -> None:
    with pytest.raises(ProviderError) as excinfo:
        ai_router.get_provider("nope")
    assert "nope" in str(excinfo.value)


def test_router_can_register_custom_provider(ai_router: AIRouter) -> None:
    ai_router.register("custom", FakeAIProvider)
    assert "custom" in ai_router.available_providers()
    assert isinstance(ai_router.get_provider("custom"), FakeAIProvider)


async def test_router_delegates_generation(ai_router: AIRouter) -> None:
    result = await ai_router.generate("prompt text")
    assert result.provider == "fake"


def test_default_router_uses_settings_provider_name(monkeypatch) -> None:
    monkeypatch.setenv("AI_DEFAULT_PROVIDER", "fake")
    router = create_default_router()
    assert router.get_provider().name == "fake"


async def test_ai_service_delegates_to_router(ai_service: AIService) -> None:
    result = await ai_service.generate_text("Hãy viết một đoạn văn")
    assert result.provider == "fake"
    assert "Hãy viết một đoạn văn" in result.text


async def test_ai_service_structured_delegation(ai_service: AIService) -> None:
    class Outline(BaseModel):
        topic: str
        points: list[str]

    outline, result = await ai_service.generate_structured("Tạo dàn ý", Outline)
    assert isinstance(outline, Outline)
    assert result.provider == "fake"


async def test_ai_service_stream_delegation(ai_service: AIService) -> None:
    chunks = [chunk async for chunk in ai_service.stream_text("Viết một câu")]
    assert chunks
    assert "".join(chunk.text for chunk in chunks).strip() == "Fake AI response"
