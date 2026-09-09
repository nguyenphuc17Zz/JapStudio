"""Curriculum & learning journey prompts (Phase 13).

Five AI stages, each schema-validated with deterministic code as the
authoritative layer:

1. goal_interpretation - map the learner's goal statement to the goal taxonomy
2. curriculum_planning - propose the long-term plan (milestones/objectives)
3. curriculum_replanning - propose objective-level changes grounded in evidence
4. curriculum_explanation - learner-facing journey explanation
5. objective_progress_analysis - narrative for one objective's progress

Entry criteria are ALWAYS computed in code; the AI never proposes them.
"""

import json

from app.domain.curriculum_taxonomy import (
    COMPETENCIES,
    COMPETENCY_LABELS_VI,
    COMPETENCY_TO_MODES,
    COMPETENCY_TO_SKILLS,
    EXERCISE_MODES,
    GOAL_LABELS_VI,
    GOAL_TYPES,
)
from app.prompts.common import (
    CURRICULUM_EXPLANATION_PROMPT_VERSION,
    CURRICULUM_PLANNING_PROMPT_VERSION,
    CURRICULUM_REPLANNING_PROMPT_VERSION,
    CURRICULUM_VERSION,
    GOAL_INTERPRETATION_PROMPT_VERSION,
    OBJECTIVE_PROGRESS_ANALYSIS_PROMPT_VERSION,
)

_SYSTEM = (
    "You are the curriculum module of a Japanese writing tutor for Vietnamese "
    "learners. You design long-term learning journeys (goals -> milestones -> "
    "objectives) grounded in the deterministic competency taxonomy."
)

_COMPETENCY_BLOCK = (
    "Available competencies (id: label_vi -> evidence skills, preferred exercise modes):\n"
    + "\n".join(
        f"- {c}: {COMPETENCY_LABELS_VI[c]} -> skills={COMPETENCY_TO_SKILLS[c]}, "
        f"modes={COMPETENCY_TO_MODES[c]}"
        for c in COMPETENCIES
    )
    + "\n"
)

_MODES_BLOCK = (
    "Available exercise modes: " + ", ".join(EXERCISE_MODES) + "\n"
    "- 'simulation' is an interactive role-play session (Phase 10)."
)

_GOALS_BLOCK = "Supported goal types (id: label_vi):\n" + "\n".join(
    f"- {g}: {GOAL_LABELS_VI[g]}" for g in GOAL_TYPES
)


def build_goal_interpretation_prompt(goal_statement: str, profile_summary: dict) -> str:
    """Stage 5a: interpret the free-form goal into the deterministic taxonomy."""
    return (
        _SYSTEM
        + "\n\n"
        + _GOALS_BLOCK
        + "\n\n"
        + "Rules:\n"
        + f"- goal_type must be one of: {', '.join(GOAL_TYPES)}.\n"
        + "- focus_competencies: 3-8 competencies, ONLY from the available list, that "
        "best serve this goal; order by importance.\n"
        + "- rationale_vi: 1-2 concise Vietnamese sentences explaining the mapping.\n"
        + "- suggested_goal: a short (<=50 chars) Vietnamese label for the journey.\n"
        + "- When the statement is ambiguous, pick the closest supported goal type "
        "and note the assumption in rationale_vi.\n\n"
        + "Return exactly one JSON object:\n"
        + '{"goal_type": str, "suggested_goal": str, "focus_competencies": [str], '
        + '"rationale_vi": str}\n\n'
        + "Learner's goal statement: "
        + goal_statement
        + "\n\nLearner profile summary (JSON):\n"
        + json.dumps(profile_summary, ensure_ascii=False)
    )


def build_curriculum_planning_prompt(
    goal_type: str,
    goal_statement: str,
    focus_competencies: list[str],
    profile_summary: dict,
    memory_block: str = "",
) -> str:
    """Stage 5b: propose the full long-term curriculum plan.

    Entry criteria are NOT requested - the engine computes them
    deterministically. The AI only proposes titles, descriptions,
    competencies, modes, target level and success criteria.
    """
    memory_section = (
        "Learner memories (context only):\n" + memory_block + "\n" if memory_block else ""
    )
    return (
        _SYSTEM
        + "\n\n"
        + _COMPETENCY_BLOCK
        + "\n"
        + _MODES_BLOCK
        + "\n\n"
        + "Rules:\n"
        + "- milestones: 2-8 thematic stages covering the focus competencies "
        "in a sensible learning order (foundations first, harder/compound "
        "abilities later).\n" + "- objectives: 2-6 per milestone; each objective trains 1-4 "
        "competencies via 1-4 exercise modes. Practice modes must exist in "
        "the available modes list.\n"
        + "- Each competency should be trained by at least one objective.\n"
        + "- target_level: one of (N5, N4, N3, N2, N1, free) reflecting the "
        "objective's difficulty band.\n"
        + "- success_criteria: dict with optional keys: threshold (int 50-95, "
        "default 80), modes_required (int >=2 to require multiple exercise "
        "modes), min_attempts (int >=3). Code defaults these; keep them "
        "minimal.\n" + "- Write titles/descriptions/overview_vi in Vietnamese, concrete and "
        "learner-facing.\n\n"
        + "Return exactly one JSON object:\n"
        + '{"title": str, "overview_vi": str, '
        + '"milestones": [{"title": str, "description": str}], '
        + '"objectives": [{"title": str, "description": str, '
        + '"target_competencies": [str], "exercise_modes": [str], '
        + '"target_level": str, "priority": int 1-5, "success_criteria": {}}]}\n\n'
        + "Goal type: "
        + goal_type
        + "\nGoal statement: "
        + goal_statement
        + "\nFocus competencies (ordered by importance): "
        + ", ".join(focus_competencies)
        + "\n\nLearner profile summary (JSON):\n"
        + json.dumps(profile_summary, ensure_ascii=False)
        + "\n"
        + memory_section
    )


