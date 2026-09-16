import asyncio
import time
from typing import Any

from app.core.logging import logger
from app.domains.speech.contracts import (
    TTSAudioOutput,
    TTSOptions,
    TTSProvider,
    TTSVoice,
)
from app.domains.speech.errors import TTSProviderError


class EdgeTTSAdapter(TTSProvider):
    """
    Microsoft Edge online Text-to-Speech adapter via edge-tts.

    Zero local RAM overhead, zero engine startup delay, standard Tokyo pitch accent.
    Voice catalog is loaded dynamically via ``edge_tts.list_voices()`` and filtered
    to free (no API key) ``ja-JP`` GA Neural voices only. A curated fallback list
    is used when the endpoint is unreachable (offline/dev).

    NOTE (verified live 2026-09-16): the Edge endpoint currently exposes only
    2 ja-JP voices (Nanami, Keita) out of 322 total. The other Japanese voices
    (Aoi, Daichi, Mayu, Naoki, Shiori, Masaru) were removed by Microsoft from
    the free endpoint — synthesis with them fails. They remain available on
    the paid Azure Speech service.
    """

    provider_id: str = "edge_tts"

    # Curated fallback: ja-JP voices confirmed working on the Edge endpoint.
    # Used when list_voices() is unreachable; also the display-name source.
    FALLBACK_VOICES: list[TTSVoice] = [
        TTSVoice(
            id="ja-JP-NanamiNeural",
            name="Nanami (七海 - Nữ Tokyo chuẩn mực)",
            speaker_id="ja-JP-NanamiNeural",
            gender="female",
            style="Polite",
            capabilities=["speed_control", "pitch_control", "volume_control"],
        ),
        TTSVoice(
            id="ja-JP-KeitaNeural",
            name="Keita (圭太 - Nam tự nhiên, lịch thiệp)",
            speaker_id="ja-JP-KeitaNeural",
            gender="male",
            style="Polite",
            capabilities=["speed_control", "pitch_control", "volume_control"],
        ),
    ]

    # Backward-compat alias (health_check, older callers).
    AVAILABLE_VOICES: list[TTSVoice] = FALLBACK_VOICES

    # Display names for known free ja-JP voices (dynamic entries reuse these).
    # NOTE: explicit literal (not a comprehension over FALLBACK_VOICES) because
    # class-body names are not visible inside comprehensions.
    _FRIENDLY_NAMES: dict[str, str] = {
        "ja-JP-NanamiNeural": "Nanami (七海 - Nữ Tokyo chuẩn mực)",
        "ja-JP-KeitaNeural": "Keita (圭太 - Nam tự nhiên, lịch thiệp)",
    }

    # Dynamic catalog cache TTL (endpoint list rarely changes).
    _CACHE_TTL_SECONDS: float = 24 * 3600

    # Substrings marking non-free / non-standard voices (defensive filter;
    # the Edge endpoint normally only returns free standard voices).
    _NON_FREE_MARKERS: tuple[str, ...] = (
        "custom",
        "personal",
        "avatar",
        "hd",
        "multilingual",
        "preview",
    )

    def __init__(self, default_voice: str = "ja-JP-NanamiNeural"):
        self.default_voice = default_voice
        self._voices_cache: list[TTSVoice] | None = None
        self._voices_cache_ts: float = 0.0
        self._voices_lock = asyncio.Lock()
        self._voices_source: str = "fallback"

    @classmethod
    def _is_free_ja_voice(cls, entry: dict[str, Any]) -> bool:
        """True only for free standard ja-JP Neural voices on the Edge endpoint."""
        short_name = str(entry.get("ShortName", ""))
        if not short_name.startswith("ja-JP-") or not short_name.endswith("Neural"):
            return False
        if entry.get("Locale", "ja-JP") != "ja-JP":
            return False
        # Only Generally Available voices are free & stable; skip Preview/Deprecated.
        status = entry.get("Status")
        if status is not None and status != "GA":
            return False
        lowered = short_name.lower()
        return not any(marker in lowered for marker in cls._NON_FREE_MARKERS)

    @classmethod
    def _map_entry(cls, entry: dict[str, Any]) -> TTSVoice | None:
        """Map a raw list_voices() entry to TTSVoice; None if not a free ja-JP voice."""
        if not cls._is_free_ja_voice(entry):
            return None
        short_name = str(entry["ShortName"])
        gender = str(entry.get("Gender", "female")).lower()
        if gender not in ("female", "male"):
            gender = "female"
        voice_tag = entry.get("VoiceTag") or {}
        personalities = voice_tag.get("VoicePersonalities") or []
        style = str(personalities[0]) if personalities else "General"
        name = cls._FRIENDLY_NAMES.get(short_name) or str(
            entry.get("FriendlyName", short_name)
        )
        return TTSVoice(
            id=short_name,
            name=name,
            speaker_id=short_name,
            gender=gender,
            style=style,
            capabilities=["speed_control", "pitch_control", "volume_control"],
        )

    def _cache_valid(self) -> bool:
        return (
            self._voices_cache is not None
            and (time.monotonic() - self._voices_cache_ts) < self._CACHE_TTL_SECONDS
        )

    @staticmethod
    def _sort_voices(voices: list[TTSVoice], default_voice: str) -> list[TTSVoice]:
        """Default voice first, rest alphabetical for a stable catalog."""
        return sorted(voices, key=lambda v: (v.id != default_voice, v.id))

    async def get_available_voices(self, refresh: bool = False) -> list[TTSVoice]:
        """Dynamically list free ja-JP voices; fallback to curated list offline."""
        if not refresh and self._cache_valid() and self._voices_cache is not None:
            return list(self._voices_cache)
        async with self._voices_lock:
            if not refresh and self._cache_valid() and self._voices_cache is not None:
                return list(self._voices_cache)
            try:
                import edge_tts

                entries = await edge_tts.list_voices()
                voices = self._sort_voices(
                    [v for e in entries if (v := self._map_entry(e)) is not None],
                    self.default_voice,
                )
                if voices:
                    self._voices_cache = voices
                    self._voices_cache_ts = time.monotonic()
                    self._voices_source = "dynamic"
                    logger.info(
                        f"[EdgeTTS] Loaded {len(voices)} free ja-JP voices (dynamic)"
                    )
                    return list(voices)
                logger.warning(
                    "[EdgeTTS] list_voices() returned no free ja-JP voice; using fallback"
                )
            except Exception as e:
                logger.warning(f"[EdgeTTS] list_voices() failed, using fallback: {e}")
            self._voices_source = "fallback"
            return list(self.FALLBACK_VOICES)

    async def health_check(self) -> dict[str, Any]:
        """Verify Edge TTS availability."""
        start_time = time.perf_counter()
        try:
            # Quick lightweight synthesis test with a 1-character ping
            import edge_tts

            comm = edge_tts.Communicate("あ", self.default_voice)
            has_data = False
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    has_data = True
                    break
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            cached = self._voices_cache if self._cache_valid() else None
            voices = cached if cached is not None else self.FALLBACK_VOICES
            return {
                "provider_id": self.provider_id,
                "is_available": has_data,
                "latency_ms": latency_ms,
                "status_message": "Edge-TTS (Azure Neural) online",
                "voices_count": len(voices),
                "voices_source": self._voices_source if cached is not None else "fallback",
                "error": None,
            }
        except Exception as e:
            latency_ms = int((time.perf_counter() - start_time) * 1000)
            return {
                "provider_id": self.provider_id,
                "is_available": False,
                "latency_ms": latency_ms,
                "status_message": f"Edge-TTS check failed: {e}",
                "voices_count": len(self.FALLBACK_VOICES),
                "voices_source": "fallback",
                "error": str(e),
            }

    async def synthesize(
        self, text: str, options: TTSOptions | None = None
    ) -> TTSAudioOutput:
        """
        Synthesize Japanese speech text to MP3 audio using Edge-TTS.
        """
        if not text or not text.strip():
            return TTSAudioOutput(
                audio_bytes=b"",
                format="mp3",
                duration_ms=0,
                sample_rate=24000,
                voice=self.default_voice,
                provider=self.provider_id,
                processing_time_ms=0,
            )

        start_time = time.perf_counter()
        opts = options or TTSOptions()

        # Accept any ja-JP-* voice so dynamically listed free voices work immediately.
        requested = (opts.voice_id or "").strip()
        voice_id = requested if requested.startswith("ja-JP-") else self.default_voice

        # Format rate: e.g. speed 1.2 -> "+20%", speed 0.8 -> "-20%"
        rate_int = int((opts.speed - 1.0) * 100)
        rate_str = f"{'+' if rate_int >= 0 else ''}{rate_int}%"

        # Format pitch: e.g. pitch 5.0 -> "+5Hz", -5.0 -> "-5Hz"
        pitch_int = int(opts.pitch)
        pitch_str = f"{'+' if pitch_int >= 0 else ''}{pitch_int}Hz"

        try:
            import edge_tts

            communicate = edge_tts.Communicate(
                text=text.strip(),
                voice=voice_id,
                rate=rate_str,
                pitch=pitch_str,
            )

            audio_buffer = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.extend(chunk["data"])

            audio_bytes = bytes(audio_buffer)
            proc_ms = int((time.perf_counter() - start_time) * 1000)

            logger.info(
                f"[EdgeTTS] Synthesized {len(text)} chars with {voice_id} -> {len(audio_bytes)} bytes in {proc_ms}ms"
            )

            return TTSAudioOutput(
                audio_bytes=audio_bytes,
                format="mp3",
                sample_rate=24000,
                voice=voice_id,
                provider=self.provider_id,
                model="Azure-Neural-TTS",
                processing_time_ms=proc_ms,
                metadata={
                    "voice": voice_id,
                    "speed": opts.speed,
                    "pitch": opts.pitch,
                    "rate_str": rate_str,
                    "size_bytes": len(audio_bytes),
                },
            )
        except Exception as e:
            logger.error(f"[EdgeTTS] Synthesis failed for '{text}': {e}", exc_info=True)
            raise TTSProviderError(
                message=f"Edge-TTS synthesis error: {str(e)}",
                provider_id=self.provider_id,
                raw_error=e,
            )
