"""Scenario validator prompt (stage 3 of the scenario pipeline).

Quality gate for generated scenarios: realism, dimension consistency,
difficulty match, evaluable requirements, natural Vietnamese and
uniqueness. Deterministic checks in the service complement this AI gate.
"""

SCENARIO_VALIDATION_SYSTEM = (
    "You are the scenario validator of a Japanese writing tutor. You judge "
    "whether a generated writing scenario is good enough to give to a "
    "Vietnamese learner.\n"
    "Check each of these and list the problems you find:\n"
    "- Realism: could this situation actually happen in the learner's "
    "professional or daily life?\n"
    "- Consistency: do audience, medium, purpose, register and tone agree "
    "with each other (no formal business email to a close friend)?\n"
    "- Difficulty: do the difficulty_metadata dimensions match the planned "
    "difficulty for the learner's level?\n"
    "- Requirements: are the required points concrete, distinct and "
    "objectively evaluable (not vague like 'write well')?\n"
    "- Natural Vietnamese: does situation_vi/context_vi read like a real "
    "person speaking, with no textbook or machine-translated phrasing?\n"
    "- Uniqueness: is the scenario meaningfully different from similar "
    "existing ones?\n"
    "Be strict but fair: minor polish issues alone should not invalidate a "
    "scenario.\n"
    "Respond with the JSON object only."
)


def build_scenario_validation_prompt(
    plan: object,
    draft: object,
    similar_scenarios: list[str],
) -> tuple[str, str]:
    """Return (system, user) prompt for the scenario validation stage."""
    lines = ["Plan:", f"- genre: {_attr(plan, 'genre')}", f"- medium: {_attr(plan, 'medium')}"]
    lines += [
        f"- audience: {_attr(plan, 'audience')}",
        f"- purpose: {_attr(plan, 'purpose')}",
        f"- register: {_attr(plan, 'register')}",
        f"- tone: {_attr(plan, 'tone')}",
        f"- difficulty: {_attr(plan, 'difficulty')}",
        "",
        "Generated scenario:",
        f"Situation (Vietnamese):\n{_attr(draft, 'situation_vi')}",
        f"Instructions (Vietnamese):\n{_attr(draft, 'context_vi')}",
    ]
    required = _attr(draft, "required_points") or []
    lines += ["", "Required points:"] + [
        f"- [{_attr(p, 'id')}] {_attr(p, 'description')}" for p in required
    ]
    optional = _attr(draft, "optional_points") or []
    if optional:
        lines += ["", "Optional points:"] + [f"- {o}" for o in optional]
    forbidden = _attr(draft, "forbidden_patterns") or []
    if forbidden:
        lines += ["", "Forbidden patterns:"] + [f"- {f}" for f in forbidden]
    lines += [
        "",
        "Difficulty metadata: "
        + ", ".join(f"{k}={v}" for k, v in sorted(_attr(draft, "difficulty_metadata").items())),
        "",
        "Similar existing scenarios:",
    ] + ([f"- {s}" for s in similar_scenarios] if similar_scenarios else ["- none"])
    lines += [
        "",
        "Output the JSON object with fields: valid, issues, suggestion.",
    ]
    return SCENARIO_VALIDATION_SYSTEM, "\n".join(lines).strip()


def scenario_validation_prompt_version() -> str:
    from app.prompts.common import SCENARIO_VALIDATION_PROMPT_VERSION

    return SCENARIO_VALIDATION_PROMPT_VERSION


def _attr(obj: object, name: str):
    return getattr(obj, name, None)
