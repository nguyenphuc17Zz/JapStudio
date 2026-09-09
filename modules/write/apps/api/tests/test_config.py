from app.core.config import Settings, get_settings


def test_settings_load_from_env() -> None:
    settings = get_settings()
    assert settings.app_env == "test"
    assert settings.ai_default_provider == "fake"
    assert settings.database_url.startswith("mysql+aiomysql")
    assert settings.cors_origin_list == ["http://localhost:5173"]


def test_settings_parse_cors_list(monkeypatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://a.example, http://b.example ,")
    settings = Settings()
    assert settings.cors_origin_list == ["http://a.example", "http://b.example"]


def test_settings_env_override(monkeypatch) -> None:
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    settings = Settings()
    assert settings.log_level == "DEBUG"


def test_settings_never_expose_secrets_in_repr() -> None:
    settings = Settings(gemini_api_key="super-secret-key", groq_api_key="also-secret")
    representation = repr(settings)
    assert "super-secret-key" not in representation
    assert "also-secret" not in representation


def test_settings_test_flag() -> None:
    assert get_settings().is_test is True
