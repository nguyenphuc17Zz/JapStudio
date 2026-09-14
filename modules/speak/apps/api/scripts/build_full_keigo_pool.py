# -*- coding: utf-8 -*-
"""Generate the complete 290-word Keigo vocabulary pool for keigo_vocab_pool.py.
Includes 16 formulas, 14-25 words each, full STT phonetic variants, examples, and hints.
"""

from __future__ import annotations
import sys
import io
import pprint
from pathlib import Path

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# Add scripts directory to path to import data modules
sys.path.insert(0, str(Path(__file__).parent))

from keigo_data_sonkeigo import (
    SONKEIGO_IRREGULAR_DATA,
    SONKEIGO_O_NI_NARU_DATA,
    SONKEIGO_PASSIVE_DATA,
    SONKEIGO_GO_NI_NARU_DATA,
    SONKEIGO_KUDASAI_DATA,
)
from keigo_data_kenjougo import (
    KENJOUGO_IRREGULAR_DATA,
    KENJOUGO_O_SURU_DATA,
    KENJOUGO_GO_SURU_DATA,
    KENJOUGO_MOUSHIAGERU_DATA,
    KENJOUGO_PERMISSIVE_DATA,
)
from keigo_data_bikago_business import (
    BIKAGO_PREFIX_O_DATA,
    BIKAGO_PREFIX_GO_DATA,
    TEINEIGO_DESU_MASU_DATA,
    BUSINESS_PRONOUNS_DATA,
    BUSINESS_TIME_ADVERBS_DATA,
    BUSINESS_PHRASES_DATA,
)

TARGET_FILE = Path(__file__).resolve().parent.parent / "app" / "domains" / "keigo" / "keigo_vocab_pool.py"

