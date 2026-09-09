"""Context Rotation Engine (Phase 22).

Cycles each WritingWeakness through 8 distinct writing contexts so the
learner never practises the same pattern in isolation.  The current
position is persisted as a small JSON blob inside the existing
``WritingWeakness.mastery_evidence["context_rotation"]`` field — no new
DB column is needed.

Rotation order:
  sentence → rewrite → casual → polite → business →
  paragraph → free_writing → real_world_mission → (repeats)
"""

from __future__ import annotations

from app.models.writing_intelligence import WritingWeakness

# ---------------------------------------------------------------------------
# Context cycle definition
# ---------------------------------------------------------------------------

CONTEXT_CYCLE: tuple[str, ...] = (
    "sentence",
    "rewrite",
    "casual",
    "polite",
    "business",
    "paragraph",
    "free_writing",
    "real_world_mission",
)

_CYCLE_LEN = len(CONTEXT_CYCLE)
_KEY = "context_rotation"


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------


class ContextRotationEngine:
    """Deterministic context rotator persisted in mastery_evidence."""

    # -- read-only helpers (no DB write) ------------------------------------

    @staticmethod
    def current_index(weakness: WritingWeakness) -> int:
        """Return the current position in the cycle (0-based)."""
        evidence = weakness.mastery_evidence or {}
        rotation = evidence.get(_KEY) or {}
        idx = rotation.get("index", 0)
        if not isinstance(idx, int) or idx < 0:
            idx = 0
        return idx % _CYCLE_LEN

    @classmethod
    def current_context(cls, weakness: WritingWeakness) -> str:
        """Return the context type the weakness should be practised in next."""
        return CONTEXT_CYCLE[cls.current_index(weakness)]

    @classmethod
    def peek_next(cls, weakness: WritingWeakness) -> str:
        """Return the context *after* the current one (without advancing)."""
        return CONTEXT_CYCLE[(cls.current_index(weakness) + 1) % _CYCLE_LEN]

    # -- mutation (call before session flush) --------------------------------

    @classmethod
    def advance(cls, weakness: WritingWeakness) -> str:
        """Advance the rotation by one step and return the NEW context.

        Mutates ``weakness.mastery_evidence`` in-place.  The caller is
        responsible for flushing/persisting the model.
        """
        evidence = dict(weakness.mastery_evidence or {})
        rotation = dict(evidence.get(_KEY) or {})
        old_idx = rotation.get("index", 0)
        if not isinstance(old_idx, int) or old_idx < 0:
            old_idx = 0
        new_idx = (old_idx + 1) % _CYCLE_LEN
        rotation["index"] = new_idx
        rotation["last_advanced_context"] = CONTEXT_CYCLE[old_idx]
        evidence[_KEY] = rotation
        weakness.mastery_evidence = evidence
        return CONTEXT_CYCLE[new_idx]

    @classmethod
    def reset(cls, weakness: WritingWeakness) -> None:
        """Reset rotation to the beginning of the cycle."""
        evidence = dict(weakness.mastery_evidence or {})
        evidence[_KEY] = {"index": 0}
        weakness.mastery_evidence = evidence
