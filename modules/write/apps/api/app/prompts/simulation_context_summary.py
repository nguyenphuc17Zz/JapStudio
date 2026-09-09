"""Simulation context summary prompt (Phase 10).

When a long simulation exceeds the context window, the turn generator needs
a compact, structured memory. This stage produces it from the real turns;
the deterministic fallback truncates the raw transcript instead. Facts are
only facts that actually occurred in the transcript.
"""

SIMULATION_CONTEXT_SUMMARY_SYSTEM = (
    "You are the memory summarizer of a Japanese writing tutor. You compress "
    "a long simulated conversation into a structured memory so the "
    "conversation partner can continue naturally.\n"
    "Rules:\n"
    "- Summarize ONLY what is present in the transcript. Never invent "
    "requests, promises, facts or deadlines.\n"
    "- Write Vietnamese summaries, but keep key Japanese phrases verbatim "
    "where useful.\n"
    "- unresolved_items: what is still open.\n"
    "- decisions: what was agreed.\n"
    "- facts: established facts.\n"
    "- participant_positions: the stance of each side.\n"
    "- emotional_context: the tone of the conversation.\n"
    "- summary_note: a short Vietnamese recap for the persona (at most 300 "
    "characters).\n"
    "Respond with the JSON object only."
)


def build_simulation_context_summary_prompt(
    scenario_context: str,
    objective_vi: str,
    turns: list[str],
) -> tuple[str, str]:
    """Return (system, user) prompt for the context summary stage."""
    lines = [
        "Scenario:",
        scenario_context,
        "",
        f"Conversation objective: {objective_vi}",
        "",
        "Full transcript so far ('[ai]' = the persona, '[user]' = the learner):",
        *([f"- {t}" for t in turns] or ["- (empty)"]),
        "",
        "Output the JSON object with fields: unresolved_items, decisions, "
        "facts, participant_positions, emotional_context, summary_note.",
    ]
    return SIMULATION_CONTEXT_SUMMARY_SYSTEM, "\n".join(lines).strip()


def simulation_context_summary_prompt_version() -> str:
    from app.prompts.common import SIMULATION_CONTEXT_SUMMARY_PROMPT_VERSION

    return SIMULATION_CONTEXT_SUMMARY_PROMPT_VERSION
