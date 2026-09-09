"""Furigana & Japanese Morphological Tokenization Service using SudachiPy."""

from functools import lru_cache
import logging
import re
import threading
from typing import Any

from app.schemas.furigana import FuriganaConvertResponse, FuriganaToken

logger = logging.getLogger("app.furigana")

KANJI_PATTERN = re.compile(r"[\u4e00-\u9faf\u3400-\u4dbf]")
KANA_PATTERN = re.compile(r"[\u3040-\u309f\u30a0-\u30ff]")


def katakana_to_hiragana(text: str) -> str:
    """Convert Katakana characters in text to Hiragana."""
    result = []
    for char in text:
        code = ord(char)
        if 0x30A1 <= code <= 0x30F6:
            result.append(chr(code - 0x60))
        else:
            result.append(char)
    return "".join(result)


class SudachiFuriganaService:
    def __init__(self) -> None:
        self._tokenizer: Any = None
        self._split_modes: dict[str, Any] = {}
        self._lock = threading.Lock()
        self._init_failed = False

    def _ensure_initialized(self) -> None:
        if self._tokenizer is not None or self._init_failed:
            return
        with self._lock:
            if self._tokenizer is not None or self._init_failed:
                return
            try:
                from sudachipy import Dictionary, SplitMode

                dic = Dictionary()
                self._tokenizer = dic.create()
                self._split_modes = {
                    "A": SplitMode.A,
                    "B": SplitMode.B,
                    "C": SplitMode.C,
                }
            except Exception as exc:  # noqa: BLE001
                # Fallback if Sudachi dictionary is missing or fails
                self._tokenizer = None
                self._init_failed = True
                logger.warning("Failed to load SudachiPy dictionary: %s", exc)

    def tokenize_and_convert(self, text: str, mode: str = "C") -> FuriganaConvertResponse:
        """Tokenize Japanese text and generate Furigana annotations."""
        if not text:
            return FuriganaConvertResponse(
                original_text="",
                annotated_text="",
                ruby_html="",
                tokens=[],
            )

        self._ensure_initialized()

        if self._tokenizer is None:
            # Fallback if tokenizer failed to initialize: return un-annotated text
            return FuriganaConvertResponse(
                original_text=text,
                annotated_text=text,
                ruby_html=text,
                tokens=[FuriganaToken(surface=text, reading=None, is_kanji=bool(KANJI_PATTERN.search(text)))],
            )

        split_mode = self._split_modes.get(mode.upper(), self._split_modes.get("C"))
        morphemes = self._tokenizer.tokenize(text, split_mode)

        tokens: list[FuriganaToken] = []
        annotated_parts: list[str] = []
        html_parts: list[str] = []

        for m in morphemes:
            surface = m.surface()
            is_kanji = bool(KANJI_PATTERN.search(surface))
            pos = list(m.part_of_speech())

            if is_kanji:
                raw_reading = m.reading_form()
                hiragana_reading = katakana_to_hiragana(raw_reading)

                # If the surface contains kana okurigana (e.g. 食べる -> reading たべる)
                # We can align or provide full reading
                tokens.append(
                    FuriganaToken(
                        surface=surface,
                        reading=hiragana_reading,
                        is_kanji=True,
                        pos=pos,
                    )
                )
                annotated_parts.append(f"[{surface}|{hiragana_reading}]")
                html_parts.append(f"<ruby>{surface}<rp>(</rp><rt>{hiragana_reading}</rt><rp>)</rp></ruby>")
            else:
                tokens.append(
                    FuriganaToken(
                        surface=surface,
                        reading=None,
                        is_kanji=False,
                        pos=pos,
                    )
                )
                annotated_parts.append(surface)
                html_parts.append(surface)

        return FuriganaConvertResponse(
            original_text=text,
            annotated_text="".join(annotated_parts),
            ruby_html="".join(html_parts),
            tokens=tokens,
        )


# Global singleton instance
furigana_service = SudachiFuriganaService()


@lru_cache(maxsize=512)
def _get_cached_furigana_impl(text: str, mode: str = "C") -> FuriganaConvertResponse:
    return furigana_service.tokenize_and_convert(text, mode)


def get_cached_furigana(text: str, mode: str = "C") -> FuriganaConvertResponse:
    """Cached wrapper — normalizes mode upper + truncates before cache key to avoid bloat."""
    norm_mode = mode.upper() if isinstance(mode, str) else "C"
    if norm_mode not in ("A", "B", "C"):
        norm_mode = "C"
    norm_text = text[:500] if len(text) > 500 else text
    return _get_cached_furigana_impl(norm_text, norm_mode)


def clear_furigana_cache() -> None:
    get_cached_furigana.cache_clear()
