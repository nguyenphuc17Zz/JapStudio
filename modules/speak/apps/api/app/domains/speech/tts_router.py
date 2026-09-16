from app.core.config import get_settings
from app.core.logging import logger
from app.domains.speech.adapters.edge_tts_adapter import EdgeTTSAdapter
from app.domains.speech.contracts import TTSAudioOutput, TTSOptions, TTSProvider, TTSVoice
from app.domains.speech.errors import TTSProviderError

settings = get_settings()

# Legacy provider ids remapped to edge_tts (rows written before Kokoro removal).
LEGACY_PROVIDER_ALIASES = {"kokoro": "edge_tts", "voicevox": "edge_tts"}


class TTSRouter:
    """Text-to-Speech Router for voice engines (currently Edge-TTS)."""

    def __init__(self):
        default_prov = getattr(settings, "DEFAULT_TTS_PROVIDER", "edge_tts").lower()
        default_prov = LEGACY_PROVIDER_ALIASES.get(default_prov, default_prov)
        self._providers: dict[str, TTSProvider] = {
            "edge_tts": EdgeTTSAdapter(),
        }
        self.default_provider_id = default_prov if default_prov in self._providers else "edge_tts"

    def register_provider(self, provider_id: str, provider: TTSProvider) -> None:
        self._providers[provider_id.lower()] = provider

    def get_provider(self, provider_id: str | None = None) -> TTSProvider:
        target = (provider_id or self.default_provider_id).lower()
        target = LEGACY_PROVIDER_ALIASES.get(target, target)
        if target not in self._providers:
            raise TTSProviderError(
                message=f"TTS Provider '{target}' is not registered. Available: {list(self._providers.keys())}",
                provider_id=target,
            )
        return self._providers[target]

    async def synthesize(
        self,
        text: str,
        provider_id: str | None = None,
        options: TTSOptions | None = None,
    ) -> TTSAudioOutput:
        """Route text synthesis to the selected provider."""
        provider = self.get_provider(provider_id)
        try:
            return await provider.synthesize(text, options)
        except Exception as primary_err:
            logger.warning(f"[TTSRouter] Provider synthesis failed: {primary_err}")
            raise primary_err

    async def get_available_voices(self, provider_id: str | None = None) -> list[TTSVoice]:
        """Fetch available voices from the specified provider."""
        provider = self.get_provider(provider_id)
        return await provider.get_available_voices()


# Singleton instance
tts_router = TTSRouter()