HEADER = '''"""Keigo Vocabulary Pool — Complete honorific & humble word pairs, business words, and regular rules.

Organized into 5 practical categories and 16 formulas:
- sonkeigo_irregular: Tôn kính ngữ bất quy tắc (25 động từ kinh điển)
- kenjougo_irregular: Khiêm nhường ngữ & đinh trọng ngữ bất quy tắc (25 động từ kinh điển)
- sonkeigo_o_ni_naru: Công thức お + V(stem) + になる / になります (20 động từ)
- sonkeigo_passive: Thể bị động tôn kính 〜れる / 〜られます (18 động từ)
- sonkeigo_go_ni_naru: Công thức ご + N(Suru) + になる / なさる (18 động từ)
- sonkeigo_kudasai: Yêu cầu lịch sự お/ご 〜 ください / くださいませ (18 động từ)
- kenjougo_o_suru: Công thức お + V(stem) + します / いたします (20 động từ)
- kenjougo_go_suru: Công thức ご + N(Suru) + します / いたします (18 động từ)
- kenjougo_moushiageru: Công thức cung kính 〜申し上げます (15 từ)
- kenjougo_permissive: Công thức xin phép 〜させていただきます (15 từ)
- bikago_prefix_o: Tiền tố お cho từ thuần Nhật (18 từ)
- bikago_prefix_go: Tiền tố ご cho từ gốc Hán (20 từ)
- teineigo_desu_masu: Lịch sự & Đinh trọng ngữ ございます / でございます (14 từ)
- business_pronouns: Đại từ nhân xưng & Xưng hô Uchi/Soto (15 từ)
- business_time_adverbs: Thời gian & Phó từ công sở (16 từ)
- business_phrases: Cụm từ ứng đối & Giao tiếp công sở (15 từ)

Usage:
    from app.domains.keigo.keigo_vocab_pool import (
        ALL_KEIGO_WORDS, KeigoWordEntry, get_all_keigo_vocab,
        get_sonkeigo_pool, get_kenjougo_pool, get_rule_based_pool,
        get_prefix_vocab_pool, get_business_vocab_pool, get_keigo_by_category,
        get_keigo_by_formula_id, search_keigo
    )
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class KeigoWordEntry:
    source_word: str  # Plain word (e.g., 食べる, 行く, 今日, 会社, 名前, 家族)
    source_reading: str  # e.g., たべる
    meaning_vi: str  # e.g., ăn, đi, hôm nay, tên, gia đình
    target_type: str  # 'sonkeigo' | 'kenjougo' | 'business' | 'rule_based' | 'prefix'
    target_label_vi: str  # 'Tôn kính ngữ (尊敬語)' | 'Khiêm nhường ngữ (謙譲語)' | 'Từ thương mại (ビジネス語)' | 'Mỹ từ pháp (美化語)'
    canonical: str  # Primary answer (e.g., 召し上がる, 参る, 本日, お名前, ご家族)
    canonical_reading: str  # e.g., めしあがる
    acceptable_variants: list[str] = field(default_factory=list)
    triplet_sonkeigo: str | None = None
    triplet_kenjougo: str | None = None
    category: str = "sonkeigo_irregular"  # 'sonkeigo_irregular' | 'kenjougo_irregular' | 'rule_based' | 'noun_prefixes' | 'business_words'
    jlpt_level: str = "N3"
    explanation_vi: str = ""
    subject_hint_vi: str = ""  # '👑 Hành động của: SẾP / ĐỐI TÁC / KHÁCH HÀNG' | '🙇 Hành động của: BẢN THÂN / CÔNG TY MÌNH'
    formula: str = ""  # 'Bất quy tắc (Đặc biệt)' | 'お + V(stem) + になる / になります' | 'Thể bị động: 〜れる / 〜られます'
    example_ja: str = ""
    example_vi: str = ""
    formula_id: str = ""

    def __post_init__(self):
        if not self.formula_id:
            if self.category == "sonkeigo_irregular":
                self.formula_id = "sonkeigo_irregular"
            elif self.category == "kenjougo_irregular":
                self.formula_id = "kenjougo_irregular"
            elif self.category == "noun_prefixes":
                if "ご" in self.canonical or "ご" in self.formula:
                    self.formula_id = "bikago_prefix_go"
                else:
                    self.formula_id = "bikago_prefix_o"
            elif self.category == "business_words":
                if any(w in self.source_word for w in ["今日", "明日", "昨日", "おととい", "あさって", "今年", "去年", "ちょっと", "すごく", "あとで", "いま", "後ほど", "少々", "さっき", "すぐ", "前日", "先日", "当日", "後日"]):
                    self.formula_id = "business_time_adverbs"
                elif any(w in self.source_word for w in ["わたし", "わたしたち", "会社", "人", "だれ", "どこ", "どう", "あなた", "そちら", "妻", "夫", "皆さん"]):
                    self.formula_id = "business_pronouns"
                elif any(w in self.canonical for w in ["ございます", "でございます", "よろしい"]):
                    self.formula_id = "teineigo_desu_masu"
                else:
                    self.formula_id = "business_phrases"
            elif self.category == "rule_based":
                if "申し上げます" in self.canonical or "申し上げます" in self.formula or "申し上げる" in self.canonical:
                    self.formula_id = "kenjougo_moushiageru"
                elif "いただきます" in self.canonical or "いただく" in self.canonical or "させていただきます" in self.formula:
                    self.formula_id = "kenjougo_permissive"
                elif "ください" in self.canonical or "ください" in self.formula:
                    self.formula_id = "sonkeigo_kudasai"
                elif "になる" in self.canonical or "になります" in self.canonical:
                    if self.canonical.startswith("お"):
                        self.formula_id = "sonkeigo_o_ni_naru"
                    else:
                        self.formula_id = "sonkeigo_go_ni_naru"
                elif "なさる" in self.canonical or "なさいます" in self.canonical:
                    self.formula_id = "sonkeigo_go_ni_naru"
                elif self.canonical.endswith("れる") or self.canonical.endswith("られる") or self.canonical.endswith("れます") or self.canonical.endswith("られます"):
                    self.formula_id = "sonkeigo_passive"
                elif self.target_type == "sonkeigo":
                    if self.canonical.startswith("ご"):
                        self.formula_id = "sonkeigo_go_ni_naru"
                    else:
                        self.formula_id = "sonkeigo_o_ni_naru"
                elif self.target_type == "kenjougo":
                    if self.canonical.startswith("ご"):
                        self.formula_id = "kenjougo_go_suru"
                    else:
                        self.formula_id = "kenjougo_o_suru"
                else:
                    self.formula_id = "rule_based"

        # Automatic Speech Recognition Normalization:
        # Ensures that Faster-Whisper transcribing Hiragana, Kanji, plain, or polite forms matches correctly.
        variants = [self.canonical] + list(self.acceptable_variants)
        if self.canonical_reading and self.canonical_reading not in variants:
            variants.append(self.canonical_reading)

        # Append common polite forms
        if self.canonical.endswith("になる"):
            variants.append(self.canonical[:-3] + "になります")
            variants.append(self.canonical[:-3] + "になりました")
        elif self.canonical.endswith("する"):
            variants.append(self.canonical[:-2] + "します")
            variants.append(self.canonical[:-2] + "いたします")
            variants.append(self.canonical[:-2] + "いたしました")
        elif self.canonical.endswith("いたす"):
            variants.append(self.canonical[:-3] + "いたします")
            variants.append(self.canonical[:-3] + "いたしました")
        elif self.canonical.endswith("申す"):
            variants.append(self.canonical[:-2] + "申します")
            variants.append(self.canonical[:-2] + "申しました")
        elif self.canonical.endswith("参る"):
            variants.append(self.canonical[:-2] + "参ります")
            variants.append(self.canonical[:-2] + "参りました")
        elif self.canonical.endswith("いただく"):
            variants.append(self.canonical[:-4] + "いただきます")
            variants.append(self.canonical[:-4] + "いただきました")
        elif self.canonical.endswith("おる"):
            variants.append(self.canonical[:-2] + "おります")
            variants.append(self.canonical[:-2] + "おりました")
        elif self.canonical.endswith("存じる"):
            variants.append(self.canonical[:-3] + "存じます")
            variants.append(self.canonical[:-3] + "存じております")
        elif self.canonical.endswith("れる"):
            variants.append(self.canonical[:-2] + "れます")
            variants.append(self.canonical[:-2] + "れました")
        elif self.canonical.endswith("られる"):
            variants.append(self.canonical[:-3] + "られます")
            variants.append(self.canonical[:-3] + "られました")
        elif self.canonical.endswith("申し上げる"):
            variants.append(self.canonical[:-5] + "申し上げます")
            variants.append(self.canonical[:-5] + "申し上げました")
        elif self.canonical.endswith("くださる"):
            variants.append(self.canonical[:-4] + "くださいます")
            variants.append(self.canonical[:-4] + "くださいました")
        elif self.canonical.endswith("おっしゃる"):
            variants.append(self.canonical[:-5] + "おっしゃいます")
            variants.append(self.canonical[:-5] + "おっしゃいました")
        elif self.canonical.endswith("なさる"):
            variants.append(self.canonical[:-3] + "なさいます")
            variants.append(self.canonical[:-3] + "なさいました")

        # Deduplicate while preserving order
        deduped = []
        seen = set()
        for v in variants:
            if v and v not in seen:
                seen.add(v)
                deduped.append(v)
        self.acceptable_variants = deduped
'''

