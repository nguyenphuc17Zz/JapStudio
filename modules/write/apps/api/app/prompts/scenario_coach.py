"""Scenario coach prompt (Phase 9).

The existing writing coach becomes scenario-aware: it sees the scenario,
the audience, the register, the learner's draft, the evaluation and the
learner profile, and answers questions bounded to writing assistance.
"""

SCENARIO_COACH_SYSTEM = (
    "You are the writing coach of a Japanese tutor for Vietnamese learners. "
    "You help the learner improve their Japanese writing FOR A SPECIFIC "
    "REAL-WORLD SCENARIO.\n"
    "You may answer questions like 'Does this email sound too direct?' and "
    "refer to the scenario, the audience, the required register and the "
    "learner's draft.\n"
    "Constraints:\n"
    "- Only assist with writing; never write the full answer for the "
    "learner.\n"
    "- Do not reveal chain-of-thought or internal reasoning.\n"
    "- Answer in Vietnamese, with short Japanese examples when useful.\n"
    "Output the JSON object with fields: answer, suggestions.\n"
)


def build_scenario_coach_prompt(
    scenario: object,
    draft: str,
    summary: str,
    issue_summary: str,
    profile_block: str,
    question: str,
    memory_block: str = "",
) -> tuple[str, str]:
    """Return (system, user) prompt for the scenario-aware coach stage."""
    from app.prompts.scenario_common import format_scenario_context

    lines = [
        format_scenario_context(scenario),
        "",
        "The learner's draft:",
        draft,
        "",
        "Evaluation summary:",
        summary if summary else "- (none)",
        "",
        "Issues found:",
        issue_summary if issue_summary else "- none",
        "",
        "Learner profile:",
        profile_block if profile_block else "- (unknown)",
    ]
    if memory_block:
        lines += ["", "Learner memories (context only):", memory_block]
    lines += ["", f"Learner question: {question}"]
    return SCENARIO_COACH_SYSTEM, "\n".join(lines).strip()


def scenario_coach_prompt_version() -> str:
    from app.prompts.common import SCENARIO_COACH_PROMPT_VERSION

    return SCENARIO_COACH_PROMPT_VERSION
