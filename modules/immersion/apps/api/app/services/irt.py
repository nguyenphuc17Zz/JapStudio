"""Item Response Theory (2PL) engine for adaptive quizzes — pure math, no ML deps.

- P(correct | theta) = 1 / (1 + exp(-a * (theta - b)))
- Ability estimated online with MAP Newton-Raphson (standard-normal prior).
- Fisher information I(theta) = a^2 * P * (1 - P) drives question selection.
- Randomesque exposure control: uniform pick among the top-K informative
  items with a seeded RNG (deterministic per seed, varied across sessions).
"""
import math
import random
from typing import Dict, List, Optional, Sequence, Tuple

THETA_MIN, THETA_MAX = -3.0, 3.0
A_MIN, A_MAX = 0.3, 2.5
B_MIN, B_MAX = -3.0, 3.0
SE_MIN = 1e-6

# Cold-start difficulty from the static EASY/STANDARD/CHALLENGING label.
LABEL_TO_B = {"EASY": -1.0, "STANDARD": 0.0, "CHALLENGING": 1.0}
DEFAULT_A = 1.0

# Calibration gates.
MIN_N_FOR_B = 10
MIN_N_FOR_A = 50

# Quality-flag thresholds (admin item analysis).
P_TOO_HARD = 0.15
P_TOO_EASY = 0.95
A_WEAK = 0.4
DEAD_OPTION_RATE = 0.05


def clamp_theta(t: float) -> float:
    return min(max(float(t), THETA_MIN), THETA_MAX)


def probability_correct(theta: float, a: float, b: float) -> float:
    """2PL response probability, numerically guarded."""
    z = max(min(float(a) * (float(theta) - float(b)), 30.0), -30.0)
    return 1.0 / (1.0 + math.exp(-z))


def fisher_information(theta: float, a: float, b: float) -> float:
    p = probability_correct(theta, a, b)
    return (float(a) ** 2) * p * (1.0 - p)


def update_theta(
    theta: float,
    responses: Sequence[Tuple[float, float, int]],
    prior_weight: float = 1.0,
    max_iter: int = 25,
) -> float:
    """MAP ability update from (a, b, correct) responses.

    Newton-Raphson on log-posterior with a standard-normal prior:
    first derivative = sum(a*(u-P)) - prior_weight*theta,
    second derivative = -(sum(a^2*P*(1-P)) + prior_weight).
    """
    t = clamp_theta(theta)
    for _ in range(max_iter):
        first = -prior_weight * t
        second = -prior_weight
        for a, b, u in responses:
            p = probability_correct(t, a, b)
            first += float(a) * (int(bool(u)) - p)
            second -= (float(a) ** 2) * p * (1.0 - p)
        if abs(second) < 1e-9:
            break
        step = first / second
        t = clamp_theta(t - step)
        if abs(step) < 1e-4:
            break
    return t


def standard_error(theta: float, responses: Sequence[Tuple[float, float, int]]) -> float:
    info = sum(
        fisher_information(theta, a, b) for a, b, _ in responses
    )
    return 1.0 / math.sqrt(max(info, SE_MIN))


def starting_theta(prior_theta: Optional[float] = None) -> float:
    return clamp_theta(0.0 if prior_theta is None else prior_theta)


def select_next(
    theta: float,
    candidates: Sequence[Dict[str, object]],
    answered_ids: Sequence[int],
    top_k: int = 3,
    rng: Optional[random.Random] = None,
    required_skills: Optional[Sequence[str]] = None,
) -> Optional[Dict[str, object]]:
    """Picks the next question: max-information with skill coverage + randomesque.

    Each candidate: {"id", "a", "b", "skill"}. Answered ids excluded. When
    required_skills is non-empty, candidates carrying an uncovered skill win
    ties first. Final pick is uniform among top_k by information.
    """
    done = set(answered_ids or [])
    pool = [c for c in candidates if int(c["id"]) not in done]
    if not pool:
        return None
    need = set(required_skills or [])

    def key(c: Dict[str, object]) -> Tuple[float, int]:
        info = fisher_information(theta, float(c.get("a", DEFAULT_A)), float(c.get("b", 0.0)))
        bonus = 1 if str(c.get("skill", "")) in need else 0
        return (info, bonus)

    pool.sort(key=key, reverse=True)
    shortlist = pool[: max(int(top_k or 1), 1)]
    if rng is None or len(shortlist) == 1:
        return shortlist[0]
    return rng.choice(shortlist)


def fit_difficulty(n: int, n_correct: int, mean_theta: float = 0.0) -> Optional[float]:
    """1PL (Rasch, a=1) closed-form difficulty from a response batch.

    b = mean_theta - logit(p), Laplace-smoothed. Returns None under MIN_N_FOR_B.
    """
    if n < MIN_N_FOR_B:
        return None
    p = (n_correct + 1.0) / (n + 2.0)
    p = min(max(p, 1e-3), 1.0 - 1e-3)
    return min(max(float(mean_theta) - math.log(p / (1.0 - p)), B_MIN), B_MAX)


def quality_flags(
    n: int, p_value: float, a: float, option_rates: Sequence[float],
) -> List[str]:
    """Admin quality flags for one calibrated question."""
    flags: List[str] = []
    if n < MIN_N_FOR_B:
        return ["NEEDS_DATA"]
    if p_value < P_TOO_HARD:
        flags.append("TOO_HARD")
    if p_value > P_TOO_EASY:
        flags.append("TOO_EASY")
    if a < A_WEAK:
        flags.append("WEAK_DISCRIMINATION")
    if option_rates and min(option_rates) < DEAD_OPTION_RATE:
        flags.append("DEAD_DISTRACTOR")
    return flags or ["OK"]
