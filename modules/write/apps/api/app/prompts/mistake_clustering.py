"""Mistake clustering prompt (Phase 6, stage 2).

Version: mistake_clustering:v1

Groups raw issue evidence from evaluation payloads into recurring mistake
patterns. Code then upserts them by canonical_label so the same real-world
mistake accumulates evidence across attempts.
"""

from app.prompts.common import MISTAKE_CLUSTERING_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the mistake-analysis module of a Japanese writing tutor for "
    "Vietnamese learners. You cluster individual issues found in one learner "
    "answer into recurring, pedagogically meaningful mistake patterns."
)

RULES = (
    "Rules:\n"
    "- Group issues that share the same underlying cause into ONE cluster "
    "(e.g. several wrong は/が usages -> one particle cluster).\n"
    "- canonical_label must be a short, stable, deduplication-friendly key "
    "written in Japanese or English (e.g. 'particle_ha_ga', 'te_form_link', "
    "'keigo_polite_form'). The SAME real mistake must always produce the SAME "
    "label across attempts, so it can accumulate evidence.\n"
    "- description_vi: one or two sentences in Vietnamese explaining the "
    "pattern concretely.\n"
    "- example_snippets: the learner's own short fragments (original Japanese "
    "text), at most 5.\n"
    "- severity: how much this pattern hurts communication (critical / major "
    "/ minor / info).\n"
    "- Do not create clusters for trivial single occurrences; a cluster must "
    "represent a learnable pattern.\n"
    "- Output an empty clusters list when the issues are all one-off and do "
    "not form patterns."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"clusters": [{"canonical_label": str, "description_vi": str, '
    '"example_snippets": [str], '
    '"severity": "critical"|"major"|"minor"|"info"}]}'
)


def build_mistake_clustering_prompt(issues: list[dict]) -> str:
    """Build the clustering prompt from one attempt's raw issue evidence."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Issue evidence from this attempt (JSON):\n"
        + str(issues)
    )


def mistake_clustering_prompt_version() -> str:
    return MISTAKE_CLUSTERING_PROMPT_VERSION
