"""Deterministic formulas & windows (Phase 14)."""

from datetime import datetime, timedelta, timezone

from app.services.analytics.common import (
    exercise_usefulness,
    outcome_metric_id,
    resolve_window,
    trend_from_delta,
)


def test_resolve_window_7d():
    now = datetime(2026, 8, 19, 12, 0, tzinfo=timezone.utc)
    window = resolve_window("7d", now=now)
    assert window.start == datetime(2026, 8, 13, 12, 0, tzinfo=timezone.utc)
    assert window.end == now + timedelta(days=1)
    assert window.mid == datetime(2026, 8, 17, 0, 0, tzinfo=timezone.utc)


def test_resolve_window_all_time_uses_earliest():
    now = datetime(2026, 8, 19, 12, 0, tzinfo=timezone.utc)
    window = resolve_window("all_time", now=now)
    assert window.start.year == 2020
    assert window.end == now + timedelta(days=1)


def test_exercise_usefulness_formula():
    assert (
        exercise_usefulness(completion=1.0, improvement=0.0, engagement=0.0, failure=0.0, skip=0.0)
        == 25.0
    )
    assert (
        exercise_usefulness(completion=1.0, improvement=1.0, engagement=1.0, failure=0.0, skip=0.0)
        == 75.0
    )
    assert (
        exercise_usefulness(completion=1.0, improvement=0.0, engagement=0.0, failure=1.0, skip=1.0)
        == 0.0
    )
    value = exercise_usefulness(
        completion=1.0, improvement=0.5, engagement=0.2, failure=0.1, skip=0.0
    )
    assert 0 <= value <= 100


def test_trend_and_metric_ids():
    assert trend_from_delta(5.0) == "up"
    assert trend_from_delta(-5.0) == "down"
    assert trend_from_delta(0.5) == "stable"
    assert trend_from_delta(None) is None
    assert outcome_metric_id("naturalness", "30d", "delta") == "outcome.naturalness.30d.delta"
