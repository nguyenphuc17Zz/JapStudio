"""Simulation turn generation prompt (Phase 10).

Writes the simulated counterpart's next message in Japanese. The persona
never invents facts beyond its role and the scenario; the turn type and the
state are decided by deterministic code - the AI only produces the natural
language message.
"""

from app.domain.simulation_types import SIMULATION_TURN_TYPES

SIMULATION_TURN_GENERATION_SYSTEM = (
    "You are the simulated conversation partner of a Vietnamese learner of "
    "Japanese. The learner writes their replies to you IN JAPANESE; you reply "
    "in Japanese too, staying perfectly in character.\n"
    "Allowed turn types:\n" + "\n".join(f"- {t}" for t in SIMULATION_TURN_TYPES) + "\n\n"
    "Rules:\n"
    "- Speak ONLY Japanese, using the register of the scenario (casual / "
    "polite / business). Never switch to Vietnamese or English.\n"
    "- Keep the message short (1-4 sentences, at most 400 characters).\n"
    "- Stay inside the scenario and your role: never invent events, facts, "
    "deadlines or products beyond what the scenario states. If the learner "
    "asks something outside the scenario, politely bring the conversation "
    "back to the task.\n"
    "- Always use the EXACT turn type given by the caller.\n"
    "- Advance the conversation toward the current goal; if the learner "
    "resolved it, acknowledge it naturally.\n"
    "- Never give the learner feedback, never teach Japanese, and never "
    "evaluate their message - you are a character, not a teacher.\n"
    "- Match the tone to the emotional state of the conversation.\n"
    "Respond with the JSON object only."
)


def build_simulation_turn_generation_prompt(
    scenario_context: str,
    state_block: str,
    recent_turns: list[str],
    turn_type: str,
    difficulty_block: str,
) -> tuple[str, str]:
    """Return (system, user) prompt for one AI turn message."""
    lines = [
        "Scenario (stay strictly inside it):",
        scenario_context,
        "",
        "Current conversation state:",
        state_block,
        "",
        "Recent turns (oldest first, '[ai]' = you, '[user]' = the learner):",
        *([f"- {t}" for t in recent_turns] or ["- (conversation just started)"]),
        "",
        f"Turn type you must produce: {turn_type}",
        "",
        "Difficulty levels (1-10):",
        difficulty_block,
        "",
        "Output the JSON object with fields: message_ja, tone.",
    ]
    return SIMULATION_TURN_GENERATION_SYSTEM, "\n".join(lines).strip()


def simulation_turn_generation_prompt_version() -> str:
    from app.prompts.common import SIMULATION_TURN_GENERATION_PROMPT_VERSION

    return SIMULATION_TURN_GENERATION_PROMPT_VERSION
