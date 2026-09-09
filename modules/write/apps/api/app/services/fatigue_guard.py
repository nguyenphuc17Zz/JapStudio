"""Fatigue Guard (Phase 22).

In-memory guard used within a single plan-generation call to prevent the
same weakness or writing pattern from appearing too many times in one
daily plan.  It tracks four orthogonal dimensions so that even if two
tasks target different weaknesses they can still feel repetitive (e.g.
both requiring business-register paragraph writing).

This is intentionally not persisted — it resets each time a new plan is
generated.

Usage::

    guard = FatigueGuard(window=3)
    for weakness in candidates:
        ctx = ContextRotationEngine.current_context(weakness)
        if guard.is_fatigued(weakness.id, ctx):
            continue
        guard.record(weakness.id, ctx, register="business", structure="paragraph")
        # ... add task to plan
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass


@dataclass
class _Observation:
    weakness_id: str | None
    context_type: str
    register: str | None
    structure: str | None  # e.g. "sentence", "paragraph"


class FatigueGuard:
    """Sliding-window repetition detector across four dimensions."""

    def __init__(self, window: int = 3) -> None:
        """
        Args:
            window: Number of recent tasks to look back when checking fatigue.
                    Defaults to 3.
        """
        self._window = max(1, window)
        self._recent: deque[_Observation] = deque(maxlen=self._window)

    # -- public API ------------------------------------------------------------

    def is_fatigued(
        self,
        weakness_id: str | None,
        context_type: str,
    ) -> bool:
        """Return True if (weakness_id, context_type) already appears in the window."""
        for obs in self._recent:
            if obs.weakness_id == weakness_id and obs.context_type == context_type:
                return True
        return False

    def is_register_saturated(self, register: str | None) -> bool:
        """Return True if the same register fills the entire current window."""
        if register is None or len(self._recent) < self._window:
            return False
        return all(obs.register == register for obs in self._recent)

    def is_structure_saturated(self, structure: str | None) -> bool:
        """Return True if the same sentence structure fills the current window."""
        if structure is None or len(self._recent) < self._window:
            return False
        return all(obs.structure == structure for obs in self._recent)

    def record(
        self,
        weakness_id: str | None,
        context_type: str,
        register: str | None = None,
        structure: str | None = None,
    ) -> None:
        """Record that a task for (weakness_id, context_type) was added to the plan."""
        self._recent.append(
            _Observation(
                weakness_id=weakness_id,
                context_type=context_type,
                register=register,
                structure=structure,
            )
        )

    def reset(self) -> None:
        """Clear the window (useful when building a new plan)."""
        self._recent.clear()

    @property
    def recent_weakness_ids(self) -> list[str | None]:
        return [obs.weakness_id for obs in self._recent]

    @property
    def recent_context_types(self) -> list[str]:
        return [obs.context_type for obs in self._recent]
