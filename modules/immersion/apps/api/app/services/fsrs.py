"""FSRS-4.5 spaced-repetition engine (pure math, no ML dependencies).

Implements the open FSRS algorithm (Ye et al.): power-law forgetting curve,
17 default weights, stability/difficulty transitions, retention-based
intervals and fuzz. All functions are deterministic given an explicit RNG.
"""
import math
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# Forgetting-curve constants: R(t, S) = (1 + FACTOR * t / S) ** DECAY.
# At the default request retention (0.9) the interval equals stability.
FACTOR = 19.0 / 81.0
DECAY = -0.5

S_MIN = 0.01
S_MAX = 36500.0

# FSRS-4.5 default weights w[0..16] (fit on public review logs).
DEFAULT_W: Tuple[float, ...] = (
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
    1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729,
)

DEFAULT_RETENTION = 0.9
MIN_RETENTION = 0.8
MAX_RETENTION = 0.99
DEFAULT_MAX_INTERVAL = 365

AGAIN, HARD, GOOD, EASY = 1, 2, 3, 4


def clamp_retention(r: float) -> float:
    try:
        r = float(r)
    except (TypeError, ValueError):
        return DEFAULT_RETENTION
    return min(max(r, MIN_RETENTION), MAX_RETENTION)


def forgetting_curve(elapsed_days: float, stability: float) -> float:
    """Predicted recall probability R in [0, 1]."""
    s = max(float(stability), S_MIN)
    t = max(float(elapsed_days), 0.0)
    return (1.0 + FACTOR * t / s) ** DECAY


def init_stability(rating: int, w: Tuple[float, ...] = DEFAULT_W) -> float:
    return max(float(w[rating - 1]), S_MIN)


def init_difficulty(rating: int, w: Tuple[float, ...] = DEFAULT_W) -> float:
    return min(max(float(w[4] - (rating - 3) * w[5]), 1.0), 10.0)


def _linear_damping(delta_d: float, old_d: float) -> float:
    return delta_d * (10.0 - old_d) / 9.0


def _mean_reversion(w: Tuple[float, ...], init: float, current: float) -> float:
    return float(w[7]) * init + (1.0 - float(w[7])) * current


def next_difficulty(difficulty: float, rating: int, w: Tuple[float, ...] = DEFAULT_W) -> float:
    delta = -float(w[6]) * (rating - 3)
    updated = float(difficulty) + _linear_damping(delta, float(difficulty))
    settled = _mean_reversion(w, init_difficulty(GOOD, w), updated)
    return min(max(settled, 1.0), 10.0)


def next_recall_stability(
    difficulty: float, stability: float, retrievability: float, rating: int,
    w: Tuple[float, ...] = DEFAULT_W,
) -> float:
    d = float(difficulty)
    s = max(float(stability), S_MIN)
    r = min(max(float(retrievability), 0.01), 1.0)
    hard_penalty = float(w[15]) if rating == HARD else 1.0
    easy_bonus = float(w[16]) if rating == EASY else 1.0
    s_inc = (
        s * math.exp(float(w[8])) * (11.0 - d) * (s ** float(w[9]))
        * (math.exp((1.0 - r) * float(w[10])) - 1.0) * hard_penalty * easy_bonus
    )
    return min(max(s + s_inc, S_MIN), S_MAX)


def next_forget_stability(
    difficulty: float, stability: float, retrievability: float,
    w: Tuple[float, ...] = DEFAULT_W,
) -> float:
    d = float(difficulty)
    s = max(float(stability), S_MIN)
    r = min(max(float(retrievability), 0.01), 1.0)
    return max(
        float(w[11]) * (d ** float(w[12])) * (((s + 1.0) ** float(w[13])) - 1.0)
        * math.exp((1.0 - r) * float(w[14])),
        S_MIN,
    )


def next_interval_days(stability: float, retention: float = DEFAULT_RETENTION) -> float:
    """Raw (unfuzzed) interval in days for stability S at retention R."""
    r = clamp_retention(retention)
    s = max(float(stability), S_MIN)
    return (s / FACTOR) * ((r ** (1.0 / DECAY)) - 1.0)


