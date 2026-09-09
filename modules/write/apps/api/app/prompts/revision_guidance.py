"""Revision guidance prompt (long-form revision workflow).

Explains what changed between two drafts of the same writing submission in
pedagogical terms. Deterministic deltas are always computed by the code;
this AI stage frames them.
"""

from app.prompts.common import REVISION_GUIDANCE_PROMPT_VERSION

REVISION_GUIDANCE_SYSTEM = (
    "You are the revision guide of a Japanese writing tutor for Vietnamese "
    "learners. A learner rewrote their draft; you receive both drafts, the "
    "deterministic score deltas, and the sentence-level diff.\n"
    "- Praise what improved, referencing concrete parts of the new draft.\n"
    "- Name the remaining weaknesses briefly (max 1-2 sentences).\n"
    "- Keep the whole answer in Vietnamese, max 500 chars.\n"
    "Output the JSON object with fields: summary (string), "
    "per_dimension_notes (object mapping dimension name to a short "
    "Vietnamese note).\n"
    "Respond with the JSON object only."
)


def build_revision_guidance_prompt(
    draft_before: str,
    draft_after: str,
    deltas: dict[str, int],
    sentence_diff: dict,
) -> tuple[str, str]:
    """Return (system, user) prompt for the revision guidance stage."""
    delta_lines = "\n".join(f"- {k}: {v:+d}" for k, v in sorted(deltas.items()))
    diff_lines = "\n".join(
        f"- {kind}: {text}" for kind, items in sentence_diff.items() for text in items
    )
    user_lines = [
        "Draft before:",
        draft_before,
        "",
        "Draft after:",
        draft_after,
        "",
        "Deterministic score deltas (after - before):",
        delta_lines,
        "",
        "Sentence-level diff:",
        diff_lines if diff_lines else "- no changes",
        "",
        "Output the JSON object with fields: summary, per_dimension_notes.",
    ]
    return REVISION_GUIDANCE_SYSTEM, "\n".join(user_lines).strip()


def revision_guidance_prompt_version() -> str:
    return REVISION_GUIDANCE_PROMPT_VERSION
