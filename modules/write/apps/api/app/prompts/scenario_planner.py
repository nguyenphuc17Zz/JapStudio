"""Scenario planner prompt (stage 1 of the scenario pipeline).

Selects the scenario dimensions (genre, medium, audience, relationship,
purpose, register, tone, target_length, difficulty) from learner preferences
and recent scenario history. The planner never writes content - it only
decides what kind of scenario to build, avoiding repetitive combinations.
"""

from app.domain.scenario_formats import (
    AUDIENCES,
    BRSE_SEED_CONCEPTS,
    GENRES,
    MEDIA,
    PURPOSES,
    RELATIONSHIPS,
    TONES,
)

SCENARIO_PLANNER_SYSTEM = (
    "You are the scenario planner of a Japanese writing tutor for Vietnamese "
    "learners. You decide WHAT kind of real-world writing scenario to create "
    "next: who communicates, with whom, why, through which medium, and at "
    "which level of formality.\n"
    "Available genres:\n" + "\n".join(f"- {g}" for g in GENRES) + "\n\n"
    "Available media:\n" + "\n".join(f"- {m}" for m in MEDIA) + "\n\n"
    "Available audiences:\n" + "\n".join(f"- {a}" for a in AUDIENCES) + "\n\n"
    "Available relationships:\n" + "\n".join(f"- {r}" for r in RELATIONSHIPS) + "\n\n"
    "Available purposes:\n" + "\n".join(f"- {p}" for p in PURPOSES) + "\n\n"
    "Available tones:\n" + "\n".join(f"- {t}" for t in TONES) + "\n\n"
    "Compose the dimensions intelligently: audience, medium, purpose, "
    "register, tone and genre must agree with each other. A business email "
    "to a client is professional and polite; a chat message to a friend is "
    "casual and friendly.\n"
    "Technical / IT-BRSE seed concepts you may realize as scenarios (adapt, "
    "do not copy verbatim):\n" + "\n".join(f"- {c}" for c in BRSE_SEED_CONCEPTS) + "\n\n"
    "Rules:\n"
    "- target_length must be one of: multi_sentence, paragraph, long_writing.\n"
    "- register must be one of: casual, polite, business, mixed.\n"
    "- difficulty must match the learner's level and preferences (1-10).\n"
    "- Avoid repeating a genre+medium+audience+purpose+register combination "
    "that appears in the recent history unless the learner profile demands "
    "more practice of exactly that scenario type.\n"
    "- Prefer varied genres and media over time.\n"
    "Respond with the JSON object only."
)


def build_scenario_planner_prompt(
    preferences: dict,
    profile_block: str,
    recent_combinations: list[str],
    memory_block: str = "",
) -> tuple[str, str]:
    """Return (system, user) prompt for the scenario planner stage."""
    lines = ["Learner profile:", profile_block]
    if preferences:
        pref_lines = []
        for key, value in preferences.items():
            if value:
                pref_lines.append(f"- {key}: {value}")
        lines += ["", "Requested preferences (honor what is given):", *pref_lines]
    if recent_combinations:
        lines += [
            "",
            "Recent scenario combinations (STRICTLY AVOID REPEATING THESE EXACT COMBINATIONS):",
            *[f"- {c}" for c in recent_combinations],
            "You MUST choose a DIFFERENT genre, audience, or purpose from the available choices (e.g., chat_message, inquiry, apology_letter, complaint, announcement, review, invitation, opinion, meeting_minutes).",
        ]
    if memory_block:
        lines += ["", "Learner memories (context only):", memory_block]
    lines += [
        "",
        "Output the JSON object with fields: genre, medium, audience, "
        "relationship, purpose, register, tone, jlpt_level, target_length, "
        "difficulty, topic.",
    ]
    return SCENARIO_PLANNER_SYSTEM, "\n".join(lines).strip()


def scenario_planner_prompt_version() -> str:
    from app.prompts.common import SCENARIO_PLANNER_PROMPT_VERSION

    return SCENARIO_PLANNER_PROMPT_VERSION