def build_curriculum_replanning_prompt(
    journey_snapshot: dict,
    evidence: dict,
    requested_changes: list[dict],
) -> str:
    """Stage 5c: propose replanning changes grounded in deterministic evidence."""
    return (
        _SYSTEM
        + "\n\n"
        + "Rules:\n"
        + "- Replanning only applies objective-level changes (adjust target "
        "competencies, exercise modes, priority, or mark objectives as "
        "added/skipped). Never change journey goal or milestone ordering "
        "unless explicitly requested.\n"
        + "- Every change must cite the learner's evidence (scores, "
        "exercises completed, mastery states).\n"
        + '- objective_changes: each item: {"objective_id": str, "action": '
        '"update"|"add"|"skip", "field_updates": {}} with action '
        "semantics; max 12 items.\n"
        + "- rationale_vi: 2-3 Vietnamese sentences summarizing what changes "
        "and why.\n\n"
        + "Return exactly one JSON object:\n"
        + '{"objective_changes": [{"objective_id": str, "action": str, '
        + '"field_updates": {}}], "rationale_vi": str}\n\n'
        + "Journey snapshot (JSON):\n"
        + json.dumps(journey_snapshot, ensure_ascii=False)
        + "\n\nDeterministic evidence (JSON):\n"
        + json.dumps(evidence, ensure_ascii=False)
        + "\n\nRequested changes (JSON):\n"
        + json.dumps(requested_changes, ensure_ascii=False)
    )


def build_curriculum_explanation_prompt(journey_snapshot: dict) -> str:
    """Stage 5d: learner-facing explanation of the whole journey (informational)."""
    return (
        _SYSTEM
        + "\n\n"
        + "Write a warm, concrete Vietnamese explanation (2-3 sentences) of "
        + "the learner's learning journey: why the goal was chosen, what the "
        + "milestones build toward, and what comes next.\n\n"
        + 'Return exactly one JSON object: {"explanation": str}\n\n'
        + "Journey snapshot (JSON):\n"
        + json.dumps(journey_snapshot, ensure_ascii=False)
    )


def build_objective_progress_analysis_prompt(objective_snapshot: dict, evidence: dict) -> str:
    """Stage 5e: narrative for one objective's progress (strictly informational)."""
    return (
        _SYSTEM
        + "\n\n"
        + "Analyze the learner's progress on ONE objective. Mastery state and "
        + "completion are computed in code; you only add a learner-facing "
        + "narrative.\n"
        + "- summary_vi: 2-3 Vietnamese sentences on current progress and what "
        + "remains.\n"
        + "- recommended_focus_vi: 1-2 Vietnamese sentences on what to practice "
        + "next (concrete, actionable).\n\n"
        + "Return exactly one JSON object:\n"
        + '{"summary_vi": str, "recommended_focus_vi": str}\n\n'
        + "Objective snapshot (JSON):\n"
        + json.dumps(objective_snapshot, ensure_ascii=False)
        + "\n\nEvidence (JSON):\n"
        + json.dumps(evidence, ensure_ascii=False)
    )


def goal_interpretation_prompt_version() -> str:
    return GOAL_INTERPRETATION_PROMPT_VERSION


def curriculum_planning_prompt_version() -> str:
    return CURRICULUM_PLANNING_PROMPT_VERSION


def curriculum_replanning_prompt_version() -> str:
    return CURRICULUM_REPLANNING_PROMPT_VERSION


def curriculum_explanation_prompt_version() -> str:
    return CURRICULUM_EXPLANATION_PROMPT_VERSION


def objective_progress_analysis_prompt_version() -> str:
    return OBJECTIVE_PROGRESS_ANALYSIS_PROMPT_VERSION


def curriculum_version() -> str:
    return CURRICULUM_VERSION
