"""Optimization recommendation prompt (Phase 14).

Version: optimization_recommendation:v1

Drafts ONE optimization suggestion for a specific product area, citing real
metric ids. Advisory only — the recommendation is persisted as pending and
requires human approval.
"""

from app.prompts.common import OPTIMIZATION_RECOMMENDATION_PROMPT_VERSION
from app.prompts.product_analysis import RULES as _SHARED_RULES

SYSTEM_INSTRUCTION = (
    "You are the optimization advisor of a Japanese writing tutor. Given one "
    "product area, a human-provided finding and the available metrics, you "
    "draft a single evidence-backed optimization recommendation. You never "
    "invent numbers, never claim causality, and never execute changes."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"area": str, "priority": "low"|"medium"|"high", "finding": str, '
    '"recommended_action": str, "evidence": [str], '
    '"confidence": "low"|"medium"|"high", '
    '"inference_type": "observation"|"comparison"}'
)


def build_optimization_recommendation_prompt(*, area: str, finding: str, metrics_block: str) -> str:
    """Build the single-recommendation prompt from a metrics snapshot."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + _SHARED_RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + f"Product area: {area}\n"
        + f"Finding (human-provided): {finding}\n\n"
        + "Available product metrics:\n"
        + metrics_block
    )


def optimization_recommendation_prompt_version() -> str:
    return OPTIMIZATION_RECOMMENDATION_PROMPT_VERSION
