from typing import Protocol

from app.core.logging import logger
from app.domains.pronunciation.contracts import ReferenceType
from app.domains.speech.contracts import TTSOptions
from app.domains.speech.tts_router import tts_router


class ReferenceAudioProvider(Protocol):
    """Protocol for generating or fetching target reference audio."""

    async def get_reference_audio(
        self, text: str, voice_id: str | None = None
    ) -> tuple[bytes | None, ReferenceType]:
        ...


class DefaultReferenceAudioProvider:
    """Uses the default TTS adapter (Edge-TTS) to synthesize reference audio."""

    _CACHE: dict[tuple[str, str], bytes] = {}

    async def get_reference_audio(
        self, text: str, voice_id: str | None = None
    ) -> tuple[bytes | None, ReferenceType]:
        """Synthesizes or retrieves cached reference audio for target sentence."""
        if not text:
            return None, ReferenceType.UNKNOWN

        resolved_voice = voice_id or "ja-JP-NanamiNeural"
        cache_key = (text.strip(), resolved_voice)

        if cache_key in self._CACHE:
            return self._CACHE[cache_key], ReferenceType.SYNTHETIC

        try:
            tts_opts = TTSOptions(voice_id=resolved_voice)
            output = await tts_router.synthesize(text=text, options=tts_opts)
            if output.audio_bytes:
                self._CACHE[cache_key] = output.audio_bytes
                return output.audio_bytes, ReferenceType.SYNTHETIC
        except Exception as e:
            logger.warning(f"[DefaultReferenceAudioProvider] Synthesis failed for '{text}': {e}")

        return None, ReferenceType.UNKNOWN


