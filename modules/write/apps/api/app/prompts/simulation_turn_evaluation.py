"""Simulation turn evaluation prompt (Phase 10).

Adds the two simulation-specific dimensions (goal_progress and
communication_effectiveness) plus short guided feedback on top of the
existing Phase 4 (sentence) and Phase 9 (scenario) evaluation. The sentence
and scenario scores are computed by deterministic code; this stage only adds
the conversation-level judgement. All numbers it returns are validated by
the state machine and blended deterministically.
"""

from app.prompts.common import CATEGORY_GUIDANCE, SEVERITY_GUIDANCE

SIMULATION_TURN_EVALUATION_SYSTEM = (
    "You are the conversation judge of a Japanese writing tutor for "
    "Vietnamese learners. A learner wrote a Japanese reply inside an "
    "interactive simulated conversation. Judge the reply as a CONVERSATION "
    "TURN, not as a standalone sentence exercise.\n"
    + CATEGORY_GUIDANCE
    + "\n"
    + SEVERITY_GUIDANCE
    + "\n"
    "Scoring:\n"
    "- goal_progress (0-100): how much this reply moves the conversation "
    "toward the current goal (acknowledges, asks, proposes, confirms, "
    "handles the counterpart's point). Zero if it ignores the goal.\n"
    "- communication_effectiveness (0-100): how well the reply achieves its "
    "communicative intent in this situation - appropriate information, "
    "proper handling of the counterpart's stance, convincing but not "
    "pushy.\n"
    "Rules:\n"
    "- The reply is ONE message, possibly with a few sentences; judge it as "
    "a whole.\n"
    "- Never penalize a short but appropriate reply.\n"
    "- feedback_vi: brief, concrete, actionable Vietnamese feedback (at most "
    "300 characters) aimed at the conversation goal, not a generic "
    "sentence critique.\n"
    "- strengths: 2-3 Vietnamese sentences on what worked well.\n"
    "- Report only the most meaningful issues (at most 3).\n"
    "Respond with the JSON object only."
)


def build_simulation_turn_evaluation_prompt(
    scenario_context: str,
    user_reply: str,
    sentence_block: str,
    scenario_block: str,
    state_block: str,
    turn_type: str,
) -> tuple[str, str]:
    """Return (system, user) prompt for the turn evaluation stage."""
    lines = [
        "Scenario (the conversation context):",
        scenario_context,
        "",
        "Conversation state (goal the learner must advance):",
        state_block,
        "",
        f"The turn the learner is responding to: {turn_type}",
        "",
        "The learner's Japanese reply:",
        user_reply,
    ]
    if sentence_block:
        lines += ["", "Deterministic sentence-level evaluation (Phase 4):", sentence_block]
    if scenario_block:
        lines += ["", "Deterministic scenario-fit evaluation (Phase 9):", scenario_block]
    lines += [
        "",
        "Output the JSON object with fields: goal_progress, "
        "communication_effectiveness, strengths (list of strings), issues "
        "(list of {category, severity, explanation, suggested_fix}), "
        "feedback_vi.",
    ]
    return SIMULATION_TURN_EVALUATION_SYSTEM, "\n".join(lines).strip()


def simulation_turn_evaluation_prompt_version() -> str:
    from app.prompts.common import SIMULATION_TURN_EVALUATION_PROMPT_VERSION

    return SIMULATION_TURN_EVALUATION_PROMPT_VERSION
