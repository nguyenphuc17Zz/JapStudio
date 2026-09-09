"""Deterministic vocabulary normalization (Phase 5, §7).

The deduplication key collapses Unicode variants, whitespace and punctuation
but NEVER merges distinct lexical items: inflected forms (立て込む vs
立て込んでいる) produce different keys, so equivalence between them is decided
by the AI validation stage, not by this code.
"""

import unicodedata

_PUNCTUATION = frozenset("、。「」『』【】〔〕（）()［］[]｛｝{}・，,．.。!?！？…‥\u30fb\"'")
_WHITESPACE = frozenset(" \t\n\r\u3000\ufeff")


def normalize_expression(expression: str) -> str:
    """Deterministic deduplication key for a Japanese expression."""
    normalized = unicodedata.normalize("NFKC", expression)
    return "".join(ch for ch in normalized if ch not in _PUNCTUATION and ch not in _WHITESPACE)
