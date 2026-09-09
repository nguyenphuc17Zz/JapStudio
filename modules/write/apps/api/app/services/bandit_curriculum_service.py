"""Bayesian Multi-Armed Bandit Service (Algorithm 14).

Optimizes exploration genre & context selection in the adaptive daily writing
curriculum using Bayesian Thompson Sampling with conjugate Beta-Bernoulli priors.

Theoretical Principles:
1. Exploration vs Exploitation Tradeoff:
   Avoids naive static round-robin cycling by dynamically directing the learner
   towards genres and contexts that offer maximum pedagogical growth and engagement.

2. Beta-Bernoulli Conjugate Update:
   Each arm 'a' has a posterior probability distribution over success rate theta_a:
     theta_a ~ Beta(alpha_a, beta_a)
   where alpha_a represents positive completion / mastery, and beta_a represents
   abandonment or high friction.
   Prior: Beta(1.0, 1.0) (uniform Bayesian prior).

3. Thompson Sampling (Posterior Sampling):
   At each recommendation step, draw a random sample from each arm's posterior:
     sample_a ~ Beta(alpha_a, beta_a)
   and select the arm with the highest drawn value:
     a* = argmax_{a in A} sample_a
   Guarantees asymptotically optimal logarithmic regret O(ln T).
"""

from __future__ import annotations

import random
from typing import Any

EXPLORATION_ARMS: list[str] = [
    "free_writing",
    "real_world_mission",
    "paragraph",
    "business",
    "casual",
]

_REGISTER_MAP: dict[str, str] = {
    "free_writing": "casual",
    "real_world_mission": "polite",
    "paragraph": "polite",
    "business": "business",
    "casual": "casual",
}



class BanditCurriculumService:
    """Bayesian Multi-Armed Bandit engine for curriculum exploration balancing."""

    def __init__(self, arm_state: dict[str, dict[str, float]] | None = None) -> None:
        self._arms: dict[str, dict[str, float]] = {}
        arm_state = arm_state or {}

        for arm in EXPLORATION_ARMS:
            state = arm_state.get(arm, {})
            self._arms[arm] = {
                "alpha": max(1.0, float(state.get("alpha", 1.0))),
                "beta": max(1.0, float(state.get("beta", 1.0))),
            }

    @property
    def arm_state(self) -> dict[str, dict[str, float]]:
        """Returns deep copy of current alpha/beta parameters."""
        return {arm: dict(vals) for arm, vals in self._arms.items()}

    def sample_arm(self, excluded_arms: set[str] | None = None) -> str:
        """Selects the next exploration context via Thompson Sampling.

        Samples theta_a ~ Beta(alpha_a, beta_a) for each candidate arm,
        and selects the arm with the maximum drawn sample.
        """
        excluded = excluded_arms or set()
        best_arm = EXPLORATION_ARMS[0]
        max_sample = -1.0

        for arm in EXPLORATION_ARMS:
            if arm in excluded:
                continue

            params = self._arms[arm]
            sample = random.betavariate(params["alpha"], params["beta"])
            if sample > max_sample:
                max_sample = sample
                best_arm = arm

        return best_arm

    def sample_multiple_distinct(self, count: int, excluded_registers: set[str] | None = None) -> list[str]:
        """Samples up to 'count' distinct arms while respecting register saturation."""
        excluded_registers = excluded_registers or set()
        selected: list[str] = []
        excluded_arms: set[str] = set()

        for _ in range(count):
            if len(excluded_arms) >= len(EXPLORATION_ARMS):
                break

            arm = self.sample_arm(excluded_arms=excluded_arms)
            reg = _REGISTER_MAP.get(arm, "polite")

            if reg in excluded_registers and len(selected) > 0:
                excluded_arms.add(arm)
                continue

            selected.append(arm)
            excluded_arms.add(arm)

        # If still deficient, fill from remaining arms
        for arm in EXPLORATION_ARMS:
            if len(selected) >= count:
                break
            if arm not in selected:
                selected.append(arm)

        return selected[:count]

    def record_outcome(self, arm: str, success: bool, weight: float = 1.0) -> None:
        """Bayesian conjugate posterior update.

        alpha <- alpha + weight (if success)
        beta  <- beta + weight  (if friction/abandonment)
        """
        if arm not in self._arms:
            self._arms[arm] = {"alpha": 1.0, "beta": 1.0}

        if success:
            self._arms[arm]["alpha"] += max(0.1, weight)
        else:
            self._arms[arm]["beta"] += max(0.1, weight)

    def get_expected_value(self, arm: str) -> float:
        """Returns the expected success probability E[theta] = alpha / (alpha + beta)."""
        if arm not in self._arms:
            return 0.5
        params = self._arms[arm]
        return params["alpha"] / (params["alpha"] + params["beta"])
