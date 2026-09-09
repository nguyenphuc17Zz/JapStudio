"""Deterministic simulation state machine (Phase 10).

The AI never owns the simulation state: it proposes state updates that this
module validates and merges, and the turn types, stage advancement,
resolution and difficulty adjustment are computed entirely in code.

Everything here is pure (no I/O) so the state machine is unit-testable in
isolation.
"""

from __future__ import annotations

from typing import Any

_STATE_KEYS = [
    "objective",
    "current_stage",
    "stage_index",
    "unresolved_items",
    "completed_items",
    "participant_positions",
    "facts",
    "decisions",
    "constraints",
    "emotional_context",
    "next_goal",
]

# Keys the AI state-update stage may propose (complete lists).
_PROPOSABLE_KEYS = [
    "unresolved_items",
    "completed_items",
    "facts",
    "decisions",
    "participant_positions",
    "emotional_context",
    "next_goal",
]

_GOAL_PROGRESS_LOW = 35


class SimulationConsistencyError(ValueError):
    """Raised when a proposed state update is inconsistent."""


class SimulationConsistencyValidator:
    """Rejects malformed or ungrounded state updates."""

    def check_state_update(self, proposed: dict[str, Any]) -> None:
        for key in proposed:
            if key not in _PROPOSABLE_KEYS:
                raise SimulationConsistencyError(f"state update proposes unknown key: {key}")
        for key in ("unresolved_items", "completed_items", "facts", "decisions"):
            values = proposed.get(key)
            if values is None:
                continue
            if not isinstance(values, list) or len(values) > 30:
                raise SimulationConsistencyError(f"state update key {key} must be a bounded list")
            for item in values:
                if not isinstance(item, str) or not item.strip() or len(item) > 300:
                    raise SimulationConsistencyError(
                        f"state update key {key} contains an invalid item"
                    )
        if "participant_positions" in proposed:
            positions = proposed["participant_positions"]
            if not isinstance(positions, dict) or len(positions) > 10:
                raise SimulationConsistencyError("participant_positions must be a bounded object")
        for key in ("emotional_context", "next_goal"):
            if key in proposed and not isinstance(proposed[key], str):
                raise SimulationConsistencyError(f"state update key {key} must be a string")


def initial_state(
    scenario: Any,
    objective_vi: str,
    stages: list[dict[str, str]],
    persona: dict[str, Any],
) -> dict[str, Any]:
    """Build the initial structured state from the scenario and the plan."""
    unresolved = [p.get("description", "") for p in _attr(scenario, "required_points") or []]
    unresolved = [u for u in unresolved if u][:6]
    constraints = [f for f in _attr(scenario, "forbidden_patterns") or [] if f][:6]
    facts = [s for s in _attr(scenario, "situation_vi") or "" if s][:1]
    positions: dict[str, Any] = {
        "ai": {"stance": persona.get("role", ""), "detail": ""},
        "learner": {"stance": "", "detail": ""},
    }
    first = stages[0] if stages else {"name": "opening", "goal": ""}
    return {
        "objective": objective_vi,
        "current_stage": first["name"],
        "stage_index": 0,
        "unresolved_items": unresolved,
        "completed_items": [],
        "participant_positions": positions,
        "facts": facts,
        "decisions": [],
        "constraints": constraints,
        "emotional_context": "neutral",
        "next_goal": first["goal"],
    }


def advance_stage(state: dict[str, Any], stages: list[dict[str, str]]) -> dict[str, Any]:
    """Move to the next stage when nothing is unresolved (returns a copy)."""
    updated = dict(state)
    if updated.get("unresolved_items"):
        return updated
    next_index = int(updated.get("stage_index", 0)) + 1
    if next_index >= len(stages):
        return updated
    stage = stages[next_index]
    updated["stage_index"] = next_index
    updated["current_stage"] = stage["name"]
    updated["next_goal"] = stage["goal"]
    return updated


def is_last_stage(state: dict[str, Any], stages: list[dict[str, str]]) -> bool:
    return int(state.get("stage_index", 0)) >= len(stages) - 1


