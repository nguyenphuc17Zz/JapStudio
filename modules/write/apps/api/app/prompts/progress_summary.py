"""Progress summary prompt (Phase 7, stage 3).

Version: progress_summary:v1

Short daily summary. All numbers are computed deterministically and passed
in; the AI only writes the prose. No hidden reasoning is exposed.
"""

from app.prompts.common import PROGRESS_SUMMARY_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the progress narrator of a Japanese writing tutor. You write a "
    "short, encouraging daily summary for a Vietnamese learner based ONLY on "
    "the structured evidence provided."
)

RULES = (
    "Rules:\n"
    "- Reference only the numbers and facts given. Never invent progress, "
    "scores or trends.\n"
    "- summary: 2-3 Vietnamese sentences: what happened today, what improved, "
    "what still needs work.\n"
    "- improved / needs_work: short Vietnamese skill names or phrases "
    "(max 3 each).\n"
    "- vocabulary_discovered: the exact integer provided; never invent.\n"
    "- Tone: factual, warm, adult - never childish."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"summary": str, "improved": [str], "needs_work": [str], '
    '"vocabulary_discovered": int}'
)


def build_progress_summary_prompt(today_stats: dict) -> str:
    """Build the summary prompt from real daily evidence."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Today's structured evidence (JSON):\n"
        + str(today_stats)
    )


def progress_summary_prompt_version() -> str:
    return PROGRESS_SUMMARY_PROMPT_VERSION
