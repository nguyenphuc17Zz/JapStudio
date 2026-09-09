import logging
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

# Global singleton tagger to avoid re-initializing MeCab dictionary on every call
_TAGGER = None
_TAGGER_INITIALIZED = False


def _get_tagger():
    global _TAGGER, _TAGGER_INITIALIZED
    if _TAGGER_INITIALIZED:
        return _TAGGER

    try:
        import fugashi
        _TAGGER = fugashi.Tagger()
        logger.info("Fugashi Tagger with UniDic loaded successfully.")
    except Exception as e:
        logger.warning(f"Could not load fugashi Tagger: {e}. Furigana will fall back to plain text.")
        _TAGGER = None

    _TAGGER_INITIALIZED = True
    return _TAGGER


def is_kanji(c: str) -> bool:
    """Check if character is a CJK Unified Ideograph (Kanji)."""
    return "\u4e00" <= c <= "\u9fff" or "\u3400" <= c <= "\u4dbf"


def has_any_kanji(text: str) -> bool:
    """Check if string contains at least one Kanji."""
    return any(is_kanji(c) for c in text)


def katakana_to_hiragana(text: str) -> str:
    """Convert Katakana string to Hiragana."""
    if not text:
        return ""
    return "".join(
        chr(ord(c) - 0x60) if "\u30a1" <= c <= "\u30f6" else c
        for c in text
    )


class FuriganaService:
    """
    High-performance Japanese morphological Furigana generator.
    Powered by Fugashi (MeCab) and UniDic for state-of-the-art accuracy.
    """

    @classmethod
    def generate_sentence_furigana(cls, text: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Analyze a Japanese sentence and return:
        1. ruby_html: An HTML string with <ruby> and <rt> tags.
        2. tokens: A structured list of token dictionaries:
           [{"text": str, "reading": Optional[str], "is_kanji": bool}]
        """
        if not text:
            return "", []

        # Defensive: strip any HTML tags before tokenizing with Fugashi
        if "<" in text and ">" in text:
            import re
            clean_t = re.sub(r"<rt[^>]*>.*?</rt>", "", text, flags=re.IGNORECASE | re.DOTALL)
            clean_t = re.sub(r"<rp[^>]*>.*?</rp>", "", clean_t, flags=re.IGNORECASE | re.DOTALL)
            clean_t = re.sub(r"<[^>]+>", "", clean_t)
            text = clean_t.strip()
            if not text:
                return "", []

        tagger = _get_tagger()
        if not tagger or not has_any_kanji(text):
            # Fallback when no tagger or sentence has no Kanji
            tokens = [{"text": text, "reading": None, "is_kanji": False}]
            return text, tokens

        tokens: List[Dict[str, Any]] = []

        try:
            words = tagger(text)
            for word in words:
                surface = word.surface
                # In UniDic, kana feature contains Katakana pronunciation
                kana = getattr(word.feature, "kana", None)

                # If no kana or no Kanji in surface, keep as plain token
                if not kana or not has_any_kanji(surface):
                    tokens.append({"text": surface, "reading": None, "is_kanji": False})
                    continue

                hira = katakana_to_hiragana(kana)
                if surface == hira:
                    tokens.append({"text": surface, "reading": None, "is_kanji": False})
                    continue

                # Strip common prefix (e.g. お茶 -> お + 茶)
                start = 0
                while start < len(surface) and start < len(hira) and surface[start] == hira[start]:
                    start += 1

                # Strip common suffix (e.g. 食べる -> 食 + べる)
                end_s = len(surface)
                end_h = len(hira)
                while end_s > start and end_h > start and surface[end_s - 1] == hira[end_h - 1]:
                    end_s -= 1
                    end_h -= 1

                # 1. Prefix token (if any)
                if start > 0:
                    tokens.append({"text": surface[:start], "reading": None, "is_kanji": False})

                # 2. Main Kanji token with reading
                kanji_part = surface[start:end_s]
                reading_part = hira[start:end_h]
                if kanji_part:
                    tokens.append({
                        "text": kanji_part,
                        "reading": reading_part if reading_part else None,
                        "is_kanji": True,
                    })

                # 3. Suffix token / Okurigana (if any)
                if end_s < len(surface):
                    tokens.append({"text": surface[end_s:], "reading": None, "is_kanji": False})

        except Exception as e:
            logger.error(f"Error parsing sentence with fugashi: {e}")
            tokens = [{"text": text, "reading": None, "is_kanji": False}]

        # Construct ruby HTML
        ruby_parts = []
        for t in tokens:
            if t.get("reading") and t.get("is_kanji"):
                ruby_parts.append(f"<ruby>{t['text']}<rt>{t['reading']}</rt></ruby>")
            else:
                ruby_parts.append(t["text"])

        ruby_html = "".join(ruby_parts)
        return ruby_html, tokens


furigana_service = FuriganaService()
