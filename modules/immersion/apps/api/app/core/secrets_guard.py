import re
from typing import Any

# Patterns for secret-looking tokens. GENEROUS on purpose: a false positive
# (masking a non-secret) is harmless, a false negative leaks credentials.
_PATTERNS = [
    # OpenAI-style / generic sk- keys (also matches sk-proj-...)
    (re.compile(r"\bsk-[A-Za-z0-9_\-]{8,}\b"), "sk-****"),
    # Groq keys
    (re.compile(r"\bgsk_[A-Za-z0-9_\-]{8,}\b"), "gsk_****"),
    # Gemini keys
    (re.compile(r"\bAIza[A-Za-z0-9_\-]{10,}\b"), "AIza****"),
    # Authorization: Bearer <token> / raw "Bearer <token>"
    (re.compile(r"(Bearer\s+)[A-Za-z0-9_\-\.~\+/=]{8,}", re.IGNORECASE), r"\1****"),
    # ?key=<secret> / &key=<secret> in URLs (legacy Gemini query auth)
    (re.compile(r"([?&]key=)[^&\s'\"]{6,}", re.IGNORECASE), r"\1****"),
    # x-goog-api-key header values in tracebacks/dicts
    (re.compile(r"(['\"]x-goog-api-key['\"]\s*:\s*['\"])[^'\"]{6,}(['\"])", re.IGNORECASE), r"\1****\2"),
    # Explicit api_key assignments: "api_key": "secret", api_key=secret
    (re.compile(r"(['\"]?(?:api[_-]?key|secret)['\"]?\s*[:=]\s*['\"]?)(?!null\b|none\b|['\"]\s*[,}\]])([^'\",\s\}\]]{8,})", re.IGNORECASE), r"\1****"),
]


def redact_secrets(text: Any) -> str:
    """Masks credential-looking tokens in arbitrary text.

    Applied to every user-facing AI error detail and provider log line so an
    API key can never leak via exception messages, URLs, or tracebacks.
    Non-string inputs are stringified; None becomes "".
    """
    if text is None:
        return ""
    try:
        out = text if isinstance(text, str) else str(text)
    except Exception:
        return ""
    for rx, repl in _PATTERNS:
        try:
            out = rx.sub(repl, out)
        except Exception:
            continue
    return out
