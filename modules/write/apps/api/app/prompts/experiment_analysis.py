"""Experiment analysis prompt (Phase 14).

Version: experiment_analysis:v1

Compares control vs variant metrics of one lightweight A/B experiment.
Advisory only — it reports what users *showed*, never what the variant
*caused*, and it never switches production behavior.
"""

from app.prompts.common import EXPERIMENT_ANALYSIS_PROMPT_VERSION

SYSTEM_INSTRUCTION = (
    "You are the experimentation analyst of a Japanese writing tutor. Given "
    "control vs variant metrics of one experiment you summarize which arm "
    "performed better on the target metric. You report observations only: "
    "'users in the variant showed X' — never 'the variant caused X'."
)

RULES = (
    "Rules:\n"
    "- winner: 'control', 'variant' or 'none' (none when the difference is "
    "too small or the samples are too few).\n"
    "- comparison: one entry per metric with control/variant values and "
    "delta (variant - control).\n"
    "- evidence: only metric ids listed in the provided metrics block.\n"
    "- recommended_action MUST start with one of these safe verbs: increase, "
    "reduce, keep, split, merge, retire, pause, reword, cache, test, monitor, "
    "adjust, remove, add, defer, simplify, summarize.\n"
    "- confidence: high only with enough samples.\n"
    "- summary_vi: concise Vietnamese summary.\n"
    "- inference_type: 'observation' or 'comparison' — never causal."
)

OUTPUT_CONTRACT = (
    "Return exactly one JSON object:\n"
    '{"winner": "control"|"variant"|"none", '
    '"comparison": [{"metric": str, "control_value": float|null, '
    '"variant_value": float|null, "delta": float|null}], '
    '"summary_vi": str, "recommended_action": str, "evidence": [str], '
    '"confidence": "low"|"medium"|"high", '
    '"inference_type": "observation"|"comparison"}'
)


def build_experiment_analysis_prompt(experiment_block: str, metrics_block: str) -> str:
    """Build the experiment comparison prompt (aggregated data only)."""
    return (
        SYSTEM_INSTRUCTION
        + "\n\n"
        + RULES
        + "\n\n"
        + OUTPUT_CONTRACT
        + "\n\n"
        + "Experiment:\n"
        + experiment_block
        + "\n\n"
        + "Available product metrics:\n"
        + metrics_block
    )


def experiment_analysis_prompt_version() -> str:
    return EXPERIMENT_ANALYSIS_PROMPT_VERSION
