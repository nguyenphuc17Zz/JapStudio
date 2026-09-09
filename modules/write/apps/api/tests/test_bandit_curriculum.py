"""Tests for Bayesian Multi-Armed Bandit Service (Algorithm 14)."""

import pytest
from app.services.bandit_curriculum_service import (
    EXPLORATION_ARMS,
    BanditCurriculumService,
)


def test_bandit_initial_state():
    bandit = BanditCurriculumService()
    state = bandit.arm_state

    for arm in EXPLORATION_ARMS:
        assert arm in state
        assert state[arm]["alpha"] == 1.0
        assert state[arm]["beta"] == 1.0
        assert bandit.get_expected_value(arm) == 0.5


def test_bayesian_posterior_update():
    bandit = BanditCurriculumService()

    # Record 5 consecutive successes for business
    for _ in range(5):
        bandit.record_outcome("business", success=True)

    # Record 5 consecutive failures / dropouts for casual
    for _ in range(5):
        bandit.record_outcome("casual", success=False)

    assert bandit.arm_state["business"]["alpha"] == 6.0
    assert bandit.arm_state["business"]["beta"] == 1.0
    assert bandit.arm_state["casual"]["alpha"] == 1.0
    assert bandit.arm_state["casual"]["beta"] == 6.0

    # Expected value of business should be 6 / 7 ~= 0.857
    assert bandit.get_expected_value("business") > 0.80
    # Expected value of casual should be 1 / 7 ~= 0.143
    assert bandit.get_expected_value("casual") < 0.20


def test_thompson_sampling_convergence():
    bandit = BanditCurriculumService()

    # Heavily reinforce paragraph
    bandit.record_outcome("paragraph", success=True, weight=50.0)

    # Over 100 samples, paragraph should be selected the vast majority of the time
    samples = [bandit.sample_arm() for _ in range(100)]
    paragraph_count = samples.count("paragraph")

    assert paragraph_count > 80, f"Expected paragraph to dominate, got {paragraph_count}/100"


def test_sample_multiple_distinct_with_register_guard():
    bandit = BanditCurriculumService()

    # Exclude casual registers
    selected = bandit.sample_multiple_distinct(count=3, excluded_registers={"casual"})

    assert len(selected) == 3
    assert len(set(selected)) == 3  # All distinct
