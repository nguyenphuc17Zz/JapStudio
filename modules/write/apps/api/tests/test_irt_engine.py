"""Unit tests for Item Response Theory (2PL IRT) & CAT Engine (Algorithm 21)."""

import pytest
from app.services.irt_engine import IRTEngine, IRTItem


def test_2pl_probability_properties() -> None:
    engine = IRTEngine()
    item = IRTItem(item_id="item-1", difficulty=1.0, discrimination=1.5)

    # At theta == b, probability must be exactly 0.5
    prob_at_b = engine.probability(1.0, item)
    assert pytest.approx(prob_at_b, abs=1e-5) == 0.5

    # At theta > b, probability must be > 0.5
    prob_high = engine.probability(2.5, item)
    assert prob_high > 0.90

    # At theta < b, probability must be < 0.5
    prob_low = engine.probability(-0.5, item)
    assert prob_low < 0.10


def test_fisher_information_peak_at_difficulty() -> None:
    engine = IRTEngine()
    item = IRTItem(item_id="item-math", difficulty=0.5, discrimination=2.0)

    # Maximum information should occur at theta == b
    info_peak = engine.item_information(0.5, item)
    info_left = engine.item_information(0.0, item)
    info_right = engine.item_information(1.0, item)

    assert info_peak > info_left
    assert info_peak > info_right

    # Mathematical peak value: 0.25 * D^2 * a^2
    expected_peak = 0.25 * (1.702 ** 2) * (2.0 ** 2)
    assert pytest.approx(info_peak, abs=1e-4) == expected_peak


def test_ability_estimation_map_convergence() -> None:
    engine = IRTEngine()
    items = [
        IRTItem(item_id="q1", difficulty=-1.0, discrimination=1.2),
        IRTItem(item_id="q2", difficulty=0.0, discrimination=1.5),
        IRTItem(item_id="q3", difficulty=1.0, discrimination=1.4),
        IRTItem(item_id="q4", difficulty=2.0, discrimination=1.1),
    ]

    # Learner solves easy & medium, fails hard: [1, 1, 0, 0]
    responses = [
        (items[0], 1.0),
        (items[1], 1.0),
        (items[2], 0.0),
        (items[3], 0.0),
    ]

    estimate = engine.estimate_ability_map(responses)

    # Theta should land between q2 (0.0) and q3 (1.0)
    assert -0.5 <= estimate.theta <= 1.0
    assert estimate.sem < 1.0
    assert estimate.iterations <= 15
    assert estimate.confidence_interval[0] < estimate.theta < estimate.confidence_interval[1]


def test_cat_adaptive_item_selection() -> None:
    engine = IRTEngine()
    candidate_pool = [
        IRTItem(item_id="item-easy", difficulty=-2.0, discrimination=1.5),
        IRTItem(item_id="item-target", difficulty=0.8, discrimination=2.0),
        IRTItem(item_id="item-hard", difficulty=2.5, discrimination=1.5),
    ]

    # Current learner ability is estimated around theta = 0.75
    next_item = engine.select_next_adaptive_item(
        current_theta=0.75,
        candidate_pool=candidate_pool,
        already_administered_ids=set(),
    )

    # Should select "item-target" because difficulty 0.8 is closest to 0.75 and has highest discrimination
    assert next_item is not None
    assert next_item.item_id == "item-target"


def test_cat_respects_already_administered() -> None:
    engine = IRTEngine()
    pool = [
        IRTItem(item_id="item-target", difficulty=0.8, discrimination=2.0),
        IRTItem(item_id="item-fallback", difficulty=1.2, discrimination=1.8),
    ]

    next_item = engine.select_next_adaptive_item(
        current_theta=0.8,
        candidate_pool=pool,
        already_administered_ids={"item-target"},
    )

    assert next_item is not None
    assert next_item.item_id == "item-fallback"