def apply_fuzz(interval_days: float, rng: Optional[random.Random] = None) -> int:
    """FSRS-style fuzz: no jitter under 2.5 days, proportional bands above."""
    ivl = max(float(interval_days), 1.0)
    if ivl < 2.5 or rng is None:
        return max(1, int(round(ivl)))
    if ivl < 7.0:
        lo, hi = 0.85, 1.15
    elif ivl < 30.0:
        lo, hi = 0.90, 1.10
    else:
        lo, hi = 0.95, 1.05
    fuzzed = ivl * rng.uniform(lo, hi)
    return max(2, int(round(fuzzed)))


def schedule(
    stability: float,
    difficulty: float,
    rating: int,
    elapsed_days: Optional[float] = None,
    retention: float = DEFAULT_RETENTION,
    max_interval: int = DEFAULT_MAX_INTERVAL,
    rng: Optional[random.Random] = None,
    now: Optional[datetime] = None,
    w: Tuple[float, ...] = DEFAULT_W,
) -> Dict[str, object]:
    """Runs one FSRS transition.

    elapsed_days=None means "reviewed exactly on time" (R == retention),
    used for interval previews. Returns new_s, new_d, interval_days,
    next_review_at.
    """
    now = now or datetime.utcnow()
    r = clamp_retention(retention)
    cap = max(int(max_interval or DEFAULT_MAX_INTERVAL), 1)

    if rating == AGAIN:
        base_r = forgetting_curve(elapsed_days, stability) if elapsed_days is not None else r
        new_s = next_forget_stability(difficulty, stability, base_r, w)
        new_d = next_difficulty(difficulty, AGAIN, w)
    else:
        base_r = forgetting_curve(elapsed_days, stability) if elapsed_days is not None else r
        new_s = next_recall_stability(difficulty, stability, base_r, rating, w)
        new_d = next_difficulty(difficulty, rating, w)

    raw = next_interval_days(new_s, r)
    interval = min(max(1, apply_fuzz(raw, rng)), cap)
    return {
        "new_s": round(float(new_s), 4),
        "new_d": round(float(new_d), 4),
        "retrievability": round(float(base_r), 4),
        "interval_days": int(interval),
        "next_review_at": now + timedelta(days=int(interval)),
    }


def init_schedule(
    rating: int,
    retention: float = DEFAULT_RETENTION,
    max_interval: int = DEFAULT_MAX_INTERVAL,
    rng: Optional[random.Random] = None,
    now: Optional[datetime] = None,
    w: Tuple[float, ...] = DEFAULT_W,
) -> Dict[str, object]:
    """First-rating schedule for a brand-new card."""
    now = now or datetime.utcnow()
    r = clamp_retention(retention)
    cap = max(int(max_interval or DEFAULT_MAX_INTERVAL), 1)
    new_s = init_stability(rating, w)
    new_d = init_difficulty(rating, w)
    raw = next_interval_days(new_s, r)
    interval = min(max(1, apply_fuzz(raw, rng)), cap)
    return {
        "new_s": round(float(new_s), 4),
        "new_d": round(float(new_d), 4),
        "retrievability": 1.0,
        "interval_days": int(interval),
        "next_review_at": now + timedelta(days=int(interval)),
    }


def preview_intervals(
    stability: float,
    difficulty: float,
    retention: float = DEFAULT_RETENTION,
    max_interval: int = DEFAULT_MAX_INTERVAL,
    is_new: bool = False,
) -> Dict[str, int]:
    """On-time Again/Hard/Good/Easy intervals (no fuzz — stable preview)."""
    out: Dict[str, int] = {}
    for rating, key in ((AGAIN, "again"), (HARD, "hard"), (GOOD, "good"), (EASY, "easy")):
        if is_new:
            res = init_schedule(rating, retention, max_interval)
        else:
            res = schedule(stability, difficulty, rating, None, retention, max_interval)
        out[key] = int(res["interval_days"])
    return out


def seeded_rng(*parts: object) -> random.Random:
    return random.Random("|".join(str(p) for p in parts))


def band_shuffle(keys: List[int], band_size: int, rng: random.Random) -> List[int]:
    """Shuffles indices within consecutive bands (stable priority, varied order)."""
    out: List[int] = []
    for i in range(0, len(keys), max(int(band_size), 1)):
        band = keys[i:i + max(int(band_size), 1)]
        band = list(band)
        rng.shuffle(band)
        out.extend(band)
    return out
