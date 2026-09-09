"""Self-correction attempt evaluation prompt (Step 3, 4, 5).

Evaluates learner's self-correction attempt against the target concept with
semantic delta checks, and determines whether to proceed to transfer, advance
to a targeted clue (Step 4), advance to a structural pattern (Step 5), or reveal (Step 6).
"""

from app.prompts.common import (
    ANTI_HALLUCINATION_RULES,
    SELF_CORRECTION_EVALUATION_PROMPT_VERSION,
)

EVALUATION_SYSTEM = (
    "You are a Socratic Japanese writing tutor evaluating a learner's attempt to "
    "self-correct a Japanese sentence.\n\n"
    "EVALUATION CRITERIA:\n"
    "1. SEMANTIC DELTA & IMPROVEMENT: Did the learner fix the primary issue? Did "
    "they introduce new mistakes? Classify improvement as: significantly_improved, "
    "improved, partially_improved, unchanged, or regressed.\n"
    "2. NEXT STEP DETERMINATION:\n"
    "   - If correct / natural: next_step_action = 'proceed_to_transfer'. Provide encouraging feedback.\n"
    "   - If incorrect on Attempt 1: next_step_action = 'advance_to_clue'. Provide a 'next_clue' (a targeted guiding question focusing learner's attention on the specific particle/form without giving away the full answer).\n"
    "   - If incorrect on Attempt 2: next_step_action = 'advance_to_pattern'. Provide a 'next_pattern' (an abstract structural template + an analogous example sentence, without solving their exact sentence).\n"
    "   - If incorrect on Attempt 3: next_step_action = 'advance_to_reveal'.\n"
    "3. Socratic Feedback in Vietnamese: Explain what improved and what still sounds unnatural.\n"
    f"{ANTI_HALLUCINATION_RULES}\n"
    "Respond with a JSON object containing:\n"
    "- is_correct (bool)\n"
    "- is_improved (bool)\n"
    "- score (int 0-100)\n"
    "- improvement_status (string: significantly_improved|improved|partially_improved|unchanged|regressed)\n"
    "- quality_delta (int)\n"
    "- feedback_vi (string)\n"
    "- remaining_issues (list of strings)\n"
    "- next_step_action (string: proceed_to_transfer|advance_to_clue|advance_to_pattern|advance_to_reveal)\n"
    "- next_clue (string or null)\n"
    "- next_pattern (string or null)\n"
)


def build_self_correction_evaluation_prompt(
    original_text: str,
    attempt_text: str,
    target_concept: str,
    current_step: int,
    attempt_count: int,
    context_vi: str | None = None,
    previous_attempts: list[str] | None = None,
) -> tuple[str, str]:
    """Return (system, user) prompt for self-correction attempt evaluation."""
    user_lines = [
        f"Original sentence: {original_text}",
        f"Target concept/rule: {target_concept}",
        f"Current ladder step: {current_step} (Attempt #{attempt_count})",
        f"Learner's current self-corrected attempt: {attempt_text}",
    ]
    if context_vi:
        user_lines.append(f"Context / Intended meaning: {context_vi}")
    if previous_attempts:
        user_lines.append("Previous attempts:")
        for idx, prev in enumerate(previous_attempts, 1):
            user_lines.append(f"  #{idx}: {prev}")
    user_lines.append("")
    user_lines.append("Evaluate this attempt, compute semantic delta, and determine the next scaffolding step.")
    return EVALUATION_SYSTEM, "\n".join(user_lines).strip()


def self_correction_evaluation_prompt_version() -> str:
    return SELF_CORRECTION_EVALUATION_PROMPT_VERSION
