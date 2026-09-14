"""Interpret factory tests — deterministic pools, scaffold handling, no repetition bursts."""

from app.domains.interpret.exercise_factory import InterpretExerciseFactory
from app.domains.interpret.pools import get_seed_pool


def test_build_word():
    f = InterpretExerciseFactory()
    data = f.build(sub_mode="interpret_word", scaffold="keyword_hint")
    assert data["prompt_vi"]
    assert data["expected_ja_keywords"]
    assert data["reference_ja"]
    assert data["timer_limit_ms"] == 8000
    assert not data["blind"]


def test_build_sentence_blind():
    f = InterpretExerciseFactory()
    data = f.build(sub_mode="interpret_sentence", scaffold="none")
    assert data["blind"] is True
    assert data["expected_ja_keywords"]  # still stored for scoring
    assert data["timer_limit_ms"] == 20000


def test_build_situation_timer():
    f = InterpretExerciseFactory()
    data = f.build(sub_mode="interpret_situation", scaffold="keyword_hint")
    assert data["timer_limit_ms"] == 30000
    assert data["situation_vi"]


def test_no_repetition_burst():
    f = InterpretExerciseFactory()
    seen = set()
    for _ in range(8):
        d = f.build(sub_mode="interpret_sentence")
        seen.add(d["prompt_vi"])
    assert len(seen) >= 6


def test_seed_pool_routing():
    assert len(get_seed_pool("interpret_word")) == 12
    assert len(get_seed_pool("interpret_sentence")) == 9
    assert len(get_seed_pool("interpret_situation")) == 9