FOOTER = '''
# Combined Pool across all 5 practical categories and 16 formulas
ALL_KEIGO_WORDS: list[KeigoWordEntry] = (
    SONKEIGO_IRREGULAR
    + KENJOUGO_IRREGULAR
    + SONKEIGO_O_NI_NARU
    + SONKEIGO_PASSIVE
    + SONKEIGO_GO_NI_NARU
    + SONKEIGO_KUDASAI
    + KENJOUGO_O_SURU
    + KENJOUGO_GO_SURU
    + KENJOUGO_MOUSHIAGERU
    + KENJOUGO_PERMISSIVE
    + BIKAGO_PREFIX_O
    + BIKAGO_PREFIX_GO
    + TEINEIGO_DESU_MASU
    + BUSINESS_PRONOUNS
    + BUSINESS_TIME_ADVERBS
    + BUSINESS_PHRASES
)

RULE_BASED_KEIGO: list[KeigoWordEntry] = (
    SONKEIGO_O_NI_NARU
    + SONKEIGO_PASSIVE
    + SONKEIGO_GO_NI_NARU
    + SONKEIGO_KUDASAI
    + KENJOUGO_O_SURU
    + KENJOUGO_GO_SURU
    + KENJOUGO_MOUSHIAGERU
    + KENJOUGO_PERMISSIVE
)

NOUN_ADJECTIVE_PREFIXES: list[KeigoWordEntry] = (
    BIKAGO_PREFIX_O
    + BIKAGO_PREFIX_GO
)

BUSINESS_WORDS: list[KeigoWordEntry] = (
    TEINEIGO_DESU_MASU
    + BUSINESS_PRONOUNS
    + BUSINESS_TIME_ADVERBS
    + BUSINESS_PHRASES
)

KEIGO_CATEGORY_MAP: dict[str, list[KeigoWordEntry]] = {
    "sonkeigo_irregular": SONKEIGO_IRREGULAR,
    "kenjougo_irregular": KENJOUGO_IRREGULAR,
    "rule_based": RULE_BASED_KEIGO,
    "noun_prefixes": NOUN_ADJECTIVE_PREFIXES,
    "business_words": BUSINESS_WORDS,
}


def get_all_keigo_vocab() -> list[KeigoWordEntry]:
    return ALL_KEIGO_WORDS


def get_sonkeigo_pool() -> list[KeigoWordEntry]:
    return [k for k in ALL_KEIGO_WORDS if k.target_type == "sonkeigo"]


def get_kenjougo_pool() -> list[KeigoWordEntry]:
    return [k for k in ALL_KEIGO_WORDS if k.target_type == "kenjougo"]


def get_rule_based_pool() -> list[KeigoWordEntry]:
    return RULE_BASED_KEIGO


def get_prefix_vocab_pool() -> list[KeigoWordEntry]:
    return NOUN_ADJECTIVE_PREFIXES


def get_business_vocab_pool() -> list[KeigoWordEntry]:
    return BUSINESS_WORDS


def get_easy_keigo_vocab() -> list[KeigoWordEntry]:
    return ALL_KEIGO_WORDS


def get_normal_keigo_vocab() -> list[KeigoWordEntry]:
    return ALL_KEIGO_WORDS


def get_hard_keigo_vocab() -> list[KeigoWordEntry]:
    return ALL_KEIGO_WORDS


def get_keigo_by_category(category: str) -> list[KeigoWordEntry]:
    if not category or category == "all":
        return ALL_KEIGO_WORDS
    if category in KEIGO_CATEGORY_MAP:
        return KEIGO_CATEGORY_MAP[category]
    if category in ("sonkeigo", "sonkeigo_irregular"):
        return [k for k in ALL_KEIGO_WORDS if k.target_type == "sonkeigo"]
    if category in ("kenjougo", "kenjougo_irregular"):
        return [k for k in ALL_KEIGO_WORDS if k.target_type == "kenjougo"]
    if category in ("rule", "rule_based"):
        return RULE_BASED_KEIGO
    if category in ("prefix", "prefixes", "noun_prefixes", "o_go"):
        return NOUN_ADJECTIVE_PREFIXES
    if category in ("business", "business_words"):
        return BUSINESS_WORDS
    return ALL_KEIGO_WORDS


def search_keigo(query: str) -> list[KeigoWordEntry]:
    if not query.strip():
        return ALL_KEIGO_WORDS
    q = query.lower().strip()
    primary = [
        k for k in ALL_KEIGO_WORDS
        if q in k.source_word.lower()
        or q in k.source_reading.lower()
        or q in k.canonical.lower()
        or q in k.canonical_reading.lower()
        or q in k.meaning_vi.lower()
        or any(q in syn.lower() for syn in k.acceptable_variants)
        or q in (k.triplet_sonkeigo or "").lower()
        or q in (k.triplet_kenjougo or "").lower()
        or q in (k.formula or "").lower()
    ]
    if primary:
        return primary
    return [
        k for k in ALL_KEIGO_WORDS
        if q in k.example_ja.lower()
        or q in k.example_vi.lower()
        or q in k.explanation_vi.lower()
    ]


def get_keigo_by_formula_id(formula_id: str) -> list[KeigoWordEntry]:
    """Returns all entries strictly matching a specific formula_id or group preset."""
    f = formula_id.lower().strip()
    if not f or f == "all":
        return ALL_KEIGO_WORDS
    if f in ("sonkeigo", "sonkeigo_all"):
        return [k for k in ALL_KEIGO_WORDS if k.target_type == "sonkeigo"]
    if f in ("kenjougo", "kenjougo_all"):
        return [k for k in ALL_KEIGO_WORDS if k.target_type == "kenjougo"]
    if f in ("bikago", "bikago_teineigo"):
        return [k for k in ALL_KEIGO_WORDS if k.category == "noun_prefixes" or k.formula_id.startswith("bikago") or k.formula_id == "teineigo_desu_masu"]
    if f in ("business", "business_all", "business_words"):
        return [k for k in ALL_KEIGO_WORDS if k.category == "business_words"]
    if f == "irregulars_only":
        return [k for k in ALL_KEIGO_WORDS if k.formula_id in ("sonkeigo_irregular", "kenjougo_irregular")]
    if f == "rules_only":
        return [k for k in ALL_KEIGO_WORDS if k.category == "rule_based"]
    if f in ("bikago_prefix", "prefix", "noun_prefixes"):
        return [k for k in ALL_KEIGO_WORDS if k.formula_id in ("bikago_prefix_o", "bikago_prefix_go") or k.category == "noun_prefixes"]
    return [k for k in ALL_KEIGO_WORDS if k.formula_id == f]
'''


