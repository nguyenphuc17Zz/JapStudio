"""Deterministic validators for the Phase 14 analytics AI stages.

Every AI product insight must:
- reference real metric ids (``context["metric_ids"]``), never fabricated ones;
- use the allowed enum values (priority / confidence / inference_type);
- stay observation- or comparison-level — causal claims are rejected;
- recommend an action that starts with a known, safe verb
  (the AI never directly modifies the learning system).

These rules are enforced by the Phase 11 quality layer exactly like every
other engine task.
"""

from typing import Any

from app.schemas.analytics_ai import (
    _allowed_action,
    _contains_causal_language,
    _unknown_evidence,
)


def _violations(result: Any, checks: list[tuple[bool, str]]) -> list[str]:
    return [message for failed, message in checks if failed]


def _non_empty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _metric_ids(context: dict[str, Any]) -> set[str]:
    return {str(metric_id) for metric_id in (context.get("metric_ids") or [])}


def _insight_checks(insight: Any, available: set[str]) -> list[tuple[bool, str]]:
    evidence = [str(item) for item in (insight.get("evidence") or [])]
    unknown = _unknown_evidence(evidence, available)
    finding = insight.get("finding") or ""
    action = insight.get("recommended_action") or ""
    return [
        (not _non_empty(insight.get("area")), "insight area is empty"),
        (insight.get("priority") not in ("low", "medium", "high"), "invalid priority"),
        (not _non_empty(finding), "finding is empty"),
        (not _non_empty(action), "recommended_action is empty"),
        (bool(unknown), f"evidence references unknown metric ids: {sorted(unknown)}"),
        (
            insight.get("confidence") not in ("low", "medium", "high"),
            "invalid confidence",
        ),
        (
            insight.get("inference_type") not in ("observation", "comparison"),
            "invalid inference_type (causal claims are not allowed)",
        ),
        (
            _contains_causal_language(f"{finding}\n{action}"),
            "finding or recommended_action contains a causal claim",
        ),
        (not _allowed_action(action), "recommended_action does not start with a known safe verb"),
    ]


def product_analysis(result: Any, **context: Any) -> list[str]:
    """Validator for ``product_analysis:v1`` (a list of insights)."""
    available = _metric_ids(context)
    insights = result.insights if hasattr(result, "insights") else result.get("insights", [])
    violations: list[str] = []
    for index, insight in enumerate(insights):
        payload = insight.model_dump() if hasattr(insight, "model_dump") else insight
        violations.extend(
            f"insight[{index}]: {message}"
            for failed, message in _insight_checks(payload, available)
            if failed
        )
    return violations


def optimization_recommendation(result: Any, **context: Any) -> list[str]:
    """Validator for ``optimization_recommendation:v1`` (a single suggestion)."""
    available = _metric_ids(context)
    payload = result.model_dump() if hasattr(result, "model_dump") else dict(result or {})
    return [
        f"recommendation: {message}"
        for failed, message in _insight_checks(payload, available)
        if failed
    ]


def experiment_analysis(result: Any, **context: Any) -> list[str]:
    """Validator for ``experiment_analysis:v1`` (control vs variant)."""
    available = _metric_ids(context)
    payload = result.model_dump() if hasattr(result, "model_dump") else dict(result or {})
    evidence = [str(item) for item in (payload.get("evidence") or [])]
    unknown = _unknown_evidence(evidence, available)
    summary = payload.get("summary_vi") or ""
    action = payload.get("recommended_action") or ""
    checks = [
        (payload.get("winner") not in ("control", "variant", "none"), "invalid winner"),
        (not _non_empty(summary), "summary_vi is empty"),
        (not _non_empty(action), "recommended_action is empty"),
        (bool(unknown), f"evidence references unknown metric ids: {sorted(unknown)}"),
        (
            payload.get("confidence") not in ("low", "medium", "high"),
            "invalid confidence",
        ),
        (
            payload.get("inference_type") not in ("observation", "comparison"),
            "invalid inference_type (causal claims are not allowed)",
        ),
        (
            _contains_causal_language(f"{summary}\n{action}"),
            "summary or recommended_action contains a causal claim",
        ),
        (not _allowed_action(action), "recommended_action does not start with a known safe verb"),
    ]
    return [f"experiment_analysis: {message}" for failed, message in checks if failed]
