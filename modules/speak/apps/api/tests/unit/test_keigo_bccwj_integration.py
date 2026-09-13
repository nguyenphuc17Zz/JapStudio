"""Unit tests for BCCWJ frequency dataset integration into Keigo domain."""

import pytest
from app.domains.vocabulary.frequency_service import get_frequency_vocabulary_service
from app.domains.keigo.dynamic_generator import AIKeigoGenerator


def test_bccwj_regular_keigo_entries_tier_filtering():
    svc = get_frequency_vocabulary_service()
    
    tier1_entries = svc.get_regular_keigo_entries(tier=1)
    assert len(tier1_entries) > 50, "Should have dozens of regular keigo candidates in Tier 1"
    for e in tier1_entries[:20]:
        assert e["tier"] == 1
        assert "rank" in e
        assert e["rank"] <= 1000
        assert e["type"] in {"suru_verb", "regular_verb", "noun_prefix"}

    tier2_entries = svc.get_regular_keigo_entries(tier=2)
    assert len(tier2_entries) > 50, "Should have regular keigo candidates in Tier 2"
    for e in tier2_entries[:20]:
        assert e["tier"] == 2
        assert 1000 < e["rank"] <= 3000


def test_bccwj_regular_keigo_entries_category_filtering():
    svc = get_frequency_vocabulary_service()
    
    action_entries = svc.get_regular_keigo_entries(category="action_verbs")
    assert len(action_entries) > 0
    for e in action_entries:
        assert e["category"] == "action_verbs"
        assert e["type"] in {"suru_verb", "regular_verb"}


def test_bccwj_keigo_business_words():
    svc = get_frequency_vocabulary_service()
    
    biz_tier1 = svc.get_keigo_business_words(tier=1)
    assert len(biz_tier1) > 0
    for b in biz_tier1[:10]:
        assert b["tier"] == 1
        assert "word" in b
        assert "meaning_vi" in b


@pytest.mark.asyncio
async def test_dynamic_keigo_vocab_blitz_with_tier():
    # Test generator without db session by using _generate_dynamic_vocab_blitz directly
    gen = AIKeigoGenerator(db=None)
    
    ex_tier1 = await gen._generate_dynamic_vocab_blitz(
        difficulty="normal",
        pressure_level="normal",
        user_id="test_user",
        tier=1,
    )
    
    assert ex_tier1["canonical"] is not None
    assert ex_tier1["prompt"] is not None
    assert "frequency_tier" in ex_tier1
    assert ex_tier1["frequency_tier"] == 1
    assert "frequency_rank" in ex_tier1
    assert ex_tier1["frequency_rank"] is not None


@pytest.mark.asyncio
async def test_dynamic_keigo_vocab_blitz_with_tier2():
    gen = AIKeigoGenerator(db=None)
    
    ex_tier2 = await gen._generate_dynamic_vocab_blitz(
        difficulty="normal",
        pressure_level="normal",
        user_id="test_user",
        tier=2,
    )
    
    assert ex_tier2["canonical"] is not None
    assert ex_tier2["frequency_tier"] == 2


def test_keigo_whitelist_purity():
    """Verifies that 100% of Keigo entries are authentic real-life words and contain NO unnatural words."""
    svc = get_frequency_vocabulary_service()
    all_keigo_entries = svc.get_regular_keigo_entries()

    # Unnatural/academic/non-volitional words that must NEVER be in Keigo transformation pool
    unnatural_words = {
        "経済", "現象", "市場", "環境", "歴史", "物質", "技術", "人口", "国家",
        "倒れる", "落ちる", "生じる", "似る", "至る", "枯れる", "折れる", "濡れる",
    }

    found_words = {e["source_word"] for e in all_keigo_entries}

    for forbidden in unnatural_words:
        assert forbidden not in found_words, f"Forbidden non-keigo word '{forbidden}' found in keigo pool!"

    # Verify essential workplace words exist
    assert "待つ" in found_words
    assert "連絡する" in found_words
    assert "説明する" in found_words
    assert "名前" in found_words
    assert "電話" in found_words
    assert "家族" in found_words


