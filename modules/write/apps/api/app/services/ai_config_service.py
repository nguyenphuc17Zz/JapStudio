"""Persistence of provider credentials (API keys, base URLs) in the database.

The UI writes provider credentials through this service. The rows live in the
existing ``ai_provider_configs`` table; environment variables remain the
fallback defaults and are overridden by DB values (the most recent user
action wins). Secrets are never exposed by any API response.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.ai_config import AIProviderConfig

PROVIDER_NAMES = ("gemini", "groq", "ollama")

_ENV_FIELDS = {
    "gemini": {"api_key": "gemini_api_key", "base_url": None, "default_model": "gemini_default_model"},
    "groq": {"api_key": "groq_api_key", "base_url": None, "default_model": "groq_default_model"},
    "ollama": {"api_key": None, "base_url": "ollama_base_url", "default_model": "ollama_default_model"},
}


@dataclass
class ProviderCredentialView:
    """Masked view of a provider's stored credentials (never the raw values)."""

    configured: bool
    api_key_masked: str | None = None
    base_url: str | None = None
    default_model: str | None = None


def _mask(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}****{value[-4:]}"


class AIConfigService:
    """Reads/writes DB-backed provider configuration."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    async def get_effective_settings(self, session: AsyncSession) -> Settings:
        """Merge DB provider config over the environment-based settings."""
        overrides: dict[str, str] = {}
        rows = (await session.execute(select(AIProviderConfig))).scalars().all()
        for row in rows:
            if row.provider_name == "_system" and row.default_model:
                overrides["ai_default_provider"] = row.default_model
            if row.provider_name not in _ENV_FIELDS:
                continue
            fields = _ENV_FIELDS[row.provider_name]
            if fields.get("api_key") and row.api_key:
                overrides[fields["api_key"]] = row.api_key
            if fields.get("base_url") and row.base_url:
                overrides[fields["base_url"]] = row.base_url
            if fields.get("default_model") and row.default_model:
                overrides[fields["default_model"]] = row.default_model

        # If a real provider key is configured and default is still fake or unset, promote to real provider
        if overrides.get("ai_default_provider") == "fake" and not self._settings.is_test:
            overrides.pop("ai_default_provider", None)
        if overrides.get("gemini_api_key") and not overrides.get("ai_default_provider"):
            overrides["ai_default_provider"] = "gemini"
        elif overrides.get("groq_api_key") and not overrides.get("ai_default_provider"):
            overrides["ai_default_provider"] = "groq"

        return self._settings.model_copy(update=overrides) if overrides else self._settings

    async def get_config_view(self, session: AsyncSession) -> dict[str, ProviderCredentialView]:
        rows = {
            row.provider_name: row
            for row in (await session.execute(select(AIProviderConfig))).scalars().all()
        }
        view: dict[str, ProviderCredentialView] = {}
        for name in PROVIDER_NAMES:
            row = rows.get(name)
            base_url = row.base_url if row else None
            api_key = row.api_key if row else None
            default_model = row.default_model if row else None
            view[name] = ProviderCredentialView(
                configured=bool(api_key) or bool(base_url),
                api_key_masked=_mask(api_key),
                base_url=base_url,
                default_model=default_model,
            )
        return view

    async def update(
        self,
        session: AsyncSession,
        *,
        gemini_api_key: str | None = None,
        gemini_default_model: str | None = None,
        groq_api_key: str | None = None,
        groq_default_model: str | None = None,
        ollama_base_url: str | None = None,
        ollama_default_model: str | None = None,
        default_provider: str | None = None,
    ) -> None:
        updates: dict[str, dict[str, str | None]] = {
            "gemini": {"api_key": gemini_api_key, "default_model": gemini_default_model},
            "groq": {"api_key": groq_api_key, "default_model": groq_default_model},
            "ollama": {"base_url": ollama_base_url, "default_model": ollama_default_model},
        }
        for provider_name, values in updates.items():
            if all(v is None for v in values.values()):
                continue
            row = await session.scalar(
                select(AIProviderConfig).where(AIProviderConfig.provider_name == provider_name)
            )
            if row is None:
                row = AIProviderConfig(provider_name=provider_name)
                session.add(row)
            for field, val in values.items():
                if val is not None:
                    setattr(row, field, val.strip() or None)

        if default_provider is not None:
            cleaned_provider = default_provider.strip()
            # Strict: fake only allowed in test mode
            allowed = set(PROVIDER_NAMES)
            if self._settings.is_test:
                allowed.add("fake")
            if cleaned_provider in allowed:
                sys_row = await session.scalar(
                    select(AIProviderConfig).where(AIProviderConfig.provider_name == "_system")
                )
                if sys_row is None:
                    sys_row = AIProviderConfig(provider_name="_system")
                    session.add(sys_row)
                sys_row.default_model = cleaned_provider

        await session.commit()
