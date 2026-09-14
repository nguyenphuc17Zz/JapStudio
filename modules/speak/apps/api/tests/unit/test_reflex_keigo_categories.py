import pytest
from app.domains.reflex.exercise_factory import ReflexExerciseFactory
from app.domains.keigo.keigo_vocab_pool import ALL_KEIGO_WORDS

def test_all_keigo_formulas_have_sufficient_candidates():
    factory = ReflexExerciseFactory()
    formula_ids = [
        "sonkeigo_irregular",
        "sonkeigo_o_ni_naru",
        "sonkeigo_passive",
        "sonkeigo_go_ni_naru",
        "sonkeigo_kudasai",
        "kenjougo_irregular",
        "kenjougo_o_suru",
        "kenjougo_go_suru",
        "kenjougo_moushiageru",
        "kenjougo_permissive",
        "bikago_prefix_o",
        "bikago_prefix_go",
        "teineigo_desu_masu",
        "business_pronouns",
        "business_time_adverbs",
        "business_phrases",
    ]
    for fid in formula_ids:
        # Every single formula should generate exercises with strictly that formula_id
        for _ in range(3):
            ex = factory.generate_keigo_vocabulary(keigo_category=fid)
            assert ex["formula_id"] == fid, f"Expected formula_id {fid}, but got {ex.get('formula_id')} for word {ex.get('prompt')}"

def test_keigo_multi_select_filtering():
    factory = ReflexExerciseFactory()
    selected_formulas = ["sonkeigo_o_ni_naru", "kenjougo_permissive"]
    filter_str = ",".join(selected_formulas)
    for _ in range(10):
        ex = factory.generate_keigo_vocabulary(keigo_category=filter_str)
        assert ex["formula_id"] in selected_formulas

def test_keigo_group_presets():
    factory = ReflexExerciseFactory()
    for _ in range(5):
        ex_sonkei = factory.generate_keigo_vocabulary(keigo_category="sonkeigo_all")
        assert ex_sonkei["target_type"] == "sonkeigo"

    for _ in range(5):
        ex_kenjou = factory.generate_keigo_vocabulary(keigo_category="kenjougo_all")
        assert ex_kenjou["target_type"] == "kenjougo"


def test_keigo_dataset_scale_and_variants():
    assert len(ALL_KEIGO_WORDS) >= 250, f"Expected at least 250 words, got {len(ALL_KEIGO_WORDS)}"
    
    # Check each formula has >= 14 entries
    formula_counts: dict[str, int] = {}
    for entry in ALL_KEIGO_WORDS:
        formula_counts[entry.formula_id] = formula_counts.get(entry.formula_id, 0) + 1
        # Check that acceptable_variants contains the canonical and reading
        assert entry.canonical in entry.acceptable_variants
        if entry.canonical_reading:
            assert entry.canonical_reading in entry.acceptable_variants
        # Check that example and hints are not empty
        assert entry.example_ja, f"Missing example_ja for {entry.source_word}"
        assert entry.example_vi, f"Missing example_vi for {entry.source_word}"
        assert entry.subject_hint_vi, f"Missing subject_hint_vi for {entry.source_word}"

    expected_formulas = [
        "sonkeigo_irregular",
        "sonkeigo_o_ni_naru",
        "sonkeigo_passive",
        "sonkeigo_go_ni_naru",
        "sonkeigo_kudasai",
        "kenjougo_irregular",
        "kenjougo_o_suru",
        "kenjougo_go_suru",
        "kenjougo_moushiageru",
        "kenjougo_permissive",
        "bikago_prefix_o",
        "bikago_prefix_go",
        "teineigo_desu_masu",
        "business_pronouns",
        "business_time_adverbs",
        "business_phrases",
    ]
    for fid in expected_formulas:
        count = formula_counts.get(fid, 0)
        assert count >= 14, f"Formula {fid} has only {count} entries, expected >= 14"

