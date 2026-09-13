"""Vocabulary Dictionary Pool for Reflex Vocabulary Mode (reflex_vocabulary).

Seamlessly bridges to the authoritative BCCWJ High-Frequency Daily-Life Japanese Vocabulary Pool
(Single Source of Truth), ensuring zero hardcoded word duplication while maintaining 100%
backward-compatible interfaces.

Usage:
    from app.domains.reflex.vocab_pool import (
        ALL_VOCAB_WORDS, get_all_vocab_words, get_vocab_by_category, search_vocab, DictWord
    )
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.domains.vocabulary.bccwj_frequency_pool import (
    CATEGORY_WORDS_MAP,
    FrequencyWordEntry,
    get_all_frequency_words,
    get_words_by_category as get_bccwj_words_by_category,
    search_frequency_words,
)


@dataclass
class DictWord:
    word: str             # 連絡 / 諦める / 懐かしい
    reading: str          # れんらく / あきらめる / なつかしい
    word_type: str        # verb | noun | adj_i | adj_na | adverb | phrase
    category: str         # action_verbs | emotions_adj | adverbs_mimetic | workplace_biz | daily_life
    meaning_vi: str       # liên lạc
    synonyms_vi: list[str] = field(default_factory=list)
    collocation_ja: str = ""   # 連絡を取る
    collocation_vi: str = ""   # giữ liên lạc
    example_ja: str = ""       # 後でLINEで連絡するね！
    example_vi: str = ""       # Lát nữa mình nhắn qua LINE cho cậu nhé!
    jlpt: str = ""
    rank: int = 1
    tier: int = 1
    frequency_score: float = 9.0


def _convert_entry(fw: FrequencyWordEntry) -> DictWord:
    return DictWord(
        word=fw.word,
        reading=fw.reading,
        word_type=fw.pos,
        category=fw.category,
        meaning_vi=fw.meaning_vi,
        synonyms_vi=list(fw.synonyms_vi),
        collocation_ja=fw.collocation_ja,
        collocation_vi=fw.collocation_vi,
        example_ja=fw.example_ja,
        example_vi=fw.example_vi,
        jlpt=fw.jlpt,
        rank=fw.rank,
        tier=fw.tier,
        frequency_score=fw.frequency_score,
    )


# Convert BCCWJ dataset into DictWord instances (Single Source of Truth)
ALL_VOCAB_WORDS: list[DictWord] = [_convert_entry(w) for w in get_all_frequency_words()]

VOCAB_CATEGORY_MAP: dict[str, list[DictWord]] = {
    cat: [_convert_entry(w) for w in words]
    for cat, words in CATEGORY_WORDS_MAP.items()
}

ACTION_VERBS: list[DictWord] = VOCAB_CATEGORY_MAP.get("action_verbs", [])
EMOTIONS_ADJ: list[DictWord] = VOCAB_CATEGORY_MAP.get("emotions_adj", [])
ADVERBS_MIMETIC: list[DictWord] = VOCAB_CATEGORY_MAP.get("adverbs_mimetic", [])
WORKPLACE_BIZ: list[DictWord] = VOCAB_CATEGORY_MAP.get("workplace_biz", [])
DAILY_LIFE: list[DictWord] = VOCAB_CATEGORY_MAP.get("daily_life", [])

EASY_VOCAB = ALL_VOCAB_WORDS
NORMAL_VOCAB = ALL_VOCAB_WORDS
HARD_VOCAB = ALL_VOCAB_WORDS


def get_all_vocab_words() -> list[DictWord]:
    return ALL_VOCAB_WORDS


def get_easy_vocab() -> list[DictWord]:
    return ALL_VOCAB_WORDS


def get_normal_vocab() -> list[DictWord]:
    return ALL_VOCAB_WORDS


def get_hard_vocab() -> list[DictWord]:
    return ALL_VOCAB_WORDS


def get_vocab_by_category(category: str) -> list[DictWord]:
    if not category or category == "all":
        return ALL_VOCAB_WORDS
    return VOCAB_CATEGORY_MAP.get(category, ALL_VOCAB_WORDS)


def search_vocab(query: str) -> list[DictWord]:
    if not query.strip():
        return ALL_VOCAB_WORDS
    q = query.lower().strip()
    return [
        w for w in ALL_VOCAB_WORDS
        if q in w.word.lower()
        or q in w.reading.lower()
        or q in w.meaning_vi.lower()
        or any(q in syn.lower() for syn in w.synonyms_vi)
        or q in w.collocation_ja.lower()
        or q in w.collocation_vi.lower()
        or q in w.example_ja.lower()
        or q in w.example_vi.lower()
    ]
