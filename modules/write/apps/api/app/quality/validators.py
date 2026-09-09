"""Deterministic rule checkers registered in the AI quality registry.

Every checker receives an AI result plus per-task context and returns a list
of violation messages (empty == valid). Checkers never call other AI models:
schema / enum / range / cross-field / reference-ID / index / taxonomy checks
are cheap and always run before any optional verifier.

The existing engine-specific validators (evaluation / discourse /
simulation state machine) are wrapped here so the engines can route through
the shared quality layer without duplicating rules.
"""

from __future__ import annotations

from typing import Any

from app.domain.memory_taxonomy import (
    MEMORY_CATEGORIES,
    MEMORY_SOURCES,
    MEMORY_TYPES,
    is_valid_confidence,
)
from app.domain.scenario_formats import (
    AUDIENCES,
    GENRES,
    MEDIA,
    PURPOSES,
    RELATIONSHIPS,
    TONES,
)
from app.domain.scenario_formats import (
    REGISTERS as SCENARIO_REGISTERS,
)
from app.quality.enums import parse_confidence
from app.services.discourse_consistency import (
    DiscourseConsistencyError,
    DiscourseConsistencyValidator,
)
from app.services.evaluation_consistency import (
    EvaluationConsistencyError,
    EvaluationConsistencyValidator,
)
from app.services.simulation_state_machine import (
    SimulationConsistencyError,
    SimulationConsistencyValidator,
)

JLPT_VALUES = {"N5", "N4", "N3", "N2", "N1"}
EXERCISE_TYPE_VALUES = {
    "sentence_translation",
    "multi_sentence_translation",
    "paragraph_translation",
    "free_writing",
    "register_challenge",
    "email_writing",
    "chat_writing",
    "report_writing",
    "ticket_writing",
    "scenario_response",
    "opinion_writing",
}
TARGET_LENGTH_VALUES = {
    "short_sentence",
    "sentence",
    "multi_sentence",
    "paragraph",
    "long_writing",
}
REGISTER_VALUES = {"casual", "polite", "business", "mixed"}
CATEGORY_VALUES = {"grammar", "vocabulary", "naturalness", "register", "semantic"}
SEVERITY_VALUES = {"info", "minor", "major", "critical"}
REQUIRED_POINT_STATUSES = {"satisfied", "partially_satisfied", "missing"}
FORMAT_SECTION_STATUSES = {"present", "partial", "missing"}
CROSS_CONSISTENCY_TOLERANCE = 3.0

_eval_validator = EvaluationConsistencyValidator()
_discourse_validator = DiscourseConsistencyValidator()
_simulation_validator = SimulationConsistencyValidator()


# -- generic helpers ---------------------------------------------------------


def _violations(result: Any, checks: list[tuple[bool, str]]) -> list[str]:
    return [message for ok, message in checks if not ok]


def _score_in_band(score: Any, low: int, high: int) -> bool:
    return isinstance(score, int) and low <= score <= high


def _int_in_range(value: Any, low: int, high: int) -> bool:
    return isinstance(value, int) and low <= value <= high


