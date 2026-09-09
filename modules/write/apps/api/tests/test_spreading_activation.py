"""Tests for ACT-R Spreading Activation Engine (Algorithm 15)."""

import math
from datetime import datetime, timedelta, timezone
import pytest
from app.services.spreading_activation_engine import (
    SpreadingActivationEngine,
    spreading_activation_engine,
)


def test_base_level_learning_and_decay():
    engine = SpreadingActivationEngine(decay=0.5)
    now = datetime.now(timezone.utc)

    # Freshly practiced memory (today) with 5 occurrences
    b_recent = engine.compute_base_level(
        occurrence_count=5,
        last_seen_at=now - timedelta(hours=1),
        now=now,
    )

    # Old memory (60 days ago) with 1 occurrence
    b_old = engine.compute_base_level(
        occurrence_count=1,
        last_seen_at=now - timedelta(days=60),
        now=now,
    )

    # Recent, frequently practiced memory must have significantly higher base-level activation
    assert b_recent > b_old
    assert b_recent > 1.0
    assert b_old < 0.0


def test_associative_spreading_resonance():
    engine = spreading_activation_engine

    context = "先生に失礼のないように丁寧な敬語でメールを送りたい"

    # Resonant memory about keigo in emails containing relevant Japanese terms
    resonant_memory = "Người học thường nhầm lẫn khi dùng 敬語 trong メール gửi 先生"
    # Unrelated memory about kanji strokes
    unrelated_memory = "Cách viết nét phẩy của chữ 木 và chữ 本"

    res_strength = engine.compute_associative_strength(context, resonant_memory)
    unrel_strength = engine.compute_associative_strength(context, unrelated_memory)

    assert res_strength > unrel_strength
    assert res_strength > 0.0


def test_total_activation_and_retrieval_probability():
    engine = spreading_activation_engine
    now = datetime.now(timezone.utc)

    # High activation case: high frequency, recent, resonant context
    act_high = engine.compute_activation(
        occurrence_count=10,
        last_seen_at=now,
        context_text="助詞 は が 使い分け",
        memory_content="Lỗi dùng sai trợ từ は và が trong câu miêu tả",
        importance_weight=1.0,
        now=now,
    )
    prob_high = engine.retrieval_probability(act_high)

    # Low activation case: low frequency, old, no resonance
    act_low = engine.compute_activation(
        occurrence_count=1,
        last_seen_at=now - timedelta(days=90),
        context_text="助詞 は が 使い分け",
        memory_content="Tập viết thể mệnh lệnh cho tình huống khẩn cấp",
        importance_weight=0.2,
        now=now,
    )
    prob_low = engine.retrieval_probability(act_low)

    assert act_high > act_low
    assert prob_high > 0.70
    assert prob_low < 0.35
