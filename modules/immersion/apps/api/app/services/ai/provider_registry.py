from typing import Dict, List, Optional, Any
from pathlib import Path
from app.core.config import settings
from app.core.secrets_guard import redact_secrets
from app.services.ai.base import AIProviderBase, AIModelMeta
from app.services.ai.gemini_provider import GeminiAIProvider
from app.services.ai.groq_provider import GroqAIProvider
from app.services.ai.ollama_provider import OllamaAIProvider
from app.services.ai.mock_provider import MockAIProvider


class AIProviderRegistry:
    """Registry coordinating multiple AI providers with dynamic model discovery and key management."""

    def __init__(self):
        self._providers: Dict[str, AIProviderBase] = {
            "gemini": GeminiAIProvider(),
            "groq": GroqAIProvider(),
            "ollama": OllamaAIProvider(),
            "mock": MockAIProvider(),
        }

    def register(self, provider: AIProviderBase) -> None:
        self._providers[provider.name] = provider

    def get_provider(self, name: Optional[str] = None, require_configured: bool = True) -> AIProviderBase:
        """Resolves provider based on setting or explicit name.
        If provider is not configured, raises ValueError immediately without silent mock/dummy fallback
        (unless running in test environment)."""
        import os
        is_test_env = "PYTEST_CURRENT_TEST" in os.environ or settings.ENVIRONMENT == "test"

        if not name and is_test_env:
            target_name = "mock"
        else:
            target_name = (name or settings.DEFAULT_AI_PROVIDER or "gemini").lower().strip()

        if target_name == "mock":
            return self._providers["mock"]

        if target_name not in self._providers:
            raise ValueError(f"AI Provider '{target_name}' không tồn tại trong hệ thống.")

        provider = self._providers[target_name]

        if require_configured and not provider.is_configured:
            if is_test_env:
                return self._providers["mock"]
            raise ValueError(
                f"AI Provider '{provider.display_name}' chưa được cấu hình API Key. "
                f"Vui lòng vào trang Cài đặt để cấu hình API Key."
            )

        return provider

    def get_active_provider_and_model(
        self,
        provider_name: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> tuple[AIProviderBase, str]:
        """Resolves the configured AI provider and model without silent fallbacks."""
        clean_provider = provider_name.strip() if provider_name else None
        clean_model = model_name.strip() if model_name else None

        if clean_provider and ":" in clean_provider and not clean_model:
            parts = clean_provider.split(":", 1)
            clean_provider = parts[0].strip()
            clean_model = parts[1].strip()

        provider = self.get_provider(clean_provider, require_configured=True)
        chosen_model = (
            clean_model
            or getattr(provider, "_custom_model", None)
            or (settings.DEFAULT_AI_MODEL if (not clean_provider or clean_provider.lower() == settings.DEFAULT_AI_PROVIDER.lower()) else None)
            or provider.default_model
        )
        return provider, chosen_model

    def list_providers_meta(self, include_mock: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Lists metadata of available providers. Hides 'mock' on UI, preserves in test environment."""
        import os
        if include_mock is None:
            include_mock = "PYTEST_CURRENT_TEST" in os.environ or settings.ENVIRONMENT == "test"

        result = []
        for p in self._providers.values():
            if p.name == "mock" and not include_mock:
                continue

            has_key = False
            masked_key = None
            if p.name == "gemini":
                key = (settings.GEMINI_API_KEY or "").strip()
                has_key = len(key) > 5
                if has_key:
                    masked_key = f"{key[:6]}...{key[-4:]}" if len(key) >= 10 else "******"
            elif p.name == "groq":
                key = (settings.GROQ_API_KEY or "").strip()
                has_key = len(key) > 5
                if has_key:
                    masked_key = f"{key[:6]}...{key[-4:]}" if len(key) >= 10 else "******"

            result.append({
                "name": p.name,
                "display_name": p.display_name,
                "configured": p.is_configured,
                "default_model": p.default_model,
                "requires_key": p.requires_key,
                "has_key": has_key,
                "masked_key": masked_key,
            })
        return result

    async def list_models(self, provider_name: Optional[str] = None) -> List[AIModelMeta]:
        import os
        is_test_env = "PYTEST_CURRENT_TEST" in os.environ or settings.ENVIRONMENT == "test"
        if not provider_name or provider_name.lower() == "all":
            all_models: List[AIModelMeta] = []
            for p_name, provider in self._providers.items():
                if p_name == "mock" and not is_test_env:
                    continue
                try:
                    p_models = await provider.list_models()
                    all_models.extend(p_models)
                except Exception as e:
                    logger.debug(f"Failed to list models for {p_name}: {e}")
            return all_models

        provider = self.get_provider(provider_name, require_configured=False)
        return await provider.list_models()

    def update_provider_key(self, name: str, api_key: str) -> None:
        """Updates API key in settings and persists it to .env file."""
        clean_key = api_key.strip()
        env_var = None
        if name.lower() == "gemini":
            settings.GEMINI_API_KEY = clean_key
            env_var = "GEMINI_API_KEY"
        elif name.lower() == "groq":
            settings.GROQ_API_KEY = clean_key
            env_var = "GROQ_API_KEY"

        if env_var:
            self._persist_env_var(env_var, clean_key)

    def set_active_model(self, provider: str, model_id: str) -> None:
        """Sets the default AI provider and model, and persists them into .env."""
        p_name = provider.lower().strip()
        m_id = model_id.strip()

        settings.DEFAULT_AI_PROVIDER = p_name
        settings.DEFAULT_AI_MODEL = m_id

        if p_name in self._providers:
            prov = self._providers[p_name]
            if hasattr(prov, "default_model"):
                prov.default_model = m_id

        self._persist_env_var("DEFAULT_AI_PROVIDER", p_name)
        self._persist_env_var("DEFAULT_AI_MODEL", m_id)

    def _persist_env_var(self, key: str, value: str) -> None:
        candidates = [
            Path(".env"),
            Path("modules/immersion/apps/api/.env"),
            Path(__file__).resolve().parent.parent.parent.parent / ".env",
        ]
        target_path = None
        for p in candidates:
            if p.exists():
                target_path = p
                break
        if not target_path:
            target_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"

        lines = []
        found = False
        if target_path.exists():
            with open(target_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

        new_lines = []
        for line in lines:
            if line.strip().startswith(f"{key}="):
                new_lines.append(f"{key}={value}\n")
                found = True
            else:
                new_lines.append(line)

        if not found:
            new_lines.append(f"{key}={value}\n")

        with open(target_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

    async def test_provider_connection(self, name: str, api_key: Optional[str] = None) -> tuple[bool, str, List[AIModelMeta]]:
        target = name.lower()
        if target not in self._providers:
            return False, f"Provider '{name}' không tồn tại.", []

        provider = self._providers[target]
        if hasattr(provider, "test_connection"):
            return await provider.test_connection(api_key=api_key)

        try:
            models = await provider.list_models()
            return True, f"Kết nối {provider.display_name} thành công.", models
        except Exception as e:
            return False, f"Lỗi kết nối: {redact_secrets(str(e))}", []


# Global singleton instance
ai_provider_registry = AIProviderRegistry()
