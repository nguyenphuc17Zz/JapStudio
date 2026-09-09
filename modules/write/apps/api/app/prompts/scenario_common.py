"""Shared scenario context block for downstream prompts (evaluation, coach).

Builds the learner-facing scenario description that scenario-aware stages
embed into their user prompts. Also renders the required points so the
evaluator can judge each one structurally.
"""

from __future__ import annotations

from app.domain.scenario_formats import format_for_genre


def format_scenario_context(scenario: object) -> str:
    """Render a persisted WritingScenario (or dict) as a prompt block."""
    genre = _attr(scenario, "genre")
    fmt = format_for_genre(genre)
    lines = [
        "Scenario:",
        f"- genre: {genre}",
        f"- medium: {_attr(scenario, 'medium')}",
        f"- audience: {_attr(scenario, 'audience')}",
        f"- relationship: {_attr(scenario, 'relationship')}",
        f"- purpose: {_attr(scenario, 'purpose')}",
        f"- register: {_attr(scenario, 'register')}",
        f"- tone: {_attr(scenario, 'tone')}",
        f"- target_length: {_attr(scenario, 'target_length')}",
        f"- jlpt_level: {_attr(scenario, 'jlpt_level')}",
        f"- difficulty: {_attr(scenario, 'difficulty')}",
        "",
        "Situation (Vietnamese):",
        _attr(scenario, "situation_vi"),
        "",
        "Instructions (Vietnamese):",
        _attr(scenario, "context_vi"),
    ]
    required = _attr(scenario, "required_points") or []
    if required:
        lines += ["", "Required points (each one MUST be addressed in the answer):"]
        for point in required:
            lines.append(f"- [{_attr(point, 'id')}] {_attr(point, 'description')}")
    optional = _attr(scenario, "optional_points") or []
    if optional:
        lines += ["", "Optional points (may be included):"]
        lines += [f"- {item}" for item in optional]
    forbidden = _attr(scenario, "forbidden_patterns") or []
    if forbidden:
        lines += ["", "Forbidden patterns (must be avoided):"]
        lines += [f"- {item}" for item in forbidden]
    if fmt and fmt.required_sections:
        lines += ["", "Expected format sections:", ", ".join(fmt.required_sections)]
    return "\n".join(lines)


def _attr(obj: object, name: str):
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)
