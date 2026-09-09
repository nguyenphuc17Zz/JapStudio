"""Tests for Japanese Text Complexity & Readability Engine (Algorithm 12)."""

import pytest
from app.services.text_complexity_engine import TextComplexityEngine, TextComplexityReport


def test_empty_text_complexity():
    report = TextComplexityEngine.analyze("")
    assert report.total_characters == 0
    assert report.total_tokens == 0
    assert report.yules_k == 0.0
    assert report.readability_score == 100.0
    assert report.estimated_jlpt == "N5"


def test_elementary_japanese_text():
    # Simple N5 elementary sentence: mostly hiragana, simple kanji
    text = "わたしは がくせいです。まいにち にほんごを べんきょうします。"
    report = TextComplexityEngine.analyze(text)

    assert report.total_characters > 0
    assert report.kanji_density < 0.15
    assert report.hiragana_density > 0.60
    assert report.estimated_jlpt in ["N5", "N4"]
    assert report.complexity_level == "elementary"
    assert report.simpsons_diversity > 0.80


def test_advanced_academic_japanese_text():
    # Dense N1 academic / socioeconomic passage: high kanji density, formal terminology
    text = (
        "現代社会における人工知能の急速な発展は、労働市場の構造的変革をもたらし、"
        "高度な専門知識を有する技術者の需要を爆発的に増加させている。"
        "しかしながら、倫理的課題や法規制の整備は未だ不十分であり、早急な対策が望まれる。"
    )
    report = TextComplexityEngine.analyze(text)

    assert report.total_characters > 80
    assert report.kanji_density > 0.35
    assert report.readability_score < 45.0
    assert report.estimated_jlpt in ["N1", "N2"]
    assert report.complexity_level == "advanced"


def test_yules_k_repetition_sensitivity():
    # Extremely repetitive text (same 2 words repeated 10 times)
    repetitive_text = "ねこ ねこ ねこ ねこ ねこ ねこ ねこ ねこ ねこ ねこ"
    rep_report = TextComplexityEngine.analyze(repetitive_text)

    # Diverse text with 10 different words
    diverse_text = "いぬ ねこ とり さかな うし うま ひつじ さる とり ぶた"
    div_report = TextComplexityEngine.analyze(diverse_text)

    # In Yule's K, high K indicates severe vocabulary poverty/repetition; low K indicates rich variety
    assert rep_report.yules_k > div_report.yules_k
    assert rep_report.simpsons_diversity < div_report.simpsons_diversity


def test_to_dict_serialization():
    text = "日本語の作文を練習しています。"
    report = TextComplexityEngine.analyze(text)
    d = report.to_dict()

    assert "total_characters" in d
    assert "kanji_density" in d
    assert "yules_k" in d
    assert "estimated_jlpt" in d
    assert isinstance(d["yules_k"], float)
