"""Required-point evaluation prompt section (used inside the scenario
evaluation stage).

Scores each required point of the scenario as satisfied / partially_
satisfied / missing. Missing a required point must lower the semantic fit -
never the grammar score.
"""

REQUIRED_POINT_EVALUATION_SYSTEM_SECTION = (
    "Required-point evaluation:\n"
    "Each required point is a semantic requirement of the scenario. Judge "
    "whether the learner's answer addresses it:\n"
    "- satisfied: the answer clearly covers the requirement (exact wording "
    "is NOT required).\n"
    "- partially_satisfied: the answer hints at it but does not fully cover "
    "it.\n"
    "- missing: the answer does not address it at all.\n"
    "This is about CONTENT, not wording or grammar: a grammatically perfect "
    "answer that omits a required point must be marked missing for that "
    "point. Never convert a content omission into a grammar error.\n"
    "For each required point output: id, description, status, explanation "
    "(one short Vietnamese sentence).\n"
)


def build_required_point_section(required_points: list) -> str:
    """Render the required-point section of the scenario evaluation prompt."""
    lines = [REQUIRED_POINT_EVALUATION_SYSTEM_SECTION, "Required points to evaluate:"]
    for point in required_points:
        pid = _attr(point, "id")
        description = _attr(point, "description")
        lines.append(f"- [{pid}] {description}")
    return "\n".join(lines)


def required_point_evaluation_prompt_version() -> str:
    from app.prompts.common import REQUIRED_POINT_EVALUATION_PROMPT_VERSION

    return REQUIRED_POINT_EVALUATION_PROMPT_VERSION


def _attr(obj: object, name: str):
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)
