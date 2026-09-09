"""Deterministic AI result fingerprinting (Phase 11).

Purpose: detect accidental duplicate regeneration, compare outputs, debug
inconsistencies. Fingerprints are NOT semantic truth — two results may share
a hash while meaning different things, or differ while meaning the same.
"""

import hashlib
import json
from typing import Any


def canonical_json(value: Any) -> str:
    """Stable JSON serialization: sorted keys, compact separators."""
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def result_hash(payload: Any) -> str:
    """SHA-256 fingerprint of a Pydantic model, dict or JSON string."""
    if hasattr(payload, "model_dump"):
        payload = payload.model_dump(mode="json")
    elif isinstance(payload, str):
        payload = json.loads(payload) if payload.strip().startswith(("{", "[")) else payload
    elif hasattr(payload, "__dict__"):
        payload = vars(payload)
    return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()