def _non_empty_str(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


# -- writing evaluation stages (Phase 4) -------------------------------------


def semantic_evaluation(result: Any, **_context: Any) -> list[str]:
    try:
        _eval_validator.check_semantic(result)
    except EvaluationConsistencyError as exc:
        return [exc.message]
    return []


def grammar_vocabulary_evaluation(result: Any, **_context: Any) -> list[str]:
    try:
        _eval_validator.check_grammar_vocabulary(result)
    except EvaluationConsistencyError as exc:
        return [exc.message]
    return []


def naturalness_register_evaluation(
    result: Any, exercise_register: str | None = None, **_context: Any
) -> list[str]:
    try:
        _eval_validator.check_naturalness_register(result, exercise_register or "mixed")
    except EvaluationConsistencyError as exc:
        return [exc.message]
    return []


def writing_evaluation(
    result: Any, exercise_register: str | None = None, **_context: Any
) -> list[str]:
    """Whole synthesized evaluation: score bands, register reason, hints."""
    try:
        _eval_validator.check_whole(result, exercise_register=exercise_register or "mixed")
    except EvaluationConsistencyError as exc:
        return [exc.message]
    return []


# -- exercise generation (Phase 3) -------------------------------------------


def exercise_generation(result: Any, plan: Any = None, **_context: Any) -> list[str]:
    """Draft-level checks: dimensions in range and (when a plan is supplied)
    cross-consistency between the planned difficulty and the sub-metrics."""
    violations: list[str] = []
    for attr, label in (
        ("grammar_complexity", "grammar_complexity"),
        ("vocabulary_complexity", "vocabulary_complexity"),
        ("context_complexity", "context_complexity"),
        ("naturalness_target", "naturalness_target"),
    ):
        value = getattr(result, attr, None)
        if not _int_in_range(value, 1, 10):
            violations.append(f"{label} must be an integer in 1..10")
    if plan is not None:
        mean = _sub_metric_mean(result)
        if mean is not None and abs(mean - plan.difficulty) > CROSS_CONSISTENCY_TOLERANCE:
            violations.append(
                f"difficulty sub-metrics (mean {mean:.2f}) deviate from the planned "
                f"difficulty {plan.difficulty} by more than {CROSS_CONSISTENCY_TOLERANCE}"
            )
    return violations


def _sub_metric_mean(result: Any) -> float | None:
    values = [
        getattr(result, attr, None)
        for attr in (
            "grammar_complexity",
            "vocabulary_complexity",
            "context_complexity",
            "naturalness_target",
        )
    ]
    if any(not isinstance(v, int) for v in values):
        return None
    return sum(values) / len(values)


# -- vocabulary (Phase 5) -----------------------------------------------------


def vocabulary_candidate(result: Any, **_context: Any) -> list[str]:
    """One extracted candidate must carry coherent, supported metadata."""
    if hasattr(result, "candidates"):
        violations: list[str] = []
        for index, candidate in enumerate(result.candidates):
            violations.extend(_candidate_checks(candidate, index))
        return violations
    return _candidate_checks(result, 0)


def _candidate_checks(candidate: Any, index: int) -> list[str]:
    prefix = f"candidate[{index}] "
    checks = [
        (_non_empty_str(getattr(candidate, "expression", None)), prefix + "expression is required"),
        (
            getattr(candidate, "difficulty", None) is None
            or _int_in_range(getattr(candidate, "difficulty", None), 1, 10),
            prefix + "difficulty must be an integer in 1..10",
        ),
        (
            getattr(candidate, "importance", None) is None
            or _int_in_range(getattr(candidate, "importance", None), 1, 10),
            prefix + "importance must be an integer in 1..10",
        ),
        (
            getattr(candidate, "estimated_jlpt_level", None) is None
            or getattr(candidate, "estimated_jlpt_level", None) in JLPT_VALUES,
            prefix + f"estimated_jlpt_level must be one of {sorted(JLPT_VALUES)}",
        ),
        (
            getattr(candidate, "register", None) is None
            or getattr(candidate, "register", None) in REGISTER_VALUES,
            prefix + f"register must be one of {sorted(REGISTER_VALUES)}",
        ),
        (
            getattr(candidate, "confidence", None) is None
            or parse_confidence(getattr(candidate, "confidence", None)) is not None,
            prefix + "confidence must be high/medium/low",
        ),
    ]
    return _violations(None, checks)


# -- learner profile & planner (Phase 6) -------------------------------------


def learner_profile_synthesis(result: Any, **_context: Any) -> list[str]:
    jlpt = getattr(result, "estimated_jlpt", None)
    violations: list[str] = []
    if jlpt is not None:
        for key in ("min_level", "max_level"):
            level = getattr(jlpt, key, None)
            if level is not None and level not in JLPT_VALUES:
                violations.append(f"estimated_jlpt.{key} must be one of {sorted(JLPT_VALUES)}")
        conf = getattr(jlpt, "confidence", None)
        if conf is not None and parse_confidence(conf) is None:
            violations.append("estimated_jlpt.confidence must be high/medium/low")
    trends = getattr(result, "recent_trends", None)
    if trends is not None:
        score = getattr(trends, "overall_score", None)
        if score is not None and not _score_in_band(score, 0, 100):
            violations.append("recent_trends.overall_score must be in 0..100")
    return violations


def learning_planner(result: Any, **_context: Any) -> list[str]:
    plan = getattr(result, "planned_exercise", None)
    if plan is None:
        return []
    checks = [
        (
            getattr(plan, "exercise_type", None) in EXERCISE_TYPE_VALUES,
            f"planned_exercise.exercise_type must be one of {sorted(EXERCISE_TYPE_VALUES)}",
        ),
        (
            getattr(plan, "jlpt_level", None) in JLPT_VALUES,
            f"planned_exercise.jlpt_level must be one of {sorted(JLPT_VALUES)}",
        ),
        (
            getattr(plan, "register", None) in REGISTER_VALUES,
            f"planned_exercise.register must be one of {sorted(REGISTER_VALUES)}",
        ),
        (
            getattr(plan, "target_length", None) in TARGET_LENGTH_VALUES,
            f"planned_exercise.target_length must be one of {sorted(TARGET_LENGTH_VALUES)}",
        ),
        (
            _int_in_range(getattr(plan, "difficulty", None), 1, 10),
            "planned_exercise.difficulty must be an integer in 1..10",
        ),
    ]
    return _violations(None, checks)


# -- scenario (Phase 9) -------------------------------------------------------


def _scenario_dimension_checks(dimensions: Any, label: str) -> list[str]:
    if dimensions is None:
        return []
    violations: list[str] = []
    for key in ("language", "context", "audience", "purpose", "constraint", "register"):
        value = (
            dimensions.get(key) if isinstance(dimensions, dict) else getattr(dimensions, key, None)
        )
        if value is not None and not _int_in_range(value, 1, 10):
            violations.append(f"{label}.{key} must be an integer in 1..10")
    return violations


def scenario_generation(result: Any, **_context: Any) -> list[str]:
    violations: list[str] = []
    for attr, allowed, label in (
        ("genre", set(GENRES), "genre"),
        ("medium", set(MEDIA), "medium"),
        ("audience", set(AUDIENCES), "audience"),
        ("purpose", set(PURPOSES), "purpose"),
        ("register", set(SCENARIO_REGISTERS), "register"),
        ("tone", set(TONES), "tone"),
    ):
        value = getattr(result, attr, None)
        if value is not None and value not in allowed:
            violations.append(f"{label} '{value}' is not supported by the scenario taxonomy")
    relationship = getattr(result, "relationship", None)
    if relationship is not None and relationship not in RELATIONSHIPS:
        violations.append(f"relationship '{relationship}' is not supported")
    jlpt = getattr(result, "jlpt_level", None)
    if jlpt is not None and jlpt not in JLPT_VALUES:
        violations.append(f"jlpt_level must be one of {sorted(JLPT_VALUES)}")
    difficulty = getattr(result, "difficulty", None)
    if difficulty is not None and not _int_in_range(difficulty, 1, 10):
        violations.append("difficulty must be an integer in 1..10")
    violations.extend(
        _scenario_dimension_checks(
            getattr(result, "difficulty_metadata", None), "difficulty_metadata"
        )
    )
    return violations


def scenario_evaluation(result: Any, **_context: Any) -> list[str]:
    violations: list[str] = []
    for attr in (
        "scenario_semantic_fit",
        "audience_fit",
        "purpose_fit",
        "tone_fit",
        "constraint_compliance",
    ):
        value = getattr(result, attr, None)
        if value is not None and not _score_in_band(value, 0, 100):
            violations.append(f"{attr} must be an integer in 0..100")
    for point in getattr(result, "required_points", None) or []:
        status = getattr(point, "status", None)
        if status is not None and status not in REQUIRED_POINT_STATUSES:
            violations.append(
                f"required point status must be one of {sorted(REQUIRED_POINT_STATUSES)}"
            )
    for section in getattr(result, "format_sections", None) or []:
        status = getattr(section, "status", None)
        if status is not None and status not in FORMAT_SECTION_STATUSES:
            violations.append(
                f"format section status must be one of {sorted(FORMAT_SECTION_STATUSES)}"
            )
    return violations


# -- long-form discourse (Phase 8) --------------------------------------------


def discourse_evaluation(result: Any, sentence_count: int = 0, **_context: Any) -> list[str]:
    """Analysis / style / synthesis stage checks (when present)."""
    try:
        if hasattr(result, "coherence_score"):
            _discourse_validator.check_analysis(result, sentence_count)
        if hasattr(result, "style_consistency_score"):
            _discourse_validator.check_style(result, sentence_count)
        if hasattr(result, "strengths"):
            _discourse_validator.check_synthesis(result)
    except DiscourseConsistencyError as exc:
        return [exc.message]
    return []


# -- simulation (Phase 10) -----------------------------------------------------


def simulation_plan(result: Any, **_context: Any) -> list[str]:
    violations: list[str] = []
    if not _non_empty_str(getattr(result, "objective_vi", None)):
        violations.append("objective_vi is required")
    stages = getattr(result, "stages", None) or []
    if not stages:
        violations.append("stages must not be empty")
    for index, stage in enumerate(stages):
        if not _non_empty_str(getattr(stage, "name", None)):
            violations.append(f"stages[{index}].name is required")
        if not _non_empty_str(getattr(stage, "goal", None)):
            violations.append(f"stages[{index}].goal is required")
    persona = getattr(result, "persona", None)
    if persona is not None:
        if not _non_empty_str(getattr(persona, "name", None)):
            violations.append("persona.name is required")
        if not _non_empty_str(getattr(persona, "role", None)):
            violations.append("persona.role is required")
    dimensions = getattr(result, "difficulty", None)
    if dimensions is not None:
        for key in (
            "language_complexity",
            "context_complexity",
            "social_complexity",
            "negotiation_complexity",
            "ambiguity",
            "time_pressure",
        ):
            value = (
                dimensions.get(key)
                if isinstance(dimensions, dict)
                else getattr(dimensions, key, None)
            )
            if value is not None and not _int_in_range(value, 1, 10):
                violations.append(f"difficulty.{key} must be an integer in 1..10")
    return violations


def simulation_turn_evaluation(result: Any, **_context: Any) -> list[str]:
    violations: list[str] = []
    for attr in ("goal_progress", "communication_effectiveness"):
        value = getattr(result, attr, None)
        if value is not None and not _score_in_band(value, 0, 100):
            violations.append(f"{attr} must be an integer in 0..100")
    for issue in getattr(result, "issues", None) or []:
        category = getattr(issue, "category", None)
        if category is not None and category not in CATEGORY_VALUES:
            violations.append(f"issue category must be one of {sorted(CATEGORY_VALUES)}")
        severity = getattr(issue, "severity", None)
        if severity is not None and severity not in SEVERITY_VALUES:
            violations.append(f"issue severity must be one of {sorted(SEVERITY_VALUES)}")
    return violations


def simulation_state_update(result: Any, previous_state: Any = None, **_context: Any) -> list[str]:
    """State updates must be structurally valid AND must not silently drop or
    contradict facts/decisions from the previous state (requirement 35)."""
    violations: list[str] = []
    try:
        _simulation_validator.check_state_update(result)
    except SimulationConsistencyError as exc:
        return [str(exc)]

    if previous_state is not None:
        for key in ("facts", "decisions"):
            previous_values = _state_values(previous_state, key)
            proposed_values = _state_values(result, key)
            if previous_values and proposed_values is not None:
                dropped = [value for value in previous_values if value not in proposed_values]
                if dropped:
                    violations.append(f"state update silently drops {key}: {dropped[:3]}")
        completed = _state_values(result, "completed_items")
        unresolved = _state_values(result, "unresolved_items")
        if completed and unresolved:
            overlap = [value for value in completed if value in unresolved]
            if overlap:
                violations.append(
                    f"state update marks items as completed and unresolved: {overlap[:3]}"
                )
    return violations


def _state_values(state: Any, key: str) -> list[str] | None:
    if isinstance(state, dict):
        values = state.get(key)
    else:
        values = getattr(state, key, None)
    if not isinstance(values, list):
        return None
    return [str(value) for value in values if value]


# -- memory (Phase 12) --------------------------------------------------------


def memory_extraction(result: Any, **_context: Any) -> list[str]:
    """Extraction candidates must respect the controlled memory taxonomy."""
    violations: list[str] = []
    candidates = getattr(result, "candidate_memories", None)
    if candidates is None:
        return ["candidate_memories is required"]
    for index, candidate in enumerate(candidates):
        prefix = f"candidate_memories[{index}] "
        category = getattr(candidate, "category", None)
        if category not in MEMORY_CATEGORIES:
            violations.append(prefix + f"unsupported category '{category}'")
        memory_type = getattr(candidate, "type", None)
        if memory_type not in MEMORY_TYPES:
            violations.append(prefix + f"unsupported type '{memory_type}'")
        content = getattr(candidate, "content", None)
        if not (isinstance(content, str) and content.strip()):
            violations.append(prefix + "content is required")
        confidence = getattr(candidate, "confidence", None)
        if confidence is not None and not is_valid_confidence(str(confidence)):
            violations.append(prefix + "confidence must be high/medium/low")
        importance = getattr(candidate, "importance", None)
        if importance is not None and not _int_in_range(importance, 1, 10):
            violations.append(prefix + "importance must be an integer in 1..10")
        evidence = getattr(candidate, "evidence", None) or []
        for evidence_index, item in enumerate(evidence):
            source_type = getattr(item, "source_type", None)
            if source_type not in MEMORY_SOURCES:
                violations.append(
                    prefix + f"evidence[{evidence_index}].source_type unsupported '{source_type}'"
                )
    return violations


def memory_validation(result: Any, **_context: Any) -> list[str]:
    """Validation decisions must be well-formed and actionable."""
    violations: list[str] = []
    action = getattr(result, "action", None)
    if action not in ("accept", "reject", "merge", "update"):
        violations.append(f"action must be one of accept/reject/merge/update, got '{action}'")
    if action == "merge" and not getattr(result, "matched_memory_id", None):
        violations.append("merge action requires matched_memory_id")
    confidence = getattr(result, "adjusted_confidence", None)
    if confidence is not None and not is_valid_confidence(str(confidence)):
        violations.append("adjusted_confidence must be high/medium/low")
    importance = getattr(result, "adjusted_importance", None)
    if importance is not None and not _int_in_range(importance, 1, 10):
        violations.append("adjusted_importance must be an integer in 1..10")
    return violations


def memory_conflict(result: Any, **_context: Any) -> list[str]:
    verdict = getattr(result, "verdict", None)
    if verdict not in ("contradiction", "refinement", "contextual", "preference_change"):
        return [
            f"verdict must be one of contradiction/refinement/contextual/preference_change, "
            f"got '{verdict}'"
        ]
    return []


# -- verifier for writing evaluation (AI-based, used by the registry) ---------


def evaluation_verifier(**context: Any) -> Any:
    """AI verifier marker used by the registry.

    The actual verification call lives in ``app.quality.verification``; this
    indirection keeps the registry import-safe and testable.
    """
    from app.quality.verification import run_evaluation_verifier

    return run_evaluation_verifier(**context)
