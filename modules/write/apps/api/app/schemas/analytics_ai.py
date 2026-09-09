"""AI output contracts for product analytics (Phase 14).

The AI never executes optimizations. These schemas carry the raw output of
``product_analysis:v1`` / ``optimization_recommendation:v1`` /
``experiment_analysis:v1``; deterministic validators then check that every
claim references real metrics, uses the allowed enums and never asserts
causality.
"""

from typing import Literal

from pydantic import BaseModel, Field

PRIORITY_VALUES = ("low", "medium", "high")
CONFIDENCE_VALUES = ("low", "medium", "high")
INFERENCE_TYPES = ("observation", "comparison")
WINNER_VALUES = ("control", "variant", "none")

PRIORITY_TYPE = Literal["low", "medium", "high"]
CONFIDENCE_TYPE = Literal["low", "medium", "high"]
INFERENCE_TYPE = Literal["observation", "comparison"]
WINNER_TYPE = Literal["control", "variant", "none"]

ALLOWED_ACTION_VERBS = (
    "increase",
    "reduce",
    "keep",
    "split",
    "merge",
    "retire",
    "pause",
    "reword",
    "cache",
    "test",
    "monitor",
    "adjust",
    "remove",
    "add",
    "defer",
    "simplify",
    "summarize",
)


class ProductInsight(BaseModel):
    """One evidence-backed product insight / optimization suggestion."""

    area: str
    priority: PRIORITY_TYPE = "medium"
    finding: str
    recommended_action: str
    evidence: list[str] = Field(default_factory=list)
    confidence: CONFIDENCE_TYPE = "medium"
    inference_type: INFERENCE_TYPE = "observation"


class ProductAnalysisResult(BaseModel):
    """Output of ``product_analysis:v1`` (list of insights)."""

    insights: list[ProductInsight] = Field(default_factory=list)


class OptimizationRecommendationResult(BaseModel):
    """Output of ``optimization_recommendation:v1`` (single suggestion)."""

    area: str
    priority: PRIORITY_TYPE = "medium"
    finding: str
    recommended_action: str
    evidence: list[str] = Field(default_factory=list)
    confidence: CONFIDENCE_TYPE = "medium"
    inference_type: INFERENCE_TYPE = "observation"


class ExperimentMetricComparison(BaseModel):
    metric: str
    control_value: float | None = None
    variant_value: float | None = None
    delta: float | None = None


class ExperimentAnalysisResult(BaseModel):
    """Output of ``experiment_analysis:v1`` (control vs variant)."""

    winner: WINNER_TYPE = "none"
    comparison: list[ExperimentMetricComparison] = Field(default_factory=list)
    summary_vi: str
    recommended_action: str
    evidence: list[str] = Field(default_factory=list)
    confidence: CONFIDENCE_TYPE = "medium"
    inference_type: INFERENCE_TYPE = "observation"


# -- deterministic helpers shared by the analytics validators -----------------


def _contains_causal_language(text: str) -> bool:
    """Deterministic causal-claim detection (documented, conservative).

    Phase 14 never reports fake causality: insights must describe what users
    *showed* or what *was observed*, not what a feature *caused*. The markers
    below are checked case-insensitively; a match is a validator violation.
    """
    lowered = text.lower()
    markers = (
        "caused",
        "causes ",
        "led to",
        "is due to",
        "resulted in",
        "because of this feature",
        "thanks to this feature",
        "proves that",
    )
    return any(marker in lowered for marker in markers)


def _allowed_action(action: str) -> bool:
    """``recommended_action`` must start with a known, safe verb."""
    lowered = action.strip().lower()
    return any(lowered.startswith(f"{verb} ") or lowered == verb for verb in ALLOWED_ACTION_VERBS)


def _unknown_evidence(evidence: list[str], available_metric_ids: set[str]) -> list[str]:
    """Evidence ids that are not part of the provided metric snapshot."""
    return [metric_id for metric_id in evidence if metric_id not in available_metric_ids]
