"""Shared structured-output helpers.

Providers that support native structured output (Gemini response_schema,
Groq json_object, Ollama format=json) still go through validation here so
business code always receives a valid Pydantic instance or an AIError.
"""

import json
from typing import Any

from pydantic import BaseModel, ValidationError

from app.providers.ai.errors import AIResponseError


def extract_json(text: str) -> Any:
    """Extract the first JSON value (object or array) from arbitrary text.

    Handles markdown code fences and surrounding prose produced by models.
    """
    stripped = text.strip()
    if not stripped:
        raise AIResponseError("Empty response, expected JSON")
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass

    if "```" in stripped:
        for block in stripped.split("```"):
            block = block.strip()
            if block.startswith("json"):
                block = block[4:].strip()
            if block and (block.startswith("{") or block.startswith("[")):
                try:
                    return json.loads(block)
                except json.JSONDecodeError:
                    pass

    start = len(stripped)
    for open_char in ("{", "["):
        index = stripped.find(open_char)
        if index != -1:
            start = min(start, index)
    if start == len(stripped):
        raise AIResponseError("No JSON found in response")
    decoder = json.JSONDecoder()
    try:
        value, _ = decoder.raw_decode(stripped[start:])
        return value
    except json.JSONDecodeError as exc:
        raise AIResponseError(f"Response is not valid JSON: {exc}") from exc


def validate_structured(
    raw_text: str,
    response_model: type[BaseModel],
    *,
    provider: str,
    model: str,
) -> BaseModel:
    """Extract JSON from the provider text and validate it against the model."""
    data = extract_json(raw_text)
    try:
        return response_model.model_validate(data)
    except ValidationError as exc:
        raise AIResponseError(
            f"Structured output failed validation for {response_model.__name__}: {exc}",
            provider=provider,
            model=model,
        ) from exc
