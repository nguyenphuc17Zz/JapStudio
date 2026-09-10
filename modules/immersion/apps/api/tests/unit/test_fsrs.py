import random
import pytest

from app.services import fsrs
from app.services.fsrs import (
    DEFAULT_W,
    forgetting_curve,
    init_difficulty,
    init_stability,
    next_interval_days,
    preview_intervals,
    schedule,
    init_schedule,
    apply_fuzz,
    band_shuffle,
)
from app.services.review_scheduler import ReviewScheduler


def test_interval_at_default_retention_equals_stability():
    for s in (0.5, 1.0, 2.3065, 10.0, 100.0):
        assert next_interval_days(s, 0.9) == pytest.approx(s, rel=1e-9)


def test_forgetting_curve_hits_retention_at_stability():
    assert forgetting_curve(10.0, 10.0) == pytest.approx(0.9, rel=1e-9)
    assert forgetting_curve(0.0, 5.0) == pytest.approx(1.0)
    assert forgetting_curve(30.0, 5.0) < 0.9


def test_init_monotonic_by_rating():
    stabilities = [init_stability(g) for g in (1, 2, 3, 4)]
    assert stabilities == sorted(stabilities)
    difficulties = [init_difficulty(g) for g in (1, 2, 3, 4)]
    assert difficulties == sorted(difficulties, reverse=True)
    for d in difficulties:
        assert 1.0 <= d <= 10.0


def test_preview_monotonic_and_bounded():
    for is_new in (True, False):
        pv = preview_intervals(4.0, 5.0, is_new=is_new)
        assert set(pv) == {"again", "hard", "good", "easy"}
        assert pv["again"] <= pv["hard"] <= pv["good"] <= pv["easy"]
        assert all(v >= 1 for v in pv.values())


def test_retention_changes_intervals():
    # Lower retention = tolerate more forgetting = longer intervals.
    low = preview_intervals(10.0, 5.0, retention=0.8)
    high = preview_intervals(10.0, 5.0, retention=0.95)
    assert low["good"] >= high["good"]
    assert low["easy"] >= high["easy"]
    assert high["good"] >= 1


def test_difficulty_always_clamped():
    for rating in (1, 2, 3, 4):
        res = schedule(1.0, 1.0, rating, elapsed_days=30.0)
        assert 1.0 <= res["new_d"] <= 10.0
        res = schedule(300.0, 10.0, rating, elapsed_days=0.0)
        assert 1.0 <= res["new_d"] <= 10.0
        assert res["new_s"] >= fsrs.S_MIN


def test_forget_shrinks_stability_and_recalls_grow_it():
    before = 10.0
    forgot = schedule(before, 5.0, 1, elapsed_days=30.0)
    remembered = schedule(before, 5.0, 3, elapsed_days=10.0)
    assert forgot["new_s"] < before
    assert remembered["new_s"] > before


def test_again_does_not_reset_reps_in_facade():
    _, _, _, _, new_reps, new_lapses = ReviewScheduler.calculate_next_schedule(
        1, current_stability=5.0, current_difficulty=5.0, reps=4, lapses=2
    )
    assert new_reps == 5
    assert new_lapses == 3


def test_facade_first_rating_uses_init_branch():
    s, d, ivl, _, reps, _ = ReviewScheduler.calculate_next_schedule(3, reps=0)
    assert (s, d, ivl) == (
        init_schedule(3)["new_s"], init_schedule(3)["new_d"], init_schedule(3)["interval_days"]
    )
    assert reps == 1


def test_fuzz_bounds_and_determinism():
    rng = random.Random("seed-1")
    for raw in (3.0, 10.0, 60.0, 400.0):
        assert apply_fuzz(raw, rng) >= 1
    a = apply_fuzz(30.0, random.Random("x"))
    b = apply_fuzz(30.0, random.Random("x"))
    assert a == b
    # No fuzz under 2.5 days
    assert apply_fuzz(1.2, random.Random("x")) == 1
    assert apply_fuzz(2.0, random.Random("x")) == 2


def test_max_interval_cap_respected():
    res = schedule(500.0, 1.0, 4, elapsed_days=500.0, max_interval=30)
    assert res["interval_days"] <= 30


def test_band_shuffle_stable_and_complete():
    keys = list(range(10))
    a = band_shuffle(keys, 4, random.Random("day-1"))
    b = band_shuffle(keys, 4, random.Random("day-1"))
    c = band_shuffle(keys, 4, random.Random("day-2"))
    assert sorted(a) == keys
    assert a == b
    # Bands preserved: first band only contains 0..3
    assert set(a[:4]) == {0, 1, 2, 3}


def test_default_weights_unchanged():
    assert len(DEFAULT_W) == 17
    assert DEFAULT_W[0] == pytest.approx(0.212)
    assert DEFAULT_W[4] == pytest.approx(6.4133)
