"""Builder scorer unit tests — coverage, connection, register fit, blind bonus."""

from app.domains.builder.pools import ASSEMBLE_SEEDS, EXPAND_SEEDS, REPAIR_SEEDS, coverage_of
from app.domains.builder.scoring import BuilderScoringPolicy, split_clauses


def _build(**kw):
    base = dict(
        transcript="昨日友達と見た映画がめっちゃ面白くてさ",
        keywords=["昨日", "映画", "友達", "面白い"],
        focus_skill="te_chain",
        expected_connectors=["て"],
        relation="casual_friend",
        reaction_latency_ms=8000,
        timer_limit_ms=25000,
        speech_confidence=0.85,
    )
    base.update(kw)
    return BuilderScoringPolicy.build("sentence_assemble", **base)


def test_good_sentence_scores_high():
    a = _build()
    assert a.coverage.score == 95.0
    assert a.connection.score >= 85
    assert a.naturalness.score >= 85
    assert a.overall.score >= 80
    assert a.keywords_used == ["昨日", "映画", "友達", "面白い"]


def test_short_sentence_penalized():
    a = _build(transcript="映画を見た")
    assert a.coverage.score <= 40.0
    assert a.connection.score < 60.0
    assert a.overall.score < 60.0


def test_miss_caps_overall():
    a = _build(transcript="", timed_out=True, reaction_latency_ms=None, speech_confidence=0)
    assert a.overall.score <= 35.0
    assert a.timed_out is True


def test_textbook_polite_with_friends_capped():
    a = _build(transcript="昨日は映画を見ました、とても面白かったです", focus_skill="contraction")
    assert a.naturalness.score <= 65.0


def test_business_register_ok():
    a = BuilderScoringPolicy.build(
        "sentence_assemble",
        transcript="資料を確認しましたので明日提出します",
        keywords=["資料", "確認", "明日", "提出"],
        focus_skill="te_chain", expected_connectors=["て"],
        relation="business_polite",
        reaction_latency_ms=9000, timer_limit_ms=25000, speech_confidence=0.9,
    )
    assert a.naturalness.score >= 85
    assert a.overall.score >= 70


def test_blind_bonus():
    plain = _build()
    blind = _build(blind=True)
    assert blind.overall.score > plain.overall.score


def test_hint_reduces_score():
    assisted = _build(independence_level="assisted_hint")
    indep = _build()
    assert assisted.overall.score < indep.overall.score


def test_relative_clause_detection():
    a = BuilderScoringPolicy.build(
        "sentence_assemble",
        transcript="昨日買った本が面白くて読んでいる",
        keywords=["昨日買う", "本", "面白い", "読む"],
        focus_skill="relative_clause", expected_connectors=[],
        relation="casual_friend",
        reaction_latency_ms=9000, timer_limit_ms=25000, speech_confidence=0.9,
    )
    assert a.connection.score >= 85


def test_expand_without_expansion():
    a = BuilderScoringPolicy.build(
        "sentence_expand",
        transcript="疲れた",
        keywords=[], focus_skill="nominalization", expected_connectors=[],
        relation="casual_friend",
        reaction_latency_ms=4000, timer_limit_ms=20000, speech_confidence=0.9,
    )
    assert a.coverage.score <= 50.0


def test_coverage_partial():
    used, missing = coverage_of("映画を見た", ["昨日", "映画", "友達", "面白い"])
    assert "映画" in used
    assert set(missing) == {"昨日", "友達", "面白い"}


def test_clause_spans_split():
    spans = split_clauses("昨日見た映画が面白くてまた行きたい", ["昨日", "映画"])
    kinds = [s.kind for s in spans]
    assert "connector" in kinds
    assert "keyword" in kinds
    assert len(spans) >= 3


def test_pool_sizes():
    assert len(ASSEMBLE_SEEDS) == 12
    assert len(EXPAND_SEEDS) == 9
    assert len(REPAIR_SEEDS) == 9
    for s in ASSEMBLE_SEEDS + EXPAND_SEEDS + REPAIR_SEEDS:
        assert s["focus_skill"] in ("te_chain", "relative_clause", "conditional", "nominalization", "contraction")
