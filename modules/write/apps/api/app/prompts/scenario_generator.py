"""Scenario generator prompt (stage 2 of the scenario pipeline).

Turns the plan into the actual scenario content: a natural Vietnamese
situation, instructions, structured required points, optional points,
forbidden patterns and difficulty sub-dimensions.
"""

SCENARIO_GENERATOR_SYSTEM = (
    "You are the scenario generator of a Japanese writing tutor for "
    "Vietnamese learners. You write REAL-WORLD writing situations in natural "
    "Vietnamese.\n"
    "The learner practices 'What would I actually write in this situation?' - "
    "not 'translate this sentence'.\n"
    "Quality requirements:\n"
    "- situation_vi: a short, realistic description of what happened and who "
    "is involved, written like a real person explaining the situation (1-2 "
    "short paragraphs). No textbook phrasing.\n"
    "- context_vi: practical instructions telling the learner what to write "
    "(medium, audience, goal). Keep it natural, not a lecture.\n"
    "- required_points: 2-4 concrete semantic requirements the answer MUST "
    "contain, each with a short id (e.g. 'ack_request') and a description. "
    "These drive the evaluation - they must be objectively checkable in the "
    "answer, without requiring exact wording.\n"
    "- optional_points: 0-3 things that may be included.\n"
    "- forbidden_patterns: 0-3 things to avoid (e.g. blaming the customer, "
    "sounding too direct).\n"
    "- difficulty_metadata: one value 1-10 for each of: language, context, "
    "audience, purpose, constraint, register.\n"
    "- grammar_complexity, vocabulary_complexity, context_complexity, "
    "naturalness_target: values 1-10 consistent with the planned difficulty.\n"
    "The learner must never see the expected Japanese answer; only the "
    "situation and the required points.\n"
    "Respond with the JSON object only."
)


def build_scenario_generator_prompt(
    plan: object,
    issues: list[str] | None = None,
    similar_scenarios: list[str] | None = None,
) -> tuple[str, str]:
    """Return (system, user) prompt for the scenario generator stage."""
    lines = [
        "Plan:",
        f"- genre: {_attr(plan, 'genre')}",
        f"- medium: {_attr(plan, 'medium')}",
        f"- audience: {_attr(plan, 'audience')}",
        f"- relationship: {_attr(plan, 'relationship')}",
        f"- purpose: {_attr(plan, 'purpose')}",
        f"- register: {_attr(plan, 'register')}",
        f"- tone: {_attr(plan, 'tone')}",
        f"- jlpt_level: {_attr(plan, 'jlpt_level')}",
        f"- target_length: {_attr(plan, 'target_length')}",
        f"- difficulty: {_attr(plan, 'difficulty')}",
        f"- topic: {_attr(plan, 'topic')}",
    ]
    if issues:
        lines += ["", "Validation issues from the previous attempt (fix them):"]
        lines += [f"- {issue}" for issue in issues]
    if similar_scenarios:
        lines += ["", "Similar existing scenarios - make this one meaningfully different:"]
        lines += [f"- {s}" for s in similar_scenarios]
    lines += [
        "",
        "Output the JSON object with fields: situation_vi, context_vi, "
        "required_points, optional_points, forbidden_patterns, "
        "difficulty_metadata, grammar_complexity, vocabulary_complexity, "
        "context_complexity, naturalness_target.",
    ]
    return SCENARIO_GENERATOR_SYSTEM, "\n".join(lines).strip()


def scenario_generator_prompt_version() -> str:
    from app.prompts.common import SCENARIO_GENERATOR_PROMPT_VERSION

    return SCENARIO_GENERATOR_PROMPT_VERSION


def _attr(obj: object, name: str):
    return getattr(obj, name, None)
