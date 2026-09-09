"""Shared helpers for the analytics services (Phase 14).

Windows, metric ids and the deterministic usefulness formula live here so
every service speaks the same metric vocabulary.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

WINDOW_DAYS: dict[str, int | None] = {
    "7d": 7,
    "14d": 14,
    "30d": 30,
    "90d": 90,
    "all_time": None,
}

WINDOW_VALUES = tuple(WINDOW_DAYS.keys())

EARLIEST = datetime(2020, 1, 1, tzinfo=timezone.utc)


@dataclass(frozen=True)
class MetricWindow:
    """A window plus its chronological baseline/current halves.

    Baseline is the first half of the window, current the second half.
    Comparing them yields honest within-window deltas (never causal).
    """

    key: str
    start: datetime
    end: datetime
    baseline_start: datetime
    baseline_end: datetime
    current_start: datetime
    current_end: datetime

    @property
    def duration(self) -> timedelta:
        return self.end - self.start

    @property
    def mid(self) -> datetime:
        return self.start + self.duration / 2


def resolve_window(key: str, now: datetime | None = None) -> MetricWindow:
    """Build a window for one of ``7d|14d|30d|90d|all_time``."""
    days = WINDOW_DAYS[key]
    # ``end`` carries a 24h slack: rows written with the MySQL server default
    # (server-local time) must not fall outside the window when the server
    # clock leads UTC.
    end = (now or datetime.now(timezone.utc)) + timedelta(days=1)
    start = EARLIEST if days is None else end - timedelta(days=days)
    mid = start + (end - start) / 2
    return MetricWindow(
        key=key,
        start=start,
        end=end,
        baseline_start=start,
        baseline_end=mid,
        current_start=mid,
        current_end=end,
    )


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def enum_value(value: Any) -> str:
    """Normalize enum-or-string column values to plain strings.

    MySQL ``native_enum=False`` reads back plain strings while in-session
    objects carry the Python enum; ``str()`` would yield ``JlptLevel.N3``
    instead of ``N3``.
    """
    return str(value.value if hasattr(value, "value") else value)


def round2(value: float | None) -> float | None:
    return round(value, 2) if value is not None else None


def trend_from_delta(delta: float | None) -> str | None:
    if delta is None:
        return None
    if delta > 1.0:
        return "up"
    if delta < -1.0:
        return "down"
    return "stable"


def outcome_metric_id(skill: str, window: str, stage: str) -> str:
    return f"outcome.{skill}.{window}.{stage}"


def feature_metric_id(prefix: str, key: str, metric: str) -> str:
    return f"feature.{prefix}.{key}.{metric}"


def exercise_usefulness(
    *,
    completion: float,
    improvement: float,
    engagement: float,
    failure: float,
    skip: float,
) -> float:
    """Deterministic ExerciseUsefulness in 0..100.

    = 25·completion + 25·improvement + 25·engagement - 25·failure - 25·skip
    """
    raw = (
        25.0 * completion
        + 25.0 * clamp(improvement, 0.0, 1.0)
        + 25.0 * clamp(engagement, 0.0, 1.0)
        - 25.0 * clamp(failure, 0.0, 1.0)
        - 25.0 * clamp(skip, 0.0, 1.0)
    )
    return round(clamp(raw, 0.0, 100.0), 2)


def quality_passed(status: str | None) -> bool:
    return status in ("accepted", "valid")
