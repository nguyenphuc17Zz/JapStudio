"""AIQualityService — the shared quality-control entry point (Phase 11).

Every AI engine routes its results through this service (or reuses its
pieces) instead of duplicating quality code:

    deterministic validation  ->  quality policy  ->  optional verifier
    ->  disagreement handling  ->  escalation  ->  accept / reject

The service never raises for quality failures: it returns a QualityOutcome
and the engine decides how to react (regenerate, fallback, degrade).
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from app.core.config import Settings, get_settings
from app.quality import fingerprint as fingerprinting
from app.quality.cost import estimate_cost
from app.quality.enums import (
    ConfidenceLevel,
    Criticality,
    QualityDecision,
    QualityState,
    TrustTier,
    parse_confidence,
)
from app.quality.policy import PolicyInput, QualityPolicyEngine
from app.quality.registry import AIQualityRegistry, create_default_quality_registry
from app.quality.telemetry import AITelemetry, TelemetryEvent
from app.quality.telemetry import telemetry as _default_telemetry

QUALITY_VERSION = "quality:v1"

logger = logging.getLogger("app.quality")


@dataclass
class QualityOutcome:
    """The full result of running one AI result through the quality layer."""

    task: str
    passed: bool
    decision: QualityDecision
    state: QualityState
    confidence: ConfidenceLevel
    criticality: Criticality
    trust_tier: TrustTier
    violations: list[str] = field(default_factory=list)
    contradictions: list[str] = field(default_factory=list)
    verification_used: bool = False
    verification_provider: str | None = None
    verification_accepted: bool | None = None
    corrected_result: Any | None = None
    reason: str | None = None
    fingerprint: str | None = None
    quality_version: str = QUALITY_VERSION
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_metadata(self) -> dict[str, Any]:
        """Compact, persistable quality metadata (no user content)."""
        return {
            "quality_status": self.state.value,
            "confidence": self.confidence.value,
            "verification_used": self.verification_used,
            "verification_provider": self.verification_provider,
            "quality_version": self.quality_version,
            "fingerprint": self.fingerprint,
            "violations": self.violations[:10],
            "reason": self.reason,
        }


class AIQualityService:
    """Centralized quality pipeline shared by all AI engines."""

    def __init__(
        self,
        registry: AIQualityRegistry | None = None,
        telemetry_store: AITelemetry | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._registry = registry or create_default_quality_registry()
        self._telemetry = telemetry_store or _default_telemetry
        self._settings = settings or get_settings()

    @property
    def registry(self) -> AIQualityRegistry:
        return self._registry

    @property
    def settings(self) -> Settings:
        return self._settings

    @property
    def telemetry(self) -> AITelemetry:
        return self._telemetry

    def criticality(self, task: str) -> Criticality:
        try:
            return self._registry.criticality(task)
        except KeyError:
            return Criticality.MEDIUM

    # -- deterministic validation + policy ----------------------------------

    def validate(
        self,
        task: str,
        result: Any,
        *,
        confidence: ConfidenceLevel | str | None = None,
        context: dict[str, Any] | None = None,
        provider: str | None = None,
        model: str | None = None,
        retry_count: int = 0,
        duration_ms: int | None = None,
        usage: Any = None,
        fingerprint_payload: Any = None,
        provider_disagreement: float | None = None,
        prompt_version: str | None = None,
    ) -> QualityOutcome:
        """Run deterministic checks + the quality policy on one AI result.

        Cheap, always runs, never calls another model. The policy decides
        whether a verifier / escalation is needed.
        """
        start = time.monotonic()
        context = context or {}
        try:
            violations = self._registry.validate(task, result, **context)
        except KeyError:
            violations = []
        criticality = self.criticality(task)
        resolved_confidence = (
            parse_confidence(confidence)
            if confidence is not None
            else self._extract_confidence(result)
        )

        # Cross-stage/cross-field contradictions are a policy signal distinct
        # from plain schema violations.
        contradictions = self._contradictions(task, result, context)

        policy = self._registry.policy(task) if task in self._registry.tasks() else None
        if policy is None:
            from app.quality.policy import default_policy_for

            policy = default_policy_for(task, criticality)
        state = self._state_from(result, violations, contradictions, resolved_confidence)

        engine = QualityPolicyEngine(self._settings)
        decision = engine.decide(
            policy,
            PolicyInput(
                state=state,
                confidence=resolved_confidence,
                contradictions=contradictions,
                retry_count=retry_count,
                provider=provider,
                model=model,
                provider_disagreement=provider_disagreement,
            ),
        )
        passed = decision in (QualityDecision.ACCEPT,)
        trust_tier = self._trust_tier(passed, state, decision)

        outcome = QualityOutcome(
            task=task,
            passed=passed,
            decision=decision,
            state=state,
            confidence=resolved_confidence,
            criticality=criticality,
            trust_tier=trust_tier,
            violations=violations,
            contradictions=contradictions,
            fingerprint=fingerprinting.result_hash(
                fingerprint_payload if fingerprint_payload is not None else result
            ),
            reason=decision.value,
            metadata={
                "min_confidence": policy.min_confidence.value,
                "max_retries": policy.max_retries,
            },
        )

        self._record(
            task=task,
            provider=provider,
            model=model,
            duration_ms=duration_ms
            if duration_ms is not None
            else int((time.monotonic() - start) * 1000),
            success=passed,
            usage=usage,
            quality_status=outcome.state,
            result_hash=outcome.fingerprint,
            criticality=criticality,
            prompt_version=prompt_version,
        )
        return outcome

    # -- verification / resolution ------------------------------------------

    async def verify(
        self,
        task: str,
        *,
        context: dict[str, Any],
        provider: str | None = None,
        model: str | None = None,
    ) -> Any:
        """Run the registry verifier for the task (AI pass or fallback)."""
        spec = self._registry.get(task)
        if spec is None or spec.verifier is None:
            raise ValueError(f"no verifier registered for task {task}")
        return await spec.verifier(
            **context, provider=provider, model=model, ai_service=context.get("ai_service")
        )

    # -- helpers -------------------------------------------------------------

    @staticmethod
    def _extract_confidence(result: Any) -> ConfidenceLevel:
        value = getattr(result, "confidence", None)
        if value is None:
            return ConfidenceLevel.MEDIUM
        return parse_confidence(value)

    @staticmethod
    def _state_from(
        result: Any,
        violations: list[str],
        contradictions: list[str],
        confidence: ConfidenceLevel,
    ) -> QualityState:
        if violations:
            return QualityState.REJECTED
        if contradictions:
            return QualityState.NEEDS_VERIFICATION
        if confidence == ConfidenceLevel.LOW:
            return QualityState.LOW_CONFIDENCE
        return QualityState.ACCEPTED

    @staticmethod
    def _contradictions(task: str, result: Any, context: dict[str, Any]) -> list[str]:
        """Cross-field contradictions beyond the registered validator rules.

        Currently empty by default; engines may supply richer signals via the
        ``contradictions`` context key (cross-engine consistency, score
        integrity, stage disagreement).
        """
        return [str(item) for item in (context.get("contradictions") or [])]

    @staticmethod
    def _trust_tier(passed: bool, state: QualityState, decision: QualityDecision) -> TrustTier:
        if not passed or state == QualityState.REJECTED:
            return TrustTier.SCHEMA_ONLY
        if state == QualityState.LOW_CONFIDENCE:
            return TrustTier.SCHEMA_CONSISTENCY
        if decision == QualityDecision.SECONDARY_VERIFY:
            return TrustTier.SCHEMA_CONSISTENCY_VERIFIER
        if decision == QualityDecision.ACCEPT and state == QualityState.ACCEPTED:
            return TrustTier.SCHEMA_CONSISTENCY
        return TrustTier.SCHEMA_CONSISTENCY

    def _record(
        self,
        *,
        task: str,
        provider: str | None,
        model: str | None,
        duration_ms: int,
        success: bool,
        usage: Any = None,
        quality_status: QualityState | None = None,
        result_hash: str | None = None,
        criticality: Criticality | None = None,
        failure_class: str | None = None,
        retry_count: int = 0,
        fallback_used: bool = False,
        prompt_version: str | None = None,
    ) -> None:
        if not self._settings.ai_quality_telemetry_enabled:
            return
        event = TelemetryEvent(
            task=task,
            provider=provider,
            model=model,
            duration_ms=duration_ms,
            success=success,
            failure_class=failure_class,
            retry_count=retry_count,
            fallback_used=fallback_used,
            quality_status=quality_status.value if quality_status else None,
            result_hash=result_hash,
            criticality=criticality.value if criticality else None,
            prompt_version=prompt_version,
        )
        if usage is not None:
            event.token_usage = {
                key: value
                for key, value in (
                    ("input_tokens", usage.input_tokens),
                    ("output_tokens", usage.output_tokens),
                    ("total_tokens", usage.total_tokens),
                )
                if value is not None
            }
            cost = estimate_cost(usage, provider=provider)
            event.estimated_cost = cost.estimated_cost_usd
        self._telemetry.record(event)

    def record_call(
        self,
        *,
        task: str,
        provider: str | None,
        model: str | None,
        duration_ms: int,
        success: bool,
        failure_class: str | None = None,
        retry_count: int = 0,
        fallback_used: bool = False,
        usage: Any = None,
        quality_status: QualityState | str | None = None,
        result_hash: str | None = None,
        criticality: Criticality | str | None = None,
        prompt_version: str | None = None,
    ) -> None:
        """Record raw call telemetry (used by engines outside validate())."""
        if not self._settings.ai_quality_telemetry_enabled:
            return
        event = TelemetryEvent(
            task=task,
            provider=provider,
            model=model,
            duration_ms=duration_ms,
            success=success,
            failure_class=failure_class,
            retry_count=retry_count,
            fallback_used=fallback_used,
            quality_status=quality_status.value
            if isinstance(quality_status, QualityState)
            else quality_status,
            result_hash=result_hash,
            criticality=criticality.value if isinstance(criticality, Criticality) else criticality,
            prompt_version=prompt_version,
        )
        if usage is not None:
            event.token_usage = {
                key: value
                for key, value in (
                    ("input_tokens", usage.input_tokens),
                    ("output_tokens", usage.output_tokens),
                    ("total_tokens", usage.total_tokens),
                )
                if value is not None
            }
            cost = estimate_cost(usage, provider=provider)
            event.estimated_cost = cost.estimated_cost_usd
        self._telemetry.record(event)


def create_quality_service(
    registry: AIQualityRegistry | None = None,
    settings: Settings | None = None,
) -> AIQualityService:
    """Shared factory so engines and API endpoints use one consistent setup."""
    return AIQualityService(registry=registry, settings=settings)
