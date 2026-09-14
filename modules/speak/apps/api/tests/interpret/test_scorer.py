"""Interpret scorer unit tests — fidelity, word order, Vietglish flags, blind bonus."""

from app.domains.interpret.pools import (
    SENTENCE_SEEDS,
    SITUATION_SEEDS,
    WORD_SEEDS,
    detect_vietglish,
    fidelity_of,
)
from app.domains.interpret.scoring import InterpretScoringPolicy


def _build(**kw):
    base = dict(
        transcript="今朝電車が遅れちゃって、会社に遅刻しちゃった",
        expected_keywords=["今朝", "電車", "遅れる", "遅刻"],
        relation="casual_friend",
        reaction_latency_ms=9000,
        timer_limit_ms=20000,
        speech_confidence=0.9,
    )
    base.update(kw)
    return InterpretScoringPolicy.build("interpret_sentence", **base)


def test_good_interpretation_scores_high():
    a = _build()
    assert a.fidelity.score >= 75
    assert a.overall.score >= 70
    assert a.vietglish_flags == []


def test_missing_all_ideas_caps_hard():
    a = _build(transcript="今日はいい天気ですね", expected_keywords=["今朝", "電車", "遅れる", "遅刻"])
    assert a.overall.score <= 35.0


def test_partial_ideas_capped():
    a = _build(transcript="今朝電車に乗った", expected_keywords=["今朝", "電車", "遅れる", "遅刻"])
    assert a.overall.score <= 55.0


def test_miss_caps_overall():
    a = _build(transcript="", timed_out=True, reaction_latency_ms=None, speech_confidence=0)
    assert a.overall.score <= 35.0
    assert a.timed_out is True


def test_watashi_overuse_flagged():
    flags = detect_vietglish("私は昨日私は友達と私は映画を見た", None)
    assert "watashi_overuse" in flags
    a = _build(transcript="私は昨日私は友達と私は映画を見た")
    assert a.word_order.score <= 65.0


def test_missing_particle_flagged():
    flags = detect_vietglish("昨日友達映画面白楽日曜日", None)
    assert "missing_particle" in flags


def test_desu_overuse_casual_flagged():
    flags = detect_vietglish("昨日は映画を見ました、とても面白かったです", "casual_friend")
    assert "desu_overuse_casual" in flags
    a = _build(
        transcript="昨日は映画を見ました、とても面白かったです",
        expected_keywords=["昨日", "映画", "面白い"],
    )
    assert a.naturalness.score <= 65.0


def test_business_register_ok():
    a = InterpretScoringPolicy.build(
        "interpret_sentence",
        transcript="資料を確認しましたので、明日提出いたします",
        expected_keywords=["資料", "確認", "明日", "提出"],
        relation="business_polite",
        reaction_latency_ms=9000, timer_limit_ms=20000, speech_confidence=0.9,
    )
    assert a.naturalness.score >= 85
    assert a.overall.score >= 70


def test_blind_bonus():
    plain = _build()
    blind = _build(blind=True)
    assert blind.overall.score > plain.overall.score


def test_word_mode_weights_fidelity():
    a = InterpretScoringPolicy.build(
        "interpret_word",
        transcript="休暇を取ります",
        expected_keywords=["休暇", "取る"],
        relation="business_polite",
        reaction_latency_ms=2500, timer_limit_ms=8000, speech_confidence=0.9,
    )
    assert a.fidelity.score == 95.0
    assert a.overall.score >= 75


def test_fidelity_map():
    hit, missing, fmap = fidelity_of("今朝電車に乗った", ["今朝", "電車", "遅れる"])
    assert set(hit) == {"今朝", "電車"}
    assert missing == ["遅れる"]
    assert len(fmap) == 3
    assert fmap[0]["hit"] is True and fmap[2]["hit"] is False


def test_pool_sizes_and_balance():
    assert len(WORD_SEEDS) == 12
    assert len(SENTENCE_SEEDS) == 9
    assert len(SITUATION_SEEDS) == 9
    biz = sum(1 for s in WORD_SEEDS + SENTENCE_SEEDS + SITUATION_SEEDS if s["relation"] == "business_polite")
    cas = sum(1 for s in WORD_SEEDS + SENTENCE_SEEDS + SITUATION_SEEDS if s["relation"] == "casual_friend")
    assert biz >= 12 and cas >= 12  # ~50/50
    for s in WORD_SEEDS + SENTENCE_SEEDS + SITUATION_SEEDS:
        assert s["prompt_vi"] and s["expected_ja_keywords"] and s["reference_ja"]
