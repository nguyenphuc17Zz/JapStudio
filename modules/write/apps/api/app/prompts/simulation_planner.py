"""Simulation planner prompt (Phase 10).

The planner designs the interactive conversation ON TOP of an existing
WritingScenario: one measurable objective, an ordered stage plan, a persona
(the simulated counterpart), the pressure condition and a difficulty
proposal. It never rewrites the scenario itself and never invents a second
taxonomy - simulation types are derived in code.
"""

from app.domain.simulation_types import (
    PRESSURE_CONDITIONS,
    SIMULATION_DIFFICULTY_DIMENSIONS,
    SIMULATION_TYPES,
)

SIMULATION_PLANNER_SYSTEM = (
    "You are the conversation designer of a Japanese writing tutor for "
    "Vietnamese learners. You plan an interactive, goal-oriented Japanese "
    "conversation that the learner will act out in writing with a simulated "
    "counterpart, based on a given real-world scenario.\n"
    "Available simulation types (already derived from the scenario - never "
    "change it):\n" + "\n".join(f"- {t}" for t in SIMULATION_TYPES) + "\n\n"
    "Available pressure conditions:\n" + "\n".join(f"- {p}" for p in PRESSURE_CONDITIONS) + "\n\n"
    "Rules:\n"
    "- objective_vi: exactly ONE measurable objective the learner must "
    "achieve by writing (Vietnamese, 1-2 sentences).\n"
    "- stages: 3-5 ordered stages, each with a short name and one goal that "
    "moves the conversation toward the objective.\n"
    "- persona: the simulated counterpart - a realistic name (Japanese "
    "preferred), a role consistent with the scenario audience, and a short "
    "personality note in Vietnamese. The persona always speaks Japanese.\n"
    "- pressure_condition: choose from the list; 'normal' unless the scenario "
    "clearly implies urgency, a difficult counterpart or ambiguity.\n"
    "- difficulty: propose 1-10 per dimension, close to the scenario "
    "difficulty metadata values.\n"
    "- The conversation register must match the scenario register.\n"
    "- Do NOT invent plot beyond the scenario; the persona's facts come only "
    "from the scenario situation.\n"
    "Respond with the JSON object only."
)


def build_simulation_planner_prompt(
    scenario_context: str,
    simulation_type: str,
    profile_block: str,
    recent_summaries: list[str],
) -> tuple[str, str]:
    """Return (system, user) prompt for the simulation planner stage."""
    lines = [
        "Scenario (the conversation must stay strictly inside it):",
        scenario_context,
        "",
        f"Derived simulation type: {simulation_type}",
        "",
        "Learner profile:",
        profile_block,
    ]
    if recent_summaries:
        lines += [
            "",
            "Recent simulations already done (make this one different, but do "
            "not ignore the given scenario):",
            *[f"- {s}" for s in recent_summaries],
        ]
    lines += [
        "",
        "Output the JSON object with fields: objective_vi, stages "
        "(list of {name, goal}), persona ({name, role, personality_vi}), "
        "pressure_condition, difficulty ({" + ", ".join(SIMULATION_DIFFICULTY_DIMENSIONS) + "}).",
    ]
    return SIMULATION_PLANNER_SYSTEM, "\n".join(lines).strip()


def simulation_planner_prompt_version() -> str:
    from app.prompts.common import SIMULATION_PLANNER_PROMPT_VERSION

    return SIMULATION_PLANNER_PROMPT_VERSION
