"""Deterministic objective mastery computation (Phase 13).

Pure functions over plain dicts so the logic is unit-testable without a
database. Mastery state and objective completion are ALWAYS computed here -
AI output never overrides these numbers.
"""

from __future__ import annotations

from typing import Any

from app.domain.curriculum_taxonomy import MASTERY_STATES


def update_skill_evidence(
    current: dict[str, Any], scores: dict[str, int], mode: str, settings: Any
) -> dict[str, Any]:
    """Incrementally fold one evaluated attempt into per-skill evidence.

    Evidence shape: {"<skill>": {"score": int, "count": int}}. Average is a
    running weighted mean so old evidence decays naturally with volume.
    """
    evidence = dict(current or {})
    for skill, score in scores.items():
        entry = dict(evidence.get(skill) or {})
        previous = int(entry.get("count", 0))
        old_score = int(entry.get("score", 0))
        new_count = previous + 1
        new_score = round((old_score * previous + int(score)) / new_count)
        entry["score"] = min(100, max(0, new_score))
        entry["count"] = new_count
        evidence[skill] = entry
    return evidence


def update_modes_used(current: dict[str, Any], mode: str) -> dict[str, int]:
    """Track how many exercises per exercise mode were completed."""
    modes = dict(current or {})
    modes[mode] = int(modes.get(mode, 0)) + 1
    return modes


def compute_mastery_state(progress: dict[str, Any], settings: Any) -> str:
    """Map evidence to one of the six mastery states (deterministic)."""
    exercises_completed = int(progress.get("exercises_completed", 0))
    average_score = int(progress.get("average_score", 0))
    evidence = progress.get("skill_evidence") or {}
    modes_used = progress.get("modes_used") or {}

    if exercises_completed <= 0:
        return "not_started"

    confidence_min = int(getattr(settings, "ai_curriculum_min_evidence_confident", 3))
    default_threshold = int(getattr(settings, "ai_curriculum_default_threshold", 80))
    mastery_attempts = int(getattr(settings, "ai_curriculum_mastery_attempts", 5))
    modes_required = int(progress.get("modes_required", 2))

    evidence_counts = [int(item.get("count", 0)) for item in evidence.values()]
    max_evidence_count = max(evidence_counts, default=0)

    if average_score >= default_threshold:
        modes_met = len(modes_used) >= modes_required
        if max_evidence_count >= mastery_attempts and modes_met:
            return "mastered"
        if max_evidence_count >= confidence_min:
            return "proficient"
        return "practicing"
    if average_score >= 60 and max_evidence_count >= confidence_min:
        return "developing"
    if average_score >= 60:
        return "practicing"
    return "introduced"


def is_objective_completed(
    objective: dict[str, Any], progress: dict[str, Any], settings: Any
) -> tuple[bool, list[str]]:
    """Evaluate the deterministic success criteria for one objective.

    Returns (completed, unmet_reasons). Completion requires ALL criteria:
    enough attempts, average score at threshold, and practice across the
    required number of distinct exercise modes.
    """
    criteria = objective.get("success_criteria") or {}
    threshold = int(
        criteria.get("threshold", getattr(settings, "ai_curriculum_default_threshold", 80))
    )
    min_attempts = int(
        criteria.get("min_attempts", getattr(settings, "ai_curriculum_mastery_attempts", 5))
    )
    modes_required = int(criteria.get("modes_required", 2))

    exercises_completed = int(progress.get("exercises_completed", 0))
    average_score = int(progress.get("average_score", 0))
    modes_used = progress.get("modes_used") or {}

    reasons: list[str] = []
    if exercises_completed < min_attempts:
        reasons.append(
            f"need {min_attempts - exercises_completed} more completed exercise(s) "
            f"({exercises_completed}/{min_attempts})"
        )
    if average_score < threshold:
        reasons.append(f"average score {average_score} below threshold {threshold}")
    if len(modes_used) < modes_required:
        reasons.append(
            f"need {modes_required - len(modes_used)} more distinct exercise mode(s) "
            f"({sorted(modes_used)})"
        )
    return (not reasons, reasons)


def state_label_vi(state: str) -> str:
    from app.domain.curriculum_taxonomy import MASTERY_LABELS_VI

    if state not in MASTERY_STATES:
        return state
    return MASTERY_LABELS_VI[state]
