"""Item Response Theory (2PL IRT) & Computerized Adaptive Testing (CAT) Engine.

Implements Allan Birnbaum's 2-Parameter Logistic (2PL) Model,
Fisher Information Function, Newton-Raphson MAP Ability Estimation,
and Computerized Adaptive Testing (CAT) next-item selection.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence


# Normal ogive scaling factor (D = 1.702)
D_FACTOR = 1.702


@dataclass(frozen=True)
class IRTItem:
    """An assessment item or exercise characterized by 2PL psychometric parameters."""
    item_id: str
    difficulty: float      # b parameter: typically in [-3.0, +3.0]
    discrimination: float  # a parameter: typically in [0.5, 2.5]
    name: str = ""
    domain: str = "general"


@dataclass(frozen=True)
class AbilityEstimate:
    """Estimated latent trait ability theta and measurement uncertainty."""
    theta: float
    sem: float             # Standard Error of Measurement (1 / sqrt(Total Info))
    total_information: float
    confidence_interval: tuple[float, float]  # 95% CI [theta - 1.96*SEM, theta + 1.96*SEM]
    iterations: int


class IRTEngine:
    """2-Parameter Logistic IRT & CAT Engine."""

    def __init__(self, d_factor: float = D_FACTOR) -> None:
        self.d = d_factor

    def probability(self, theta: float, item: IRTItem) -> float:
        """Computes P(X = 1 | theta) = 1 / (1 + exp(-D * a * (theta - b)))."""
        z = self.d * item.discrimination * (theta - item.difficulty)
        # Avoid overflow
        if z > 35.0:
            return 1.0
        if z < -35.0:
            return 0.0
        return 1.0 / (1.0 + math.exp(-z))

    def item_information(self, theta: float, item: IRTItem) -> float:
        """Computes Fisher Information: I(theta) = D^2 * a^2 * P(theta) * (1 - P(theta))."""
        p = self.probability(theta, item)
        q = 1.0 - p
        return (self.d ** 2) * (item.discrimination ** 2) * p * q

    def total_test_information(self, theta: float, items: Sequence[IRTItem]) -> float:
        """Computes Total Test Information: sum_j I_j(theta)."""
        return sum(self.item_information(theta, it) for it in items)

    def standard_error_of_measurement(self, theta: float, items: Sequence[IRTItem]) -> float:
        """Computes SEM(theta) = 1 / sqrt(Total Information)."""
        info = self.total_test_information(theta, items)
        if info <= 0.0001:
            return 3.0  # High uncertainty default
        return 1.0 / math.sqrt(info)

    def estimate_ability_map(
        self,
        responses: Sequence[tuple[IRTItem, float]],
        initial_theta: float = 0.0,
        prior_mean: float = 0.0,
        prior_sd: float = 1.0,
        max_iterations: int = 50,
        tolerance: float = 1e-4,
    ) -> AbilityEstimate:
        """Estimates latent ability theta via Newton-Raphson Maximum A Posteriori (MAP).

        Args:
            responses: Sequence of (IRTItem, score) where score is in [0.0, 1.0].
            initial_theta: Starting point (default 0.0).
            prior_mean: Mean of Gaussian prior (default 0.0).
            prior_sd: Standard deviation of Gaussian prior (default 1.0).
            max_iterations: Maximum iterations for Newton-Raphson.
            tolerance: Convergence delta threshold.
        """
        if not responses:
            sem = prior_sd
            ci = (prior_mean - 1.96 * sem, prior_mean + 1.96 * sem)
            return AbilityEstimate(
                theta=prior_mean,
                sem=sem,
                total_information=1.0 / (prior_sd ** 2),
                confidence_interval=ci,
                iterations=0,
            )

        theta = initial_theta
        items = [item for item, _ in responses]
        prior_var = prior_sd ** 2

        for iteration in range(1, max_iterations + 1):
            # First derivative of posterior log-likelihood:
            # d/d_theta [ln L + ln Prior] = D * sum(a_j * (x_j - P_j)) - (theta - mu) / prior_var
            grad = - (theta - prior_mean) / prior_var
            # Second derivative:
            # d^2/d_theta^2 = - D^2 * sum(a_j^2 * P_j * Q_j) - 1 / prior_var
            hess = - (1.0 / prior_var)

            for item, score in responses:
                p = self.probability(theta, item)
                q = 1.0 - p
                grad += self.d * item.discrimination * (score - p)
                hess -= (self.d ** 2) * (item.discrimination ** 2) * p * q

            delta = grad / (-hess)
            theta += delta

            # Clamp theta to reasonable psychometric range [-4.0, +4.0]
            theta = max(-4.0, min(4.0, theta))

            if abs(delta) < tolerance:
                break

        # Calculate final information & SEM
        test_info = self.total_test_information(theta, items)
        posterior_info = test_info + (1.0 / prior_var)
        sem = 1.0 / math.sqrt(posterior_info)
        ci = (round(theta - 1.96 * sem, 3), round(theta + 1.96 * sem, 3))

        return AbilityEstimate(
            theta=round(theta, 3),
            sem=round(sem, 3),
            total_information=round(test_info, 3),
            confidence_interval=ci,
            iterations=iteration,
        )

    def select_next_adaptive_item(
        self,
        current_theta: float,
        candidate_pool: Sequence[IRTItem],
        already_administered_ids: set[str] | None = None,
    ) -> IRTItem | None:
        """Selects the next optimal item maximizing Fisher Information (arg max_j I_j(theta)).

        In Computerized Adaptive Testing (CAT), selecting the item that provides
        the greatest Fisher information at the learner's current estimated ability
        accelerates measurement convergence while minimizing respondent fatigue.
        """
        administered = already_administered_ids or set()
        available = [it for it in candidate_pool if it.item_id not in administered]

        if not available:
            return None

        # Maximize Fisher information I_j(current_theta)
        best_item: IRTItem | None = None
        best_info = -1.0

        for item in available:
            info = self.item_information(current_theta, item)
            if info > best_info:
                best_info = info
                best_item = item

        return best_item
