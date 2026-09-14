"""Pause-window profiles for Aizuchi Dojo — configurable response windows.

Unlike Reflex timers (answer correctness under pressure), these windows model
the natural pause between NPC phrases where a backchannel fits.
"""

from enum import Enum


class WindowProfile(str, Enum):
    INFINITE = "infinite"
    RELAXED = "relaxed"
    NORMAL = "normal"
    FAST = "fast"
    REFLEX = "reflex"


WINDOW_PROFILES: dict[str, dict] = {
    WindowProfile.INFINITE.value: {
        "label": "Infinite",
        "label_ja": "無制限",
        "window_ms": 0,
        "description": "No window pressure, free practice.",
        "difficulty": "all",
    },
    WindowProfile.RELAXED.value: {
        "label": "Relaxed",
        "label_ja": "ゆっくり",
        "window_ms": 900,
        "description": "Wide pause window for beginners (0.9s).",
        "difficulty": "all",
    },
    WindowProfile.NORMAL.value: {
        "label": "Normal",
        "label_ja": "普通",
        "window_ms": 600,
        "description": "Natural conversational pause (0.6s).",
        "difficulty": "all",
    },
    WindowProfile.FAST.value: {
        "label": "Fast",
        "label_ja": "速い",
        "window_ms": 450,
        "description": "Brisk native pace (0.45s).",
        "difficulty": "all",
    },
    WindowProfile.REFLEX.value: {
        "label": "Reflex",
        "label_ja": "瞬発",
        "window_ms": 350,
        "description": "Native backchannel reflex (0.35s).",
        "difficulty": "all",
    },
}

ADAPTIVE_WINDOW_ORDER = [
    WindowProfile.INFINITE.value,
    WindowProfile.RELAXED.value,
    WindowProfile.NORMAL.value,
    WindowProfile.FAST.value,
    WindowProfile.REFLEX.value,
]


def get_window_profile(level: str) -> dict:
    """Returns window profile dict; falls back to NORMAL."""
    return WINDOW_PROFILES.get(level, WINDOW_PROFILES[WindowProfile.NORMAL.value])


def next_window_profile(current: str, harder: bool = True) -> str:
    """Moves 1 tier up/down, bounded."""
    try:
        idx = ADAPTIVE_WINDOW_ORDER.index(current)
    except ValueError:
        idx = 2  # normal
    if harder:
        return ADAPTIVE_WINDOW_ORDER[min(len(ADAPTIVE_WINDOW_ORDER) - 1, idx + 1)]
    return ADAPTIVE_WINDOW_ORDER[max(0, idx - 1)]


def window_for_profile(level: str) -> int:
    return get_window_profile(level)["window_ms"]
