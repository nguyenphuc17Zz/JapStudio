"""Scenario-aware evaluation prompt (Phase 9 scenario stage).

ONE structured call that scores how well the draft fits the scenario:
semantic fit, audience fit, purpose fit, tone fit, constraint compliance,
required-point coverage and genre format sections. Composed from the shared
scenario context plus the required-point and tone sections - the same
composition pattern as the discourse analysis stage.
"""

from __future__ import annotations

from app.domain.scenario_formats import format_for_genre
from app.prompts.common import (
    MEANING_PRESERVATION_RULES,
)
from app.prompts.required_point_evaluation import build_required_point_section
from app.prompts.scenario_common import format_scenario_context
from app.prompts.tone_evaluation import build_tone_section

SCENARIO_EVALUATION_SYSTEM = (
    "You are the scenario evaluation stage of a Japanese writing tutor. The "
    "learner wrote a Japanese text for a real-world scenario. Score how well "
    "the text FITS the scenario - this is separate from the language quality "
    "scored by other stages.\n"
    f"{MEANING_PRESERVATION_RULES}\n"
    "Score five dimensions (0-100):\n"
    "- scenario_semantic_fit: does the answer convey the scenario's required "
    "content? Missing a required point lowers this - grammar stays untouched.\n"
    "- audience_fit: is the answer appropriate for who receives it (register, "
    "level of politeness, phrasing)?\n"
    "- purpose_fit: does the answer achieve the communication goal (e.g. "
    "requesting confirmation means actually asking for it, not just writing "
    "a correct sentence)? A grammatically correct answer that does not "
    "complete the goal gets a lower purpose_fit.\n"
    "- tone_fit: does the tone match the scenario's expected tone?\n"
    "- constraint_compliance: are forbidden patterns avoided and the "
    "length/tone constraints respected?\n"
    "Then evaluate every required point (satisfied / partially_satisfied / "
    "missing) and every expected format section (present / partial / "
    "missing). Sections not expected for this genre are omitted.\n"
    "Output the JSON object only."
)


def build_scenario_evaluation_prompt(
    scenario: object,
    sentences: list[str],
) -> tuple[str, str]:
    """Return (system, user) prompt for the scenario evaluation stage."""
    scenario_block = format_scenario_context(scenario)
    required_points = _attr(scenario, "required_points") or []
    genre = _attr(scenario, "genre")
    fmt = format_for_genre(genre)
    lines = [
        scenario_block,
        "",
        "The learner's Japanese text (index: text):",
        *[f"{i}. {s}" for i, s in enumerate(sentences)],
        "",
        build_required_point_section(required_points),
        "",
        build_tone_section(
            _attr(scenario, "tone"),
            _attr(scenario, "audience"),
            _attr(scenario, "register"),
        ),
    ]
    if fmt and fmt.required_sections:
        lines += [
            "",
            "Format sections to evaluate (present / partial / missing): "
            + ", ".join(fmt.required_sections),
        ]
    lines += [
        "",
        "Output the JSON object with fields: scenario_semantic_fit, "
        "audience_fit, purpose_fit, tone_fit, constraint_compliance, "
        "required_points (id, description, status, explanation), "
        "format_sections (name, status, note), strengths, summary.",
    ]
    return SCENARIO_EVALUATION_SYSTEM, "\n".join(lines).strip()


def scenario_evaluation_prompt_version() -> str:
    from app.prompts.common import SCENARIO_EVALUATION_PROMPT_VERSION

    return SCENARIO_EVALUATION_PROMPT_VERSION


def _attr(obj: object, name: str):
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)
