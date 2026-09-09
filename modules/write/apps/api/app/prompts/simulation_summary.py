"""Simulation summary prompt (Phase 10).

The end-of-session report. Every statement must be grounded in the persisted
turns and scores - the prompt contains the actual data, and the summary is
persisted after the first call (never regenerated on read). A deterministic
fallback exists for when the AI fails.
"""

from app.prompts.common import OUTPUT_INSTRUCTION

SIMULATION_SUMMARY_SYSTEM = (
    "You are the session reviewer of a Japanese writing tutor. Write the "
    "final report of an interactive Japanese conversation simulation.\n"
    "Rules:\n"
    "- Base EVERY claim only on the data provided: the objective, the turns, "
    "the per-turn scores and the resolution. Never invent achievements or "
    "failures.\n" + OUTPUT_INSTRUCTION + "\n"
    "- summary_vi: one Vietnamese paragraph (at most 500 characters): how "
    "the conversation went, whether the objective was achieved, and the "
    "most valuable writing points observed.\n"
    "- strengths: 2-3 Vietnamese sentences about what the learner did well "
    "in this conversation.\n"
    "- needs_work: 2-3 Vietnamese sentences about what to improve next "
    "time (writing, not conversation theory).\n"
    "Respond with the JSON object only."
)


def build_simulation_summary_prompt(
    scenario_context: str,
    objective_vi: str,
    resolution: str,
    average_scores: dict[str, int],
    turns_block: str,
) -> tuple[str, str]:
    """Return (system, user) prompt for the final summary stage."""
    scores_block = ", ".join(f"{key}={value}" for key, value in sorted(average_scores.items()))
    lines = [
        "Scenario:",
        scenario_context,
        "",
        f"Objective: {objective_vi}",
        f"Resolution: {resolution}",
        f"Average scores: {scores_block}",
        "",
        "Turns with per-turn scores:",
        turns_block,
        "",
        "Output the JSON object with fields: summary_vi, strengths, needs_work.",
    ]
    return SIMULATION_SUMMARY_SYSTEM, "\n".join(lines).strip()


def simulation_summary_prompt_version() -> str:
    from app.prompts.common import SIMULATION_SUMMARY_PROMPT_VERSION

    return SIMULATION_SUMMARY_PROMPT_VERSION
