"""Redaction helpers for AI provider transport errors (B7).

Provider SDK errors often embed the raw HTTP exchange (headers, echoed
request payloads). Before those strings enter ``AIError.message`` - and from
there logs and API error envelopes - known secret shapes are masked and long
payloads are truncated.
"""

import re

_SECRET_PATTERNS = (
    re.compile(r"AIza[0-9A-Za-z_\-]{20,}"),  # Google API key
    re.compile(r"(?i)\bsk-[A-Za-z0-9_\-]{8,}"),  # OpenAI-style key
    re.compile(r"(?i)bearer\s+[A-Za-z0-9._~+\-/]{10,}=?"),  # Authorization header
    re.compile(r"(?i)(api[_-]?key|authorization|token)\s*[:=]\s*[^\s,;]+"),
)

_MAX_MESSAGE_LENGTH = 400


def redact_secrets(text: str) -> str:
    """Replace known secret shapes with ``[REDACTED]``."""
    for pattern in _SECRET_PATTERNS:
        text = pattern.sub("[REDACTED]", text)
    return text


def redact_message(text: str) -> str:
    """Redact secrets and truncate over-long provider error messages."""
    text = redact_secrets(text)
    if len(text) > _MAX_MESSAGE_LENGTH:
        text = text[:_MAX_MESSAGE_LENGTH] + "…"
    return text
