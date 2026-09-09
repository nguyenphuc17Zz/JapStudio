"""Glicko-2 Dynamic Bayesian Skill Rating & Volatility Engine (Algorithm 16).

Implements Dr. Mark E. Glickman's Glicko-2 rating system for evaluating
learner proficiency and writing challenge difficulty with:
  - Rating r: latent writing ability (default 1500.0)
  - Rating Deviation RD: uncertainty in estimated ability (default 350.0)
  - Rating Volatility sigma: degree of performance fluctuation (default 0.06)

Supports multi-dimensional skill profiles:
  - grammar
  - lexicon
  - naturalness
  - register
  - discourse
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

# System constants
_DEFAULT_RATING = 1500.0
_DEFAULT_RD = 350.0
_DEFAULT_VOLATILITY = 0.06
_TAU = 0.5            # Constrains volatility changes over time (0.3 - 1.2)
_SCALE = 173.7178     # Scaling factor between Glicko and Glicko-2
_EPSILON = 1e-6       # Root-finding convergence tolerance


@dataclass(frozen=True)
class Glicko2Rating:
    """Represents a learner's or exercise's Glicko-2 rating state."""

    rating: float = _DEFAULT_RATING
    rd: float = _DEFAULT_RD
    volatility: float = _DEFAULT_VOLATILITY

    @property
    def mu(self) -> float:
        """Rating on the Glicko-2 scale."""
        return (self.rating - _DEFAULT_RATING) / _SCALE

    @property
    def phi(self) -> float:
        """Rating deviation on the Glicko-2 scale."""
        return self.rd / _SCALE

    def to_dict(self) -> dict[str, float]:
        return {
            "rating": round(self.rating, 1),
            "rd": round(self.rd, 1),
            "volatility": round(self.volatility, 5),
        }


@dataclass(frozen=True)
class WritingMatchResult:
    """Outcome of an evaluated exercise or challenge.

    score: 1.0 (mastered / high quality), 0.5 (acceptable / partial), 0.0 (unsuccessful)
    """

    opponent_rating: Glicko2Rating
    score: float


class Glicko2Engine:
    """Pure mathematical implementation of the Glicko-2 rating algorithm."""

    @classmethod
    def g(cls, phi: float) -> float:
        """Reduces the impact of games played against opponents with high RD."""
        return 1.0 / math.sqrt(1.0 + 3.0 * (phi ** 2) / (math.pi ** 2))

    @classmethod
    def expected_score(cls, mu: float, mu_j: float, phi_j: float) -> float:
        """Expected score E(mu, mu_j, phi_j) on the logistic ogive."""
        return 1.0 / (1.0 + math.exp(-cls.g(phi_j) * (mu - mu_j)))

    @classmethod
    def update_rating(
        cls,
        current: Glicko2Rating,
        matches: list[WritingMatchResult],
        tau: float = _TAU,
    ) -> Glicko2Rating:
        """Computes the posterior Glicko-2 rating following a rating period."""
        if not matches:
            # If no matches occurred, rating stays same, RD inflates slightly due to inactivity
            new_phi = math.sqrt(current.phi ** 2 + current.volatility ** 2)
            return Glicko2Rating(
                rating=current.rating,
                rd=min(_DEFAULT_RD, new_phi * _SCALE),
                volatility=current.volatility,
            )

        mu = current.mu
        phi = current.phi
        sigma = current.volatility

        # 1. Variance v
        v_inv = 0.0
        delta_sum = 0.0

        for match in matches:
            opp_mu = match.opponent_rating.mu
            opp_phi = match.opponent_rating.phi
            g_phi = cls.g(opp_phi)
            e_score = cls.expected_score(mu, opp_mu, opp_phi)

            v_inv += (g_phi ** 2) * e_score * (1.0 - e_score)
            delta_sum += g_phi * (match.score - e_score)

        if v_inv == 0.0:
            return current

        v = 1.0 / v_inv
        delta = v * delta_sum

        # 2. Determine new volatility sigma' via Illinois / Regula Falsi algorithm
        a = math.log(sigma ** 2)

        def f(x: float) -> float:
            e_x = math.exp(x)
            num = e_x * (delta ** 2 - phi ** 2 - v - e_x)
            den = 2.0 * ((phi ** 2 + v + e_x) ** 2)
            return (num / den) - ((x - a) / (tau ** 2))

        # Set initial bracket [A, B]
        A = a
        if delta ** 2 > (phi ** 2 + v):
            B = math.log(delta ** 2 - phi ** 2 - v)
        else:
            k = 1
            while f(a - k * tau) < 0:
                k += 1
            B = a - k * tau

        f_A = f(A)
        f_B = f(B)

        # Iterate until convergence
        while abs(B - A) > _EPSILON:
            C = A + (A - B) * f_A / (f_B - f_A)
            f_C = f(C)

            if f_C * f_B < 0:
                A = B
                f_A = f_B
            else:
                f_A = f_A / 2.0

            B = C
            f_B = f_C

        new_sigma = math.exp(A / 2.0)

        # 3. Update rating deviation to new pre-rating period value
        phi_star = math.sqrt(phi ** 2 + new_sigma ** 2)

        # 4. Update rating and RD to new values
        new_phi = 1.0 / math.sqrt((1.0 / (phi_star ** 2)) + (1.0 / v))
        new_mu = mu + (new_phi ** 2) * delta_sum

        # 5. Convert back to original Glicko scale
        new_r = new_mu * _SCALE + _DEFAULT_RATING
        new_rd = new_phi * _SCALE

        return Glicko2Rating(
            rating=round(new_r, 2),
            rd=round(min(_DEFAULT_RD, max(30.0, new_rd)), 2),
            volatility=round(new_sigma, 6),
        )


class LearnerSkillTracker:
    """Manages 5-dimensional writing skill ratings using Glicko-2."""

    DIMENSIONS = ("grammar", "lexicon", "naturalness", "register", "discourse")

    def __init__(self, skill_ratings: dict[str, dict[str, float]] | None = None) -> None:
        self._skills: dict[str, Glicko2Rating] = {}
        skill_ratings = skill_ratings or {}

        for dim in self.DIMENSIONS:
            data = skill_ratings.get(dim, {})
            self._skills[dim] = Glicko2Rating(
                rating=float(data.get("rating", _DEFAULT_RATING)),
                rd=float(data.get("rd", _DEFAULT_RD)),
                volatility=float(data.get("volatility", _DEFAULT_VOLATILITY)),
            )

    @property
    def skills(self) -> dict[str, Glicko2Rating]:
        return dict(self._skills)

    def record_exercise(
        self,
        dimension: str,
        exercise_difficulty_rating: float,
        score: float,
    ) -> Glicko2Rating:
        """Updates a specific writing skill dimension based on exercise performance."""
        if dimension not in self._skills:
            dimension = "naturalness"

        current = self._skills[dimension]
        # Opponent is the challenge / exercise itself
        opp = Glicko2Rating(rating=exercise_difficulty_rating, rd=60.0)
        match = WritingMatchResult(opponent_rating=opp, score=score)

        updated = Glicko2Engine.update_rating(current, [match])
        self._skills[dimension] = updated
        return updated
