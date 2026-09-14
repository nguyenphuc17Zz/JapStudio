"""Unit tests for BCCWJ frequency dataset integration into Pitch Accent domain."""

import pytest
from app.domains.pitch.exercise_factory import PitchExerciseFactory
from app.domains.vocabulary.frequency_service import get_frequency_vocabulary_service


def test_bccwj_devoicing_word_extraction():
    svc = get_frequency_vocabulary_service()
    devoicing_words = svc.get_devoicing_words(tier=1)
    assert len(devoicing_words) > 50, "Should have dozens of devoicing candidates in Tier 1"
    
    first = devoicing_words[0]
    assert "word" in first
    assert "reading" in first
    assert "devoiced_mora" in first
    assert first["devoiced_mora"] in {"き", "く", "し", "す", "ち", "つ", "ひ", "ふ", "ぴ", "ぷ"}
    assert first["tier"] == 1


def test_pitch_contour_with_tier_filter():
    factory = PitchExerciseFactory()
    ex_tier1 = factory.generate_contour(tier=1)
    
    assert ex_tier1["canonical"] is not None
    assert ex_tier1["reading"] is not None
    assert len(ex_tier1["pitch_pattern"]) > 0
    assert len(ex_tier1["mora_breakdown"]) > 0
    assert ex_tier1["frequency_tier"] == 1
    assert ex_tier1["frequency_rank"] is not None
    assert ex_tier1["frequency_rank"] <= 1200


def test_pitch_contour_with_tier2_filter():
    factory = PitchExerciseFactory()
    ex_tier2 = factory.generate_contour(tier=2)
    
    assert ex_tier2["canonical"] is not None
    assert ex_tier2["frequency_tier"] == 2
    assert ex_tier2["frequency_rank"] is not None


def test_pitch_devoicing_with_tier_filter():
    factory = PitchExerciseFactory()
    ex_dev = factory.generate_devoicing(tier=1)
    
    assert ex_dev["canonical"] is not None
    assert ex_dev["devoicing_env"] is True
    assert "devoicing_info" in ex_dev
    assert ex_dev["devoicing_info"]["devoiced_mora"] in {"き", "く", "し", "す", "ち", "つ", "ひ", "ふ", "ぴ", "ぷ"}
    assert ex_dev["frequency_tier"] == 1


def test_pitch_recognition_with_bccwj():
    factory = PitchExerciseFactory()
    ex_rec = factory.generate_recognition(tier=1)
    
    assert ex_rec["prompt"] is not None
    assert "quiz_options" in ex_rec
    options = ex_rec["quiz_options"]
    assert len(options) >= 2
    assert any(opt["is_correct"] is True for opt in options)
    assert any(opt["is_correct"] is False for opt in options)


def test_pitch_contour_category_filter():
    factory = PitchExerciseFactory()
    ex = factory.generate_contour(category="daily_life")
    
    assert ex["canonical"] is not None
    assert ex.get("vocab_category") == "daily_life"
