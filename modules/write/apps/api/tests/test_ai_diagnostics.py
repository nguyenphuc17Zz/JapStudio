from unittest.mock import AsyncMock

from app.api.v1 import ai as ai_api
from app.core.config import Settings
from app.providers.ai.base import AICapabilities, AIModelInfo
from app.providers.ai.router import ProviderStatus
from app.services.ai_config_service import AIConfigService


def _status(name: str, *, configured: bool = True) -> ProviderStatus:
    return ProviderStatus(
        name=name,
        configured=configured,
        available=configured,
        default_model=f"{name}-model",
        capabilities=AICapabilities(),
    )


async def test_provider_status_endpoint(client, monkeypatch) -> None:
    monkeypatch.setattr(
        ai_api.AIService,
        "provider_status",
        AsyncMock(return_value=[_status("fake"), _status("gemini", configured=False)]),
    )
    response = await client.get("/api/v1/ai/providers")
    assert response.status_code == 200
    payload = response.json()
    assert payload["default_provider"] == "fake"
    providers = {item["name"]: item for item in payload["providers"]}
    assert providers["fake"]["configured"] is True
    assert providers["fake"]["available"] is True
    assert providers["fake"]["default_model"] == "fake-model"
    assert providers["gemini"]["configured"] is False
    assert "api_key" not in payload


async def test_provider_config_get_initial(client) -> None:
    response = await client.get("/api/v1/ai/providers/config")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"gemini", "groq", "ollama"}
    assert all(not item["configured"] for item in payload.values())
    assert all(item["api_key_masked"] is None for item in payload.values())


async def test_provider_config_put_masks_keys(client) -> None:
    response = await client.put(
        "/api/v1/ai/providers/config",
        json={
            "gemini_api_key": "AIzaSecretKey1234567890",
            "groq_api_key": "gsk_Short",
            "ollama_base_url": "http://192.168.1.5:11434",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["gemini"]["configured"] is True
    assert payload["gemini"]["api_key_masked"] == "AIza****7890"
    assert "AIzaSecretKey1234567890" not in response.text
    assert payload["groq"]["api_key_masked"] == "gsk_****hort"
    assert payload["ollama"]["base_url"] == "http://192.168.1.5:11434"


async def test_provider_config_put_empty_clears(client) -> None:
    await client.put(
        "/api/v1/ai/providers/config", json={"gemini_api_key": "AIzaSecretKey1234567890"}
    )
    response = await client.put("/api/v1/ai/providers/config", json={"gemini_api_key": ""})
    payload = response.json()
    assert payload["gemini"]["configured"] is False
    assert payload["gemini"]["api_key_masked"] is None


async def test_effective_settings_merge_db_overrides_env(client, session) -> None:
    await client.put(
        "/api/v1/ai/providers/config",
        json={
            "gemini_api_key": "AIzaDbKey1234567890",
            "gemini_default_model": "gemini-1.5-pro",
            "groq_api_key": "gsk_DbKey1234567890",
            "groq_default_model": "qwen/qwen3.6-27b",
            "ollama_default_model": "gemma4:12b",
            "default_provider": "groq",
        },
    )
    effective = await AIConfigService().get_effective_settings(session)
    assert effective.gemini_api_key == "AIzaDbKey1234567890"
    assert effective.gemini_default_model == "gemini-1.5-pro"
    assert effective.groq_api_key == "gsk_DbKey1234567890"
    assert effective.groq_default_model == "qwen/qwen3.6-27b"
    assert effective.ollama_default_model == "gemma4:12b"
    assert effective.ai_default_provider == "groq"
    base = Settings()
    assert base.gemini_api_key == ""
    assert effective.ollama_base_url == base.ollama_base_url


async def test_provider_config_returns_default_model(client) -> None:
    await client.put(
        "/api/v1/ai/providers/config",
        json={
            "groq_api_key": "gsk_SecretKey1234567890",
            "groq_default_model": "llama-3.3-70b-versatile",
        },
    )
    response = await client.get("/api/v1/ai/providers/config")
    assert response.status_code == 200
    payload = response.json()
    assert payload["groq"]["default_model"] == "llama-3.3-70b-versatile"


async def test_models_endpoint(client, monkeypatch) -> None:
    monkeypatch.setattr(
        ai_api.AIService,
        "provider_status",
        AsyncMock(return_value=[_status("fake"), _status("gemini", configured=False)]),
    )
    monkeypatch.setattr(
        ai_api.AIService,
        "list_models",
        AsyncMock(
            return_value=[AIModelInfo(id="fake-model", provider="fake", display_name="Fake Model")]
        ),
    )
    response = await client.get("/api/v1/ai/models")
    assert response.status_code == 200
    payload = response.json()
    by_provider = {item["provider"]: item for item in payload}
    assert by_provider["fake"]["models"][0]["id"] == "fake-model"
    assert by_provider["gemini"]["error"] == "not_configured"


async def test_models_endpoint_provider_error_is_isolated(client, monkeypatch) -> None:
    from app.providers.ai.errors import AIConfigurationError

    monkeypatch.setattr(
        ai_api.AIService, "provider_status", AsyncMock(return_value=[_status("fake")])
    )
    monkeypatch.setattr(
        ai_api.AIService,
        "list_models",
        AsyncMock(side_effect=AIConfigurationError("gemini key missing", provider="gemini")),
    )
    response = await client.get("/api/v1/ai/models")
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["models"] == []
    assert payload[0]["error"] == "ai_configuration_error"


async def test_generate_endpoint_uses_default_provider(client) -> None:
    response = await client.post(
        "/api/v1/ai/generate", json={"prompt": "Viết về Tokyo", "temperature": 0.5}
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "fake"
    assert "Viết về Tokyo" in payload["text"]
    assert payload["usage"]["total_tokens"] is not None


async def test_generate_endpoint_provider_override(client) -> None:
    response = await client.post(
        "/api/v1/ai/generate", json={"prompt": "x", "provider": "fake", "model": "m1"}
    )
    assert response.status_code == 200
    assert response.json()["model"] == "m1"


async def test_generate_endpoint_unknown_provider(client) -> None:
    response = await client.post("/api/v1/ai/generate", json={"prompt": "x", "provider": "nope"})
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "provider_error"


async def test_generate_endpoint_validation_error(client) -> None:
    response = await client.post("/api/v1/ai/generate", json={"prompt": ""})
    assert response.status_code == 422


async def test_generate_endpoint_disabled_in_production(client, monkeypatch) -> None:
    monkeypatch.setattr(ai_api, "get_settings", lambda: Settings(app_env="production"))
    response = await client.post("/api/v1/ai/generate", json={"prompt": "x"})
    assert response.status_code == 404
