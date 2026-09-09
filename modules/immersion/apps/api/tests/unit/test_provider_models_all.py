import pytest
from app.services.ai.provider_registry import ai_provider_registry


@pytest.mark.asyncio
async def test_list_models_all_providers():
    # Calling list_models with None or 'all' should aggregate models
    models = await ai_provider_registry.list_models(None)
    assert len(models) > 0
    providers = {m.provider.lower() for m in models}
    # In test environment, mock is included
    assert "mock" in providers or "gemini" in providers or "groq" in providers


@pytest.mark.asyncio
async def test_set_active_model_gemini():
    ai_provider_registry.set_active_model("gemini", "gemini-3.6-flash")
    from app.core.config import settings
    assert settings.DEFAULT_AI_PROVIDER == "gemini"
    assert settings.DEFAULT_AI_MODEL == "gemini-3.6-flash"