def decide_next_turn_type(
    state: dict[str, Any],
    stages: list[dict[str, str]],
    last_ai_turn_type: str,
    scores: dict[str, int],
) -> str:
    """Deterministically choose the persona's next turn type.

    Order of precedence: closing (no goal left), confirmation (nothing
    unresolved), clarification (learner stalled), then the stage-driven
    pattern (question -> objection/negotiation -> confirmation).
    """
    if not state.get("unresolved_items"):
        return "closing" if is_last_stage(state, stages) else "confirmation"
    goal_progress = int(scores.get("goal_progress", 0))
    if last_ai_turn_type in ("question", "clarification") and goal_progress < _GOAL_PROGRESS_LOW:
        return "clarification"
    stage = state.get("current_stage", "probe")
    if stage == "negotiate":
        return "negotiation" if last_ai_turn_type in ("objection", "negotiation") else "objection"
    if stage == "confirm":
        return "confirmation"
    if stage == "close":
        return "closing"
    return "question"


def apply_state_update(
    state: dict[str, Any],
    proposed: dict[str, Any],
    validator: SimulationConsistencyValidator,
) -> dict[str, Any]:
    """Merge a validated AI proposal into the state (returns a copy).

    The merge is deterministic: proposed lists replace the whitelisted keys
    (deduplicated), items marked completed are removed from unresolved, and
    the code-owned keys (objective, current_stage, constraints) never
    change.
    """
    validator.check_state_update(proposed)
    updated = dict(state)
    for key in _PROPOSABLE_KEYS:
        if key in proposed:
            updated[key] = proposed[key]
    completed = [c for c in updated.get("completed_items", []) if c]
    unresolved = [
        u
        for u in updated.get("unresolved_items", [])
        if u and u not in completed and u not in state.get("completed_items", [])
    ]
    updated["completed_items"] = _dedupe(completed)
    updated["unresolved_items"] = _dedupe(unresolved)
    if updated.get("next_goal") is None:
        updated["next_goal"] = ""
    if updated.get("emotional_context") is None:
        updated["emotional_context"] = "neutral"
    return updated


def resolution(state: dict[str, Any], stages: list[dict[str, str]], turn_type: str) -> str | None:
    """Resolution rule (deterministic): success when the objective is fully
    resolved, natural completion when the persona closes, else None."""
    if turn_type == "closing" and is_last_stage(state, stages):
        return "natural_completion"
    if not state.get("unresolved_items") and is_last_stage(state, stages):
        return "success"
    return None


def adjust_difficulty(
    current: dict[str, int],
    bounds: dict[str, tuple[int, int]],
    scores: dict[str, int],
) -> dict[str, int]:
    """Adaptive difficulty (deterministic, bounded).

    Overall >= 80 with goal_progress >= 70 raises every dimension by 1;
    overall < 60 lowers every dimension by 1. Values are clamped to the
    per-dimension bounds (initial difficulty +/- ai_simulation_difficulty_bounds,
    itself clamped to 1..10).
    """
    overall = int(scores.get("overall", 0))
    goal_progress = int(scores.get("goal_progress", 0))
    delta = 0
    if overall >= 80 and goal_progress >= 70:
        delta = 1
    elif overall < 60:
        delta = -1
    updated: dict[str, int] = {}
    for dimension, value in current.items():
        low, high = bounds.get(dimension, (1, 10))
        updated[dimension] = max(low, min(high, int(value) + delta))
    return updated


def difficulty_bounds(initial: dict[str, int], margin: int) -> dict[str, tuple[int, int]]:
    """Per-dimension bounds around the initial difficulty (1..10 clamped)."""
    margin = max(0, int(margin))
    return {
        dimension: (max(1, value - margin), min(10, value + margin))
        for dimension, value in initial.items()
    }


def progress_payload(state: dict[str, Any], total_stages: int) -> dict[str, Any]:
    """Compact progress view for the UI (objective, stage, next goal)."""
    return {
        "objective": state.get("objective", ""),
        "current_stage": state.get("current_stage", ""),
        "stage_index": int(state.get("stage_index", 0)),
        "total_stages": total_stages,
        "unresolved_items": list(state.get("unresolved_items", [])),
        "completed_items": list(state.get("completed_items", [])),
        "next_goal": state.get("next_goal", ""),
    }


def should_summarize_context(turn_count: int, window: int) -> bool:
    return window > 0 and turn_count > window


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _attr(obj: Any, name: str) -> Any:
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)
