"""Deterministic rule checkers for the curriculum pipeline (Phase 13).

Registered in the shared AI quality registry; same contract as the engine
validators: receive the AI result plus per-task context, return a list of
violation messages (empty == valid). Never call other AI models.
"""

from __future__ import annotations

from typing import Any

from app.domain.curriculum_taxonomy import (
    COMPETENCIES,
    EXERCISE_MODES,
    GOAL_TYPES,
)

TARGET_LEVEL_VALUES = {"N5", "N4", "N3", "N2", "N1", "free"}
SUCCESS_CRITERIA_KEYS = {"threshold", "modes_required", "min_attempts"}
REPLAN_ACTIONS = {"update", "add", "skip"}


def _violations(result: Any, checks: list[tuple[bool, str]]) -> list[str]:
    return [message for ok, message in checks if not ok]


def _non_empty_str(value: Any, label: str) -> tuple[bool, str]:
    if not (isinstance(value, str) and bool(value.strip())):
        return False, f"{label} must be a non-empty string"
    return True, ""


def goal_interpretation(result: Any, **_context: Any) -> list[str]:
    checks: list[tuple[bool, str]] = [
        (result.goal_type in GOAL_TYPES, f"unsupported goal_type: {result.goal_type!r}"),
        (
            isinstance(result.focus_competencies, list)
            and 1 <= len(result.focus_competencies) <= 8,
            "focus_competencies must be a list of 1-8 items",
        ),
    ]
    for competency in getattr(result, "focus_competencies", []):
        checks.append((competency in COMPETENCIES, f"unknown competency: {competency!r}"))
    checks.append(_non_empty_str(result.suggested_goal, "suggested_goal"))
    checks.append(_non_empty_str(result.rationale_vi, "rationale_vi"))
    return _violations(result, checks)


def curriculum_planning(
    result: Any,
    goal_type: str | None = None,
    focus_competencies: list[str] | None = None,
    settings: Any | None = None,
    **_context: Any,
) -> list[str]:
    max_milestones = getattr(settings, "ai_curriculum_max_milestones", 8)
    max_objectives_per_milestone = getattr(
        settings, "ai_curriculum_max_objectives_per_milestone", 6
    )
    checks: list[tuple[bool, str]] = [
        (
            2 <= len(result.milestones) <= max_milestones,
            f"milestones must be 2-{max_milestones}",
        ),
        (
            isinstance(result.objectives, list)
            and 4 <= len(result.objectives) <= max_milestones * max_objectives_per_milestone,
            "objectives must be 4-48",
        ),
    ]
    for milestone in result.milestones:
        checks.append(_non_empty_str(milestone.title, "milestone.title"))
        checks.append(_non_empty_str(milestone.description, "milestone.description"))

    for objective in result.objectives:
        checks.append(_non_empty_str(objective.title, "objective.title"))
        checks.append(_non_empty_str(objective.description, "objective.description"))
        competencies = objective.target_competencies
        checks.append((1 <= len(competencies) <= 4, "objective must train 1-4 competencies"))
        for competency in competencies:
            checks.append((competency in COMPETENCIES, f"unknown competency: {competency!r}"))
        modes = objective.exercise_modes
        checks.append((1 <= len(modes) <= 4, "objective must use 1-4 exercise modes"))
        for mode in modes:
            checks.append((mode in EXERCISE_MODES, f"unknown exercise mode: {mode!r}"))
        checks.append(
            (
                objective.target_level in TARGET_LEVEL_VALUES,
                f"unsupported target_level: {objective.target_level!r}",
            )
        )
        checks.append((1 <= objective.priority <= 5, "priority must be 1-5"))
        for key, value in (objective.success_criteria or {}).items():
            checks.append((key in SUCCESS_CRITERIA_KEYS, f"unknown success criterion: {key!r}"))
            if key == "threshold":
                checks.append((50 <= value <= 95, "threshold must be 50-95"))
            elif key == "modes_required":
                checks.append((2 <= value <= 6, "modes_required must be 2-6"))
            elif key == "min_attempts":
                checks.append((3 <= value <= 10, "min_attempts must be 3-10"))

    milestones_count = len(result.milestones)
    objectives_count = len(result.objectives)
    base = objectives_count // milestones_count
    extra = objectives_count % milestones_count
    for milestone_index in range(1, milestones_count + 1):
        per_milestone = base + (1 if milestone_index <= extra else 0)
        checks.append(
            (
                per_milestone <= max_objectives_per_milestone,
                f"milestone {milestone_index} exceeds {max_objectives_per_milestone} objectives",
            )
        )

    if focus_competencies:
        covered = {
            competency
            for objective in result.objectives
            for competency in objective.target_competencies
        }
        missing = [competency for competency in focus_competencies if competency not in covered]
        checks.append(
            (
                not missing,
                f"focus competencies not covered by any objective: {missing}",
            )
        )
    return _violations(result, checks)


def curriculum_replanning(result: Any, **_context: Any) -> list[str]:
    checks: list[tuple[bool, str]] = [
        (
            isinstance(result.objective_changes, list) and len(result.objective_changes) <= 12,
            "objective_changes must be a list of max 12 items",
        ),
    ]
    for change in result.objective_changes:
        if not isinstance(change, dict):
            checks.append((False, "objective_changes items must be dicts"))
            continue
        objective_id = change.get("objective_id")
        action = change.get("action")
        checks.append(
            (
                isinstance(objective_id, str) and bool(objective_id.strip()),
                "each change needs a non-empty objective_id",
            )
        )
        checks.append((action in REPLAN_ACTIONS, f"unknown action: {action!r}"))
        checks.append(
            (
                isinstance(change.get("field_updates"), dict),
                "each change needs a field_updates dict",
            )
        )
    checks.append(_non_empty_str(result.rationale_vi, "rationale_vi"))
    return _violations(result, checks)


def objective_progress_analysis(result: Any, **_context: Any) -> list[str]:
    return _violations(
        result,
        [
            _non_empty_str(result.summary_vi, "summary_vi"),
            _non_empty_str(result.recommended_focus_vi, "recommended_focus_vi"),
        ],
    )
