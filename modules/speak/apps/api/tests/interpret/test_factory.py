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


import pytest
from unittest.mock import AsyncMock, MagicMock
from app.domains.interpret.dynamic_generator import AIInterpretGenerator


@pytest.mark.asyncio
async def test_generator_force_ai_parameter():
    db = MagicMock()
    generator = AIInterpretGenerator(db)
    generator._ai_generate = AsyncMock(return_value={
        "title": "越日文",
        "objective": "Dịch Việt→Nhật",
        "prompt_vi": "Hôm nay tôi bận lắm.",
        "expected_ja_keywords": ["今日", "忙しい"],
        "reference_ja": "今日はとても忙しいです。",
    })

    # When force_ai=True, _ai_generate is called with force_ai=True and generation_source is "ai"
    result = await generator.generate_dynamic_exercise(
        sub_mode="interpret_sentence",
        force_ai=True,
    )
    assert result["generation_source"] == "ai"
    assert result["is_fallback"] is False
    assert result["prompt_vi"] == "Hôm nay tôi bận lắm."
    generator._ai_generate.assert_called_once()
    assert generator._ai_generate.call_args.kwargs.get("force_ai") is True

