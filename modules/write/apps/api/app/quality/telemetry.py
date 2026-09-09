"""Privacy-safe AI telemetry (Phase 11).

Tracks task, provider, model, duration, success, failure class, retry count,
fallback usage, token usage, quality status and a result fingerprint.

NEVER stores: API keys, raw learner writing, full private prompts or private
responses. A development/debug mode can attach deeper logs, but it is off by
default.
"""

import logging
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.quality.cost import CostEstimate, estimate_cost
from app.quality.enums import Criticality, QualityState

logger = logging.getLogger("app.quality.telemetry")

_MAX_BUFFER = 2000


@dataclass
class TelemetryEvent:
    """One recorded AI call. Sensitive fields are never populated."""

    task: str
    provider: str | None
    model: str | None
    duration_ms: int
    success: bool
    failure_class: str | None = None
    retry_count: int = 0
    fallback_used: bool = False
    token_usage: dict[str, int] | None = None
    quality_status: str | None = None
    result_hash: str | None = None
    criticality: str | None = None
    estimated_cost: float | None = None
    prompt_version: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        return {
            "task": self.task,
            "provider": self.provider,
            "model": self.model,
            "duration_ms": self.duration_ms,
            "success": self.success,
            "failure_class": self.failure_class,
            "retry_count": self.retry_count,
            "fallback_used": self.fallback_used,
            "token_usage": self.token_usage,
            "quality_status": self.quality_status,
            "result_hash": self.result_hash,
            "criticality": self.criticality,
            "estimated_cost": self.estimated_cost,
            "prompt_version": self.prompt_version,
            "created_at": self.created_at.isoformat(),
        }


def build_event(
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
    cost_estimate: CostEstimate | None = None,
    prompt_version: str | None = None,
) -> TelemetryEvent:
    tokens = None
    if usage is not None:
        tokens = {
            key: value
            for key, value in (
                ("input_tokens", usage.input_tokens),
                ("output_tokens", usage.output_tokens),
                ("total_tokens", usage.total_tokens),
            )
            if value is not None
        }
    cost = cost_estimate
    if cost is None and usage is not None:
        cost = estimate_cost(usage, provider=provider)
    return TelemetryEvent(
        task=task,
        provider=provider,
        model=model,
        duration_ms=duration_ms,
        success=success,
        failure_class=failure_class,
        retry_count=retry_count,
        fallback_used=fallback_used,
        token_usage=tokens or None,
        quality_status=quality_status.value
        if isinstance(quality_status, QualityState)
        else quality_status,
        result_hash=result_hash,
        criticality=criticality.value if isinstance(criticality, Criticality) else criticality,
        estimated_cost=cost.estimated_cost_usd if cost is not None else None,
        prompt_version=prompt_version,
    )


class AITelemetry:
    """In-memory rolling telemetry buffer with aggregated views."""

    def __init__(self, max_buffer: int = _MAX_BUFFER) -> None:
        self._events: deque[TelemetryEvent] = deque(maxlen=max_buffer)

    def record(self, event: TelemetryEvent) -> None:
        self._events.append(event)

    def events(self) -> list[TelemetryEvent]:
        return list(self._events)

    def reset(self) -> None:
        self._events.clear()

    def _aggregate(self, events: list[TelemetryEvent]) -> dict[str, Any]:
        if not events:
            return {
                "calls": 0,
                "success_rate": None,
                "avg_latency_ms": None,
                "fallback_rate": None,
                "quality_pass_rate": None,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "estimated_cost_usd": 0.0,
            }
        successes = sum(1 for event in events if event.success)
        fallbacks = sum(1 for event in events if event.fallback_used)
        quality_passed = sum(
            1
            for event in events
            if event.quality_status in (QualityState.ACCEPTED.value, QualityState.VALID.value)
        )
        input_tokens = sum((event.token_usage or {}).get("input_tokens", 0) for event in events)
        output_tokens = sum((event.token_usage or {}).get("output_tokens", 0) for event in events)
        total_tokens = sum((event.token_usage or {}).get("total_tokens", 0) for event in events)
        costs = [event.estimated_cost for event in events if event.estimated_cost is not None]
        return {
            "calls": len(events),
            "success_rate": round(successes / len(events), 4),
            "avg_latency_ms": round(sum(event.duration_ms for event in events) / len(events), 1),
            "fallback_rate": round(fallbacks / len(events), 4),
            "quality_pass_rate": round(quality_passed / len(events), 4) if events else None,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "estimated_cost_usd": round(sum(costs), 6) if costs else 0.0,
        }

    def snapshot(self) -> dict[str, Any]:
        """Aggregated statistics grouped by task and provider."""
        events = list(self._events)
        tasks: dict[str, dict[str, Any]] = {}
        for event in events:
            bucket = tasks.setdefault(event.task, [])
            bucket.append(event)
        providers: dict[str, dict[str, Any]] = {}
        for event in events:
            if event.provider:
                bucket = providers.setdefault(event.provider, [])
                bucket.append(event)
        return {
            "total_events": len(events),
            "overall": self._aggregate(events),
            "tasks": {task: self._aggregate(group) for task, group in tasks.items()},
            "providers": {
                provider: self._aggregate(group) for provider, group in providers.items()
            },
        }

    def recent_failures(self, limit: int = 20) -> list[dict[str, Any]]:
        failures = [event.to_dict() for event in self._events if not event.success]
        return failures[-limit:]


telemetry = AITelemetry()
