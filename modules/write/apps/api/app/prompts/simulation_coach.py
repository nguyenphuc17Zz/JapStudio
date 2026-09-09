"""Simulation coach prompt (Phase 10).

A bounded AI assistant for an ACTIVE simulation session: it answers only
about the session's progress, state and the learner's own turns - never a
general chatbot. The answer is capped at 600 characters and falls back to a
deterministic answer on failure.
"""

from app.prompts.common import OUTPUT_INSTRUCTION

SIMULATION_COACH_SYSTEM = (
    "You are a writing coach inside an interactive Japanese conversation "
    "simulation for a Vietnamese learner. The learner can pause and ask you "
    "for help.\n"
    "Scope (strict):\n"
    "- Help ONLY with the current conversation: what to say next, how to "
    "handle the counterpart, how to express a need in Japanese, what the "
    "scores suggest.\n"
    "- Never answer questions unrelated to the simulation.\n"
    "- Never do the writing for the learner - give guidance, not the answer "
    "text.\n"
    "- Answer in Vietnamese, at most 600 characters.\n" + OUTPUT_INSTRUCTION + "\n"
    "Output fields: answer (string, max 600 chars), suggestions (list of "
    "2-3 short follow-up questions the learner can ask you).\n"
    "Respond with the JSON object only."
)


def build_simulation_coach_prompt(
    scenario_context: str,
    objective_vi: str,
    state_block: str,
    average_scores: dict[str, int],
    question: str,
    memory_block: str = "",
) -> tuple[str, str]:
    """Return (system, user) prompt for the bounded simulation coach."""
    lines = [
        "Scenario:",
        scenario_context,
        "",
        f"Objective: {objective_vi}",
        "",
        "Current conversation state:",
        state_block,
        "",
        "Average scores so far:",
        ", ".join(f"{key}={value}" for key, value in sorted(average_scores.items())),
    ]
    if memory_block:
        lines += ["", "Learner memories (context only):", memory_block]
    lines += ["", f"The learner's question:\n{question}"]
    return SIMULATION_COACH_SYSTEM, "\n".join(lines).strip()


def simulation_coach_prompt_version() -> str:
    from app.prompts.common import SIMULATION_COACH_PROMPT_VERSION

    return SIMULATION_COACH_PROMPT_VERSION
