"""Aizuchi scorer unit tests — timing, variety caps, register fit, rude/miss states."""

from app.domains.aizuchi.pools import classify_bc_type
from app.domains.aizuchi.pressure_profiles import next_window_profile, window_for_profile
from app.domains.aizuchi.scoring import AizuchiScoringPolicy


def _build(**kw):
    base = dict(
        reaction_latency_ms=320,
        window_ms=600,
        speech_confidence=0.85,
        bc_type="surprise",
        expected_types=["surprise", "empathy"],
        relation="casual_friend",
        transcript="マジで？",
        distinct_types=3,
        repeat_run=1,
        session_turns=4,
    )
    base.update(kw)
    return AizuchiScoringPolicy.build("aizuchi_reaction", **base)


def test_fast_correct_scores_high():
    a = _build()
    assert a.timing.score == 95.0
    assert a.appropriateness.score == 92.0
    assert a.overall.score >= 80


def test_miss_caps_overall():
    a = _build(reaction_latency_ms=None, speech_confidence=0.2, transcript="", bc_type="other", timed_out=True)
    assert a.overall.score <= 40.0
    assert a.timed_out is True


def test_rude_overlap_caps_overall():
    a = _build(overlap_rude=True)
    assert a.overall.score <= 45.0
    assert a.overlap_rude is True
    assert a.manner.score == 20.0


def test_un_variety_run_capped():
    a = _build(repeat_run=6, distinct_types=1, session_turns=6)
    assert a.variety.score <= 40.0


def test_hai_with_friends_capped():
    a = _build(bc_type="continuer", transcript="はい", expected_types=["surprise"])
    assert a.appropriateness.score <= 60.0


def test_casual_with_business_capped():
    a = _build(bc_type="surprise", transcript="マジで", relation="business_polite", expected_types=["continuer"])
    assert a.appropriateness.score <= 60.0


def test_low_vad_confidence_neutral():
    a = _build(speech_confidence=0.2)
    assert a.timing.score == 50.0
    assert a.timing.confidence == 0.3


def test_no_window_neutral():
    a = _build(window_ms=0)
    assert a.timing.score == 75.0


def test_warikomi_weights():
    a = AizuchiScoringPolicy.build(
        "warikomi_interrupt",
        reaction_latency_ms=400, window_ms=600, speech_confidence=0.9,
        bc_type="polite_interrupt", expected_types=["polite_interrupt"],
        relation="business_polite", transcript="すみません、ちょっとよろしいでしょうか",
    )
    assert a.overall.score >= 70


def test_classify_types():
    assert classify_bc_type("まじで") == "surprise"
    assert classify_bc_type("すみませんちょっとよろしいでしょうか") == "polite_interrupt"
    assert classify_bc_type("でどうしたの") == "followup"
    assert classify_bc_type("うんうん") == "continuer"
    assert classify_bc_type("確かに") == "empathy"
    assert classify_bc_type("でしょうか") == "other"  # 'で' inside word must not match
    assert classify_bc_type("") == "other"


def test_window_profiles():
    assert window_for_profile("normal") == 600
    assert window_for_profile("relaxed") == 900
    assert window_for_profile("reflex") == 350
    assert window_for_profile("unknown") == 600
    assert next_window_profile("normal", harder=True) == "fast"
    assert next_window_profile("normal", harder=False) == "relaxed"
    assert next_window_profile("reflex", harder=True) == "reflex"
