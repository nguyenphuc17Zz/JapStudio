"""Quality policy engine (Phase 11).

The policy maps a deterministic validation outcome plus confidence signals to
an action: accept / regenerate / fallback / secondary_verify / escalate /
degrade.

Decisions are driven by configured thresholds — never by hard-coded magic
numbers scattered through engines. Escalation is bounded: a retry budget
prevents infinite loops.
"""

from dataclasses import dataclass, field

from app.core.config import Settings, get_settings
from app.quality.enums import (
    ConfidenceLevel,
    CostProfile,
    Criticality,
    QualityDecision,
    QualityState,
    confidence_at_least,
    criticality_at_least,
)

DEFAULT_MAX_PROVIDER_DISAGREEMENT = 25


@dataclass(frozen=True)
class AIQualityPolicy:
    """Per-task quality policy."""

    task: str
    criticality: Criticality
    cost_profile: CostProfile = CostProfile.BALANCED
    min_confidence: ConfidenceLevel = ConfidenceLevel.MEDIUM
    verification_enabled: bool = False
    escalation_enabled: bool = True
    max_retries: int = 2
    feature_importance: float = 1.0


@dataclass
class PolicyInput:
    """Everything the policy engine needs to decide."""

    state: QualityState
    confidence: ConfidenceLevel
    contradictions: list[str] = field(default_factory=list)
    retry_count: int = 0
    provider: str | None = None
    model: str | None = None
    provider_disagreement: float | None = None
    max_provider_disagreement: float = DEFAULT_MAX_PROVIDER_DISAGREEMENT


class QualityPolicyEngine:
    """Deterministic policy engine shared by all AI engines."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def decide(self, policy: AIQualityPolicy, inp: PolicyInput) -> QualityDecision:
        """Map a validation outcome to an action, honoring thresholds.

        Order of precedence:
        1. Rejected result -> regenerate (within budget) else degrade.
        2. Contradictory signals -> secondary verify (critical, when enabled),
           else escalate, else degrade.
        3. Low confidence -> secondary verify / escalate / degrade.
        4. Provider disagreement -> secondary verify / escalate / degrade.
        5. Otherwise accept.
        """
        if inp.state == QualityState.REJECTED:
            if inp.retry_count < self._settings.ai_quality_max_retries:
                return QualityDecision.REGENERATE
            return QualityDecision.DEGRADE

        critical = criticality_at_least(policy.criticality, Criticality.HIGH)
        verification_ok = (
            policy.verification_enabled and self._settings.ai_quality_verification_enabled
        )

        needs_resolution = inp.state in (
            QualityState.NEEDS_VERIFICATION,
            QualityState.LOW_CONFIDENCE,
        ) or bool(inp.contradictions)
        if needs_resolution:
            if critical and verification_ok:
                return QualityDecision.SECONDARY_VERIFY
            if critical and policy.escalation_enabled:
                return QualityDecision.ESCALATE
            return QualityDecision.DEGRADE

        if not confidence_at_least(inp.confidence, policy.min_confidence):
            if critical and verification_ok:
                return QualityDecision.SECONDARY_VERIFY
            if critical and policy.escalation_enabled:
                return QualityDecision.ESCALATE
            return QualityDecision.DEGRADE

        disagreement = inp.provider_disagreement
        if disagreement is not None and disagreement > inp.max_provider_disagreement:
            if verification_ok:
                return QualityDecision.SECONDARY_VERIFY
            if critical and policy.escalation_enabled:
                return QualityDecision.ESCALATE
            return QualityDecision.DEGRADE

        return QualityDecision.ACCEPT


def default_policy_for(task: str, criticality: Criticality) -> AIQualityPolicy:
    """Build a policy with configured defaults for the given task."""
    return AIQualityPolicy(task=task, criticality=criticality)
