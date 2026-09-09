"""Tone-evaluation prompt section (used inside the scenario evaluation
stage).

Scores whether the learner's answer matches the scenario's expected tone.
A register mismatch (e.g. casual phrasing to a client) must be reported as
an audience/register problem, never as a grammar error.
"""

TONE_EVALUATION_SYSTEM_SECTION = (
    "Tone evaluation:\n"
    "Score tone_fit (0-100): how well the answer's tone matches the "
    "scenario's expected tone. Possible tones: friendly, neutral, polite, "
    "professional, apologetic, persuasive, conciliatory, firm.\n"
    "Audience awareness: the same wording can be fine for a friend but "
    "inappropriate for a client or manager. Judge the answer against the "
    "AUDIENCE and the scenario's register (casual / polite / business).\n"
    "Important:\n"
    "- A register/audience mismatch is NOT a grammar error; never report it "
    "as one.\n"
    "- Tone never overrides semantic correctness: an answer that is "
    "grammatically right and covers all required points still gets full "
    "credit for content even if the tone is slightly off.\n"
)


def build_tone_section(expected_tone: str, audience: str, register: str) -> str:
    """Render the tone section of the scenario evaluation prompt."""
    return (
        f"{TONE_EVALUATION_SYSTEM_SECTION}\n"
        f"Expected tone: {expected_tone}\n"
        f"Audience: {audience}\n"
        f"Register: {register}\n"
    )


def tone_evaluation_prompt_version() -> str:
    from app.prompts.common import TONE_EVALUATION_PROMPT_VERSION

    return TONE_EVALUATION_PROMPT_VERSION
