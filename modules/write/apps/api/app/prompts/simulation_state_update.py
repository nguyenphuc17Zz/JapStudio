"""Simulation state update prompt (Phase 10).

Proposes the next structured state after one user turn. The proposal is a
proposal only: the deterministic state machine validates it (whitelisted
keys, items that already exist, facts grounded in the turns) and performs
the merge. The AI never mutates state directly.
"""

from app.prompts.common import OUTPUT_INSTRUCTION

SIMULATION_STATE_UPDATE_SYSTEM = (
    "You are the conversation state manager of a Japanese writing tutor. "
    "After each learner reply, you propose how the conversation state should "
    "change.\n"
    "You may propose COMPLETE updated lists for these keys only:\n"
    "- unresolved_items: list of strings - open questions or unmet needs "
    "(Vietnamese).\n"
    "- completed_items: list of strings - items now satisfied (Vietnamese).\n"
    "- facts: list of strings - facts established in the conversation so far "
    "(Vietnamese). NEVER add a fact the turns did not establish.\n"
    "- decisions: list of strings - agreements reached (Vietnamese).\n"
    "- participant_positions: object - stance of each side on the main "
    "points.\n"
    "- emotional_context: string - the current emotional tone, from the "
    "turns only.\n"
    "- next_goal: string - what the learner should do next (Vietnamese).\n"
    "Rules:\n"
    "- Never propose a new stage, the objective, the persona or the "
    "difficulty - the code owns those.\n"
    "- Every unresolved item that the learner has clearly satisfied must be "
    "moved to completed_items.\n"
    "- When the learner's reply was off-topic, keep unresolved_items "
    "unchanged.\n"
    "- When there is nothing left to resolve, leave unresolved_items empty "
    "and say so via next_goal.\n" + OUTPUT_INSTRUCTION + "\n"
    "Respond with the JSON object only."
)


def build_simulation_state_update_prompt(
    state_block: str,
    user_reply: str,
    ai_reply: str,
    evaluation_block: str,
) -> tuple[str, str]:
    """Return (system, user) prompt for the state update stage."""
    lines = [
        "Current state:",
        state_block,
        "",
        "The learner's latest Japanese reply:",
        user_reply,
        "",
        "Your (AI persona) latest message it responds to:",
        ai_reply,
        "",
        "Evaluation of the reply (deterministic numbers):",
        evaluation_block,
        "",
        "Output the JSON object with fields: unresolved_items, "
        "completed_items, facts, decisions, participant_positions, "
        "emotional_context, next_goal.",
    ]
    return SIMULATION_STATE_UPDATE_SYSTEM, "\n".join(lines).strip()


def simulation_state_update_prompt_version() -> str:
    from app.prompts.common import SIMULATION_STATE_UPDATE_PROMPT_VERSION

    return SIMULATION_STATE_UPDATE_PROMPT_VERSION
