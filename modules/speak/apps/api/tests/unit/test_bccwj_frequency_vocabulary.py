"""Unit tests for BCCWJ high frequency vocabulary dataset and frequency service."""

import time
import pytest
from app.domains.vocabulary.bccwj_frequency_pool import (
    BCCWJ_FREQUENCY_WORDS,
    get_all_frequency_words,
    get_words_by_tier,
    get_words_by_category,
    search_frequency_words,
)
from app.domains.vocabulary.frequency_service import (
    BccwjFrequencyVocabularyService,
    get_frequency_vocabulary_service,
)


def test_bccwj_pool_loading():
    """Verify that BCCWJ frequency pool is properly populated with 2000+ words across all 3 tiers."""
    words = get_all_frequency_words()
    assert len(words) >= 2000, f"Expected >= 2000 words, found {len(words)}"

    tier1 = get_words_by_tier(1)
    assert len(tier1) >= 500, f"Expected >= 500 Tier 1 words, found {len(tier1)}"

    tier2 = get_words_by_tier(2)
    assert len(tier2) >= 1000, f"Expected >= 1000 Tier 2 words, found {len(tier2)}"

    tier3 = get_words_by_tier(3)
    assert len(tier3) >= 500, f"Expected >= 500 Tier 3 words, found {len(tier3)}"

    # Ensure rank ordering
    ranks = [w.rank for w in words]
    assert min(ranks) == 1
    assert max(ranks) >= 2000


def test_bccwj_keyword_search():
    """Verify keyword search finds words in Japanese and Vietnamese."""
    # Search by Vietnamese
    results_go = search_frequency_words("đi")
    assert len(results_go) >= 1
    assert any(w.word == "行く" for w in results_go)

    # Search by Japanese
    results_tel = search_frequency_words("連絡")
    assert len(results_tel) >= 1
    assert any(w.word == "連絡する" for w in results_tel)


def test_bccwj_frequency_service_performance():
    """Verify that BccwjFrequencyVocabularyService serves words in < 5ms (zero-latency)."""
    service = get_frequency_vocabulary_service()
    assert service.total_count >= 40

    start = time.perf_counter()
    word = service.get_next_word()
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert word is not None
    assert word.word
    assert elapsed_ms < 5.0, f"Query took {elapsed_ms:.2f}ms, must be < 5ms"


def test_bccwj_to_exercise_dict():
    """Verify that to_exercise_dict formats word with ranking metadata."""
    service = get_frequency_vocabulary_service()
    word = service.get_next_word(category="action_verbs")
    ex = service.to_exercise_dict(word, timer_ms=3500)

    assert "frequency_rank" in ex
    assert "frequency_tier" in ex
    assert ex["canonical"] == word.word
    assert ex["direction"] == "vi_to_ja"
    assert ex["timer_limit_ms"] == 3500


def test_bccwj_situational_keywords():
    """Verify that BccwjFrequencyVocabularyService provides rich situational keywords."""
    service = get_frequency_vocabulary_service()
    wp_keywords = service.get_situational_keywords("workplace", count=3)
    assert len(wp_keywords) == 3
    for kw in wp_keywords:
        assert "word" in kw
        assert "reading" in kw
        assert "meaning" in kw

    food_keywords = service.get_situational_keywords("food", count=2)
    assert len(food_keywords) == 2


def test_bccwj_regular_keigo_entries():
    """Verify regular keigo derivation for suru verbs, regular verbs and noun prefixes."""
    service = get_frequency_vocabulary_service()
    entries = service.get_regular_keigo_entries()
    assert len(entries) >= 10

    types = {e["type"] for e in entries}
    assert "suru_verb" in types
    assert "regular_verb" in types
    assert "noun_prefix" in types

    # Check suru verb derivation
    suru = next(e for e in entries if e["type"] == "suru_verb")
    assert "sonkeigo" in suru
    assert "kenjougo" in suru


def test_keigo_prefix_bccwj_enrichment():
    """Verify お and ご honorific prefixes work accurately on BCCWJ high frequency vocabulary."""
    from app.domains.keigo.transformation_engine import get_honorific_prefix

    res_mitsumori = get_honorific_prefix("見積もり")
    assert res_mitsumori["prefix"] == "お"
    assert res_mitsumori["result"] == "お見積もり"

    res_shiharai = get_honorific_prefix("支払い")
    assert res_shiharai["prefix"] == "お"
    assert res_shiharai["result"] == "お支払い"

    res_keiyaku = get_honorific_prefix("契約")
    assert res_keiyaku["prefix"] == "ご"
    assert res_keiyaku["result"] == "ご契約"

    res_chuumon = get_honorific_prefix("注文")
    assert res_chuumon["prefix"] == "ご"
    assert res_chuumon["result"] == "ご注文"


def test_reflex_exercise_factory_tier_filtering():
    """Verify that exercise factory correctly respects tier filter."""
    from app.domains.reflex.exercise_factory import ReflexExerciseFactory

    factory = ReflexExerciseFactory()
    ex_tier1 = factory.generate_vocabulary(tier=1)
    assert ex_tier1["tier"] == 1
    assert ex_tier1["rank"] <= 1000