def test_transformation_engine_kudasai_and_extended_formulas():
    """Verify that transformation engine generates Kudasai request forms and Moushiageru declarations."""
    from app.domains.keigo.transformation_engine import KeigoTransformationEngine

    engine = KeigoTransformationEngine()

    # 1. Sonkeigo Kudasai for regular verb (待つ)
    son_matsu = engine._get_sonkeigo_variants("待つ", "待つ", None)
    assert "お待ちください" in son_matsu
    assert "お待ちくださいませ" in son_matsu
    assert "お待ちいただけますでしょうか" in son_matsu

    # 2. Sonkeigo Kudasai for suru verb (確認する)
    son_kakunin = engine._get_sonkeigo_variants("確認する", "確認する", None)
    assert "ご確認ください" in son_kakunin
    assert "ご確認くださいませ" in son_kakunin
    assert "ご確認いただけますでしょうか" in son_kakunin

    # 3. Sonkeigo Kudasai for irregular verb (見る)
    overrides_miru = {"sonkeigo": "ご覧になる", "kenjougo": "拝見する", "teineigo": "みます"}
    son_miru = engine._get_sonkeigo_variants("見る", "見る", overrides_miru)
    assert "ご覧ください" in son_miru

    # 4. Kenjougo Moushiageru (案内する / 待つ)
    ken_annai = engine._get_kenjougo_variants("案内する", "案内する", None)
    assert "ご案内申し上げます" in ken_annai

    ken_matsu = engine._get_kenjougo_variants("待つ", "待つ", None)
    assert "お待ち申し上げます" in ken_matsu


@pytest.mark.asyncio
async def test_dynamic_keigo_vocab_blitz_with_formula_filter():
    gen = AIKeigoGenerator(db=None)

    # 1. Test Bikago prefix formula
    ex_bikago = await gen._generate_dynamic_vocab_blitz(
        difficulty="normal",
        pressure_level="normal",
        user_id="test_user",
        formulas=["bikago_prefix"],
    )
    assert ex_bikago["canonical"].startswith("お") or ex_bikago["canonical"].startswith("ご")
    assert "Mỹ Từ" in ex_bikago["title"] or "お" in ex_bikago["title"] or "ご" in ex_bikago["title"]

    # 2. Test Kudasai request formula
    ex_kudasai = await gen._generate_dynamic_vocab_blitz(
        difficulty="normal",
        pressure_level="normal",
        user_id="test_user",
        formulas=["sonkeigo_kudasai"],
    )
    assert ex_kudasai["canonical"].endswith("ください")

    # 3. Test Moushiageru formula
    ex_moushiage = await gen._generate_dynamic_vocab_blitz(
        difficulty="normal",
        pressure_level="normal",
        user_id="test_user",
        formulas=["kenjougo_moushiageru"],
    )
    assert ex_moushiage["canonical"].endswith("申し上げます")

    # 4. Test Permissive formula
    ex_permissive = await gen._generate_dynamic_vocab_blitz(
        difficulty="normal",
        pressure_level="normal",
        user_id="test_user",
        formulas=["kenjougo_permissive"],
    )
    assert "ていただきます" in ex_permissive["canonical"]

    # 5. Test Irregular Sonkeigo & Kenjougo formulas
    ex_son_irreg = await gen._generate_dynamic_vocab_blitz(
        difficulty="normal",
        pressure_level="normal",
        user_id="test_user",
        formulas=["sonkeigo_irregular"],
    )
    assert ex_son_irreg["canonical"] is not None

    ex_ken_irreg = await gen._generate_dynamic_vocab_blitz(
        difficulty="normal",
        pressure_level="normal",
        user_id="test_user",
        formulas=["kenjougo_irregular"],
    )
    assert ex_ken_irreg["canonical"] is not None



