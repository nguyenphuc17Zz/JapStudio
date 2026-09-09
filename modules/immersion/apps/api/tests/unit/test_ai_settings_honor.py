import pytest

from app.core.config import settings
from app.services.ai.provider_registry import ai_provider_registry


@pytest.fixture
def _saved_settings():
    old_provider = settings.DEFAULT_AI_PROVIDER
    old_model = settings.DEFAULT_AI_MODEL
    old_key = settings.GROQ_API_KEY
    yield
    settings.DEFAULT_AI_PROVIDER = old_provider
    settings.DEFAULT_AI_MODEL = old_model
    settings.GROQ_API_KEY = old_key


def test_empty_sentinel_resolves_current_settings(_saved_settings):
    """Background jobs store '' (never a stale snapshot); at execution time
    the CURRENT settings must win — this is the reported bug.

    (Provider half is covered by settings Singleton itself; here we prove the
    model half: '' resolves to the live settings value, twice, tracking a
    settings change made AFTER enqueue.)
    """
    settings.DEFAULT_AI_PROVIDER = "groq"
    settings.DEFAULT_AI_MODEL = "openai/gpt-oss-20b"
    settings.GROQ_API_KEY = "gsk_testkey1234567890"

    provider, chosen = ai_provider_registry.get_active_provider_and_model("groq", "")
    assert provider.name == "groq"
    assert chosen == "openai/gpt-oss-20b"

    # Settings changed AFTER enqueue: execution must follow the NEW settings.
    settings.DEFAULT_AI_MODEL = "openai/gpt-oss-120b"
    _, chosen2 = ai_provider_registry.get_active_provider_and_model("groq", "")
    assert chosen2 == "openai/gpt-oss-120b"


def test_explicit_override_still_wins(_saved_settings):
    settings.DEFAULT_AI_PROVIDER = "groq"
    settings.DEFAULT_AI_MODEL = "openai/gpt-oss-20b"

    provider, chosen = ai_provider_registry.get_active_provider_and_model(
        "gemini", "gemini-2.0-flash"
    )
    assert provider.name == "gemini"
    assert chosen == "gemini-2.0-flash"


def test_provider_default_model_honors_settings(_saved_settings):
    from app.services.ai.groq_provider import GroqAIProvider
    from app.services.ai.ollama_provider import OllamaAIProvider

    settings.DEFAULT_AI_PROVIDER = "groq"
    settings.DEFAULT_AI_MODEL = "openai/gpt-oss-120b"
    assert GroqAIProvider().default_model == "openai/gpt-oss-120b"

    settings.DEFAULT_AI_PROVIDER = "ollama"
    settings.DEFAULT_AI_MODEL = "llama3.2:latest"
    assert OllamaAIProvider().default_model == "llama3.2:latest"

    settings.DEFAULT_AI_PROVIDER = "gemini"
    assert GroqAIProvider().default_model == "llama-3.3-70b-versatile"


@pytest.mark.asyncio
async def test_enqueue_stores_sentinel_not_snapshot(_saved_settings):
    from app.services.enrichment_worker import enrichment_worker_pool

    settings.DEFAULT_AI_PROVIDER = "groq"
    settings.DEFAULT_AI_MODEL = "openai/gpt-oss-20b"

    captured = {}

    class FakeSession:
        def add(self, obj):
            captured["job"] = obj

        async def execute(self, *args, **kwargs):
            class R:
                def scalars(self):
                    class S:
                        def first(self):
                            return None

                    return S()

            return R()

        async def commit(self):
            return None

        async def refresh(self, obj):
            return None

    # Auto path (no explicit provider): must store "" sentinel, not settings snapshot
    job = await enrichment_worker_pool.enqueue(
        db=FakeSession(), content_id=1, task="ALL"
    )
    assert job.model_provider == ""
    assert job.model_name == ""

    # Explicit path: preserved verbatim (lowercased provider)
    job2 = await enrichment_worker_pool.enqueue(
        db=FakeSession(), content_id=1, task="ALL",
        model_provider="Groq", model_name="openai/gpt-oss-120b", force=True,
    )
    assert job2.model_provider == "groq"
    assert job2.model_name == "openai/gpt-oss-120b"


def test_colon_separated_provider_model_resolution(_saved_settings):
    settings.GROQ_API_KEY = "gsk_test1234567890"
    provider, chosen = ai_provider_registry.get_active_provider_and_model("groq:llama-3.3-70b-versatile")
    assert provider.name == "groq"
    assert chosen == "llama-3.3-70b-versatile"


def test_invalid_provider_raises_zero_fallback():
    with pytest.raises(ValueError, match="không tồn tại"):
        ai_provider_registry.get_active_provider_and_model("nonexistent_provider:some-model")


def test_normalize_model_id_display_name_with_spaces():
    """Regression: UI display names (e.g. 'Gemini 3.5 Flash Lite') must never
    leak into provider URLs — they normalize to API ids."""
    from app.services.ai.base import normalize_model_id

    assert normalize_model_id("Gemini 3.5 Flash Lite") == "gemini-3.5-flash-lite"
    assert normalize_model_id("gemini-3.5-flash-lite") == "gemini-3.5-flash-lite"
    assert normalize_model_id("models/gemini-3.6-flash") == "gemini-3.6-flash"
    assert normalize_model_id("llama-3.3-70b-versatile") == "llama-3.3-70b-versatile"
    assert normalize_model_id("qwen3:8b") == "qwen3:8b"
    assert normalize_model_id(None) == ""
    assert normalize_model_id("  gemini-2.5-pro  ") == "gemini-2.5-pro"

