"""Enumerations for the AI quality layer.

Internal quality states should never be surfaced verbatim to normal users;
they are kept for audit, debugging and developer diagnostics.
"""

import enum


class QualityState(str, enum.Enum):
    """Internal quality state of an AI result."""

    VALID = "valid"
    ACCEPTED = "accepted"
    LOW_CONFIDENCE = "low_confidence"
    NEEDS_VERIFICATION = "needs_verification"
    REJECTED = "rejected"


class QualityDecision(str, enum.Enum):
    """Action the quality policy takes for an AI result."""

    ACCEPT = "accept"
    RETRY = "retry"
    REGENERATE = "regenerate"
    FALLBACK = "fallback"
    SECONDARY_VERIFY = "secondary_verify"
    ESCALATE = "escalate"
    DEGRADE = "degrade"


class Criticality(str, enum.Enum):
    """How important a given AI task is (drives validation strength)."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ConfidenceLevel(str, enum.Enum):
    """Generic, non-precise confidence representation."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TrustTier(int, enum.Enum):
    """How strongly an evaluation output is trusted."""

    SCHEMA_ONLY = 1
    SCHEMA_CONSISTENCY = 2
    SCHEMA_CONSISTENCY_VERIFIER = 3
    MULTI_PROVIDER = 4


class CostProfile(str, enum.Enum):
    """Rough cost expectation for a task (used for provider routing)."""

    CHEAP = "cheap"
    BALANCED = "balanced"
    QUALITY = "quality"
    CRITICAL = "critical"


_CONFIDENCE_ORDER = {
    ConfidenceLevel.LOW: 0,
    ConfidenceLevel.MEDIUM: 1,
    ConfidenceLevel.HIGH: 2,
}

_CRITICALITY_ORDER = {
    Criticality.LOW: 0,
    Criticality.MEDIUM: 1,
    Criticality.HIGH: 2,
    Criticality.CRITICAL: 3,
}


def confidence_at_least(value: ConfidenceLevel, minimum: ConfidenceLevel) -> bool:
    return _CONFIDENCE_ORDER[value] >= _CONFIDENCE_ORDER[minimum]


def criticality_at_least(value: Criticality, minimum: Criticality) -> bool:
    return _CRITICALITY_ORDER[value] >= _CRITICALITY_ORDER[minimum]


def parse_confidence(value: str | ConfidenceLevel | None) -> ConfidenceLevel:
    """Coerce an arbitrary confidence string to the canonical enum."""
    if isinstance(value, ConfidenceLevel):
        return value
    if value is None:
        return ConfidenceLevel.MEDIUM
    normalized = str(value).strip().lower()
    for level in ConfidenceLevel:
        if level.value == normalized:
            return level
    return ConfidenceLevel.MEDIUM
