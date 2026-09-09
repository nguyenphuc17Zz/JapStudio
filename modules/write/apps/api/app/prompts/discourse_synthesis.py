"""Discourse synthesis prompt (final long-form stage).

Turns the discourse analysis + style results into the learner-facing
report: strengths, summary, an improved structure, and three meaning-
preserving rewrites. Runs after the other discourse stages so it can see
the full picture.
"""

from app.prompts.common import (
    MEANING_PRESERVATION_RULES,
)

DISCOURSE_SYNTHESIS_SYSTEM = (
    "You are the synthesis stage of a Japanese writing tutor for Vietnamese "
    "learners. You receive a learner's multi-sentence Japanese text, the "
    "per-sentence quality scores, the discourse analysis and the style "
    "analysis. Produce the final report.\n"
    f"{MEANING_PRESERVATION_RULES}\n"
    "Rewrites - produce exactly three levels:\n"
    "- minimal_fix: keep the learner's wording almost untouched; fix only "
    "clear grammar mistakes and broken connections between sentences.\n"
    "- natural_rewrite: restructure sentences and add natural transitions so "
    "the text reads like a native wrote it, WITHOUT changing the content.\n"
    "- native_rewrite: the most polished version a native speaker would "
    "produce, still preserving the meaning exactly.\n"
    "All three rewrites MUST express the same content as the original. Never "
    "add new information.\n"
    "Output the JSON object with fields:\n"
    "- strengths: list of 2-4 Vietnamese sentences naming what the learner "
    "did well (content, vocabulary, organization, style...).\n"
    "- summary: one Vietnamese paragraph (max 500 chars) explaining the "
    "overall writing quality and the most important things to improve.\n"
    "- improved_structure: either a short Vietnamese explanation of a better "
    "order (e.g. 'Đưa câu kết luận xuống cuối và mở đầu bằng ý chính') or "
    "null when the structure is already good.\n"
    "- rewrites: {minimal_fix, natural_rewrite, native_rewrite}.\n"
    "Respond with the JSON object only."
)

PROFESSIONAL_REWRITE_SECTION = (
    "PROFESSIONAL REWRITE (required for this scenario):\n"
    "In addition to the three standard levels, produce professional_rewrite: "
    "the version a polished business Japanese writer would send in this "
    "scenario - appropriate keigo, standard email/ticket conventions and "
    "professional phrasing, still preserving the learner's meaning exactly. "
    "Do not invent new content.\n"
)


def build_discourse_synthesis_prompt(
    exercise: object,
    sentences: list[str],
    sentence_quality: int,
    dimension_scores: dict[str, int],
    issues: list[dict],
    structure_reorder_advice: str | None,
    *,
    scenario_context: str | None = None,
    professional_rewrite: bool = False,
) -> tuple[str, str]:
    """Return (system, user) prompt for the synthesis stage."""
    numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(sentences))
    issue_lines = "\n".join(
        f"- [{i.get('category')} / {i.get('severity')} / sentence "
        f"{i.get('sentence_index')}] {i.get('explanation')} -> "
        f"{i.get('suggested_fix')}"
        for i in issues
    )
    system = DISCOURSE_SYNTHESIS_SYSTEM
    if professional_rewrite:
        system = (
            DISCOURSE_SYNTHESIS_SYSTEM
            + "\n"
            + PROFESSIONAL_REWRITE_SECTION
            + "Then add professional_rewrite inside the rewrites object."
        )
    user_lines = [
        "Exercise:",
        f"- register: {exercise.register.value}",
        f"- topic: {exercise.topic}",
        f"- prompt (Vietnamese): {exercise.prompt_vi}",
        "",
        "The learner's Japanese text (index: text):",
        numbered,
        "",
        "Deterministic scores:",
        f"- sentence_quality: {sentence_quality} (average of per-sentence Phase-4 overall scores)",
        "- discourse dimensions: "
        + ", ".join(f"{k}={v}" for k, v in sorted(dimension_scores.items())),
        "",
        "Discourse issues:",
        issue_lines if issue_lines else "- none",
    ]
    if scenario_context:
        user_lines += ["", scenario_context]
    if structure_reorder_advice:
        user_lines += ["", f"Suggested reorder: {structure_reorder_advice}"]
    user_lines += [
        "",
        "Output the JSON object with fields: strengths, summary, improved_structure, rewrites.",
    ]
    return system, "\n".join(user_lines).strip()


def discourse_synthesis_prompt_version() -> str:
    from app.prompts.common import DISCOURSE_SYNTHESIS_PROMPT_VERSION

    return DISCOURSE_SYNTHESIS_PROMPT_VERSION