def format_entry(entry: dict) -> str:
    lines = ["    KeigoWordEntry("]
    for key, val in entry.items():
        if isinstance(val, str):
            escaped = val.replace('\\', '\\\\').replace('"', '\\"')
            lines.append(f'        {key}="{escaped}",')
        elif isinstance(val, list):
            lines.append(f"        {key}={repr(val)},")
        elif val is None:
            lines.append(f"        {key}=None,")
        else:
            lines.append(f"        {key}={repr(val)},")
    lines.append("    ),")
    return "\n".join(lines)


def format_dataset(var_name: str, data: list[dict]) -> str:
    parts = [f"{var_name}: list[KeigoWordEntry] = ["]
    for entry in data:
        parts.append(format_entry(entry))
    parts.append("]\n")
    return "\n".join(parts)


def build_and_validate():
    formula_data_map = {
        "SONKEIGO_IRREGULAR": (SONKEIGO_IRREGULAR_DATA, "sonkeigo_irregular"),
        "KENJOUGO_IRREGULAR": (KENJOUGO_IRREGULAR_DATA, "kenjougo_irregular"),
        "SONKEIGO_O_NI_NARU": (SONKEIGO_O_NI_NARU_DATA, "sonkeigo_o_ni_naru"),
        "SONKEIGO_PASSIVE": (SONKEIGO_PASSIVE_DATA, "sonkeigo_passive"),
        "SONKEIGO_GO_NI_NARU": (SONKEIGO_GO_NI_NARU_DATA, "sonkeigo_go_ni_naru"),
        "SONKEIGO_KUDASAI": (SONKEIGO_KUDASAI_DATA, "sonkeigo_kudasai"),
        "KENJOUGO_O_SURU": (KENJOUGO_O_SURU_DATA, "kenjougo_o_suru"),
        "KENJOUGO_GO_SURU": (KENJOUGO_GO_SURU_DATA, "kenjougo_go_suru"),
        "KENJOUGO_MOUSHIAGERU": (KENJOUGO_MOUSHIAGERU_DATA, "kenjougo_moushiageru"),
        "KENJOUGO_PERMISSIVE": (KENJOUGO_PERMISSIVE_DATA, "kenjougo_permissive"),
        "BIKAGO_PREFIX_O": (BIKAGO_PREFIX_O_DATA, "bikago_prefix_o"),
        "BIKAGO_PREFIX_GO": (BIKAGO_PREFIX_GO_DATA, "bikago_prefix_go"),
        "TEINEIGO_DESU_MASU": (TEINEIGO_DESU_MASU_DATA, "teineigo_desu_masu"),
        "BUSINESS_PRONOUNS": (BUSINESS_PRONOUNS_DATA, "business_pronouns"),
        "BUSINESS_TIME_ADVERBS": (BUSINESS_TIME_ADVERBS_DATA, "business_time_adverbs"),
        "BUSINESS_PHRASES": (BUSINESS_PHRASES_DATA, "business_phrases"),
    }

    total_words = 0
    print("=== Validating Dataset Across 16 Formulas ===")
    for var_name, (data_list, expected_fid) in formula_data_map.items():
        count = len(data_list)
        total_words += count
        assert count >= 14, f"Error: {var_name} has {count} entries, expected at least 14!"
        for item in data_list:
            assert item.get("formula_id") == expected_fid, f"Formula id mismatch in {var_name}: {item.get('formula_id')} != {expected_fid}"
            assert item.get("source_word"), f"Missing source_word in {var_name}: {item}"
            assert item.get("canonical"), f"Missing canonical in {var_name}: {item}"
            assert item.get("meaning_vi"), f"Missing meaning_vi in {var_name}: {item}"
        print(f"  ✓ {var_name} ({expected_fid}): {count} entries")

    print(f"Total entries: {total_words}")
    assert total_words >= 250, f"Total entries {total_words} is less than 250!"

    # Assemble output file
    output_parts = [HEADER]
    for var_name, (data_list, _) in formula_data_map.items():
        output_parts.append(format_dataset(var_name, data_list))
    output_parts.append(FOOTER)

    full_code = "\n".join(output_parts)

    print(f"Writing to {TARGET_FILE} ({len(full_code)} characters)...")
    TARGET_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(full_code)
    print("Successfully written!")


if __name__ == "__main__":
    build_and_validate()
