"""Unit tests for Collocation Intelligence & PMI Engine (Algorithm 20)."""

from app.services.collocation_pmi_engine import (
    CollocationClassification,
    CollocationPMIEngine,
)


def test_pmi_llr_mathematical_properties() -> None:
    engine = CollocationPMIEngine(corpus_size=1_000_000)
    # Strongly associated words: k11=4000, ku=5000, kv=6000, N=1000000
    pmi, npmi, g2 = engine.calculate_pmi_llr(4000, 5000, 6000, 1_000_000)

    # PMI should be positive and substantial
    assert pmi > 5.0
    assert 0.0 < npmi <= 1.0
    # G^2 statistic should be highly significant (> 10.828 for p < 0.001)
    assert g2 > 1000.0


def test_zero_cooccurrence_pmi() -> None:
    engine = CollocationPMIEngine()
    pmi, npmi, g2 = engine.calculate_pmi_llr(0, 100, 100, 1_000_000)
    assert pmi == -float("inf")
    assert npmi == -1.0
    assert g2 == 0.0


def test_canonical_collocation_evaluation() -> None:
    engine = CollocationPMIEngine()
    metrics = engine.evaluate_pair("傘", "差す")

    assert metrics.classification == CollocationClassification.IDIOMATIC
    assert metrics.is_significant is True
    assert metrics.npmi >= 0.45
    assert metrics.g2_statistic > 10.828
    assert "Chuẩn bản ngữ" in metrics.explanation_vi or "chuẩn bản ngữ" in metrics.explanation_vi.lower()


def test_unnatural_transfer_detection() -> None:
    engine = CollocationPMIEngine()
    metrics = engine.evaluate_pair("傘", "着る")

    assert metrics.classification == CollocationClassification.UNNATURAL
    assert metrics.recommended_pair == "傘を差す"
    assert "không dùng 「着る」" in metrics.explanation_vi


def test_scan_text_for_collocations_and_errors() -> None:
    engine = CollocationPMIEngine()
    text = "雨が降ってきたので傘を差した。薬を食べた後で相槌を打つ。"

    results = engine.scan_text(text)
    classifications = [r.classification for r in results]

    assert CollocationClassification.IDIOMATIC in classifications
    assert CollocationClassification.UNNATURAL in classifications

    unnatural = [r for r in results if r.classification == CollocationClassification.UNNATURAL]
    assert len(unnatural) >= 1
    assert unnatural[0].w1 == "薬"
    assert unnatural[0].w2 == "食べる"
    assert unnatural[0].recommended_pair == "薬を飲む"
