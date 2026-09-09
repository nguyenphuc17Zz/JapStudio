import json
import pytest
from unittest.mock import AsyncMock, patch
import httpx

from app.services.ai.groq_provider import GroqAIProvider


def _resp(status: int, body: dict) -> httpx.Response:
    req = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    return httpx.Response(status_code=status, json=body, request=req)


def _ok_payload(text: str) -> dict:
    return {
        "choices": [{"message": {"content": text}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 20},
    }


@pytest.mark.asyncio
async def test_surfaces_provider_error_body_sanitized():
    provider = GroqAIProvider()
    err_body = {"error": {"message": "The model `qwen/qwen3.6-27b` does not exist", "code": "model_not_found"}}

    async def fake_post(self, *args, **kwargs):
        return _resp(400, err_body)

    with patch.object(GroqAIProvider, "is_configured", new_callable=lambda: property(lambda self: True)):
        with patch("httpx.AsyncClient.post", new=fake_post):
            with pytest.raises(ValueError) as exc_info:
                await provider.generate_structured(
                    prompt="hi", system_instruction="sys",
                    response_schema={"type": "object"}, model="qwen/qwen3.6-27b",
                )
    msg = str(exc_info.value)
    assert "does not exist" in msg
    assert "Enrichment" in msg or "Groq" in msg


@pytest.mark.asyncio
async def test_no_secret_in_error_even_if_body_contains_key():
    provider = GroqAIProvider()
    evil_body = {"error": {"message": "bad request, key was sk-evilkey1234567890abcdef"}}
    calls = {"n": 0}

    async def fake_post(self, *args, **kwargs):
        calls["n"] += 1
        return _resp(400, evil_body)

    with patch.object(GroqAIProvider, "is_configured", new_callable=lambda: property(lambda self: True)):
        with patch("httpx.AsyncClient.post", new=fake_post):
            with pytest.raises(ValueError) as exc_info:
                await provider.generate_structured(
                    prompt="hi", system_instruction="sys",
                    response_schema={"type": "object"}, model="llama-3.3-70b-versatile",
                )
    assert "sk-evilkey1234567890abcdef" not in str(exc_info.value)
    assert "sk-****" in str(exc_info.value)


@pytest.mark.asyncio
async def test_tier2_reasoning_hidden_for_qwen():
    provider = GroqAIProvider()
    fmt_err = {"error": {"message": "response_format json_object is not supported for this model"}}
    good_text = json.dumps({"answer": 42})
    calls = {"n": 0}
    seen_payloads = []

    async def fake_post(self, *args, **kwargs):
        calls["n"] += 1
        seen_payloads.append(kwargs.get("json", {}))
        if calls["n"] == 1:
            return _resp(400, fmt_err)
        return _resp(200, _ok_payload(good_text))

    with patch.object(GroqAIProvider, "is_configured", new_callable=lambda: property(lambda self: True)):
        with patch("httpx.AsyncClient.post", new=fake_post):
            result = await provider.generate_structured(
                prompt="hi", system_instruction="sys",
                response_schema={"type": "object"}, model="qwen/qwen3.6-27b",
            )
    assert calls["n"] == 2
    assert seen_payloads[0].get("response_format") == {"type": "json_object"}
    assert seen_payloads[1].get("reasoning_format") == "hidden"
    assert seen_payloads[1].get("reasoning_effort") == "none"
    assert result.structured_data == {"answer": 42}
    assert result.model_name == "qwen/qwen3.6-27b"


@pytest.mark.asyncio
async def test_tier3_plain_fallback_when_reasoning_params_rejected():
    provider = GroqAIProvider()
    fmt_err = {"error": {"message": "Failed to validate JSON. Please adjust your prompt.", "code": "json_validate_failed"}}
    param_err = {"error": {"message": "Unrecognized request argument supplied: reasoning_format"}}
    good_text = json.dumps({"answer": 43})
    calls = {"n": 0}
    seen_payloads = []

    async def fake_post(self, *args, **kwargs):
        calls["n"] += 1
        seen_payloads.append(kwargs.get("json", {}))
        if calls["n"] <= 2:
            return _resp(400, fmt_err if calls["n"] == 1 else param_err)
        return _resp(200, _ok_payload(good_text))

    with patch.object(GroqAIProvider, "is_configured", new_callable=lambda: property(lambda self: True)):
        with patch("httpx.AsyncClient.post", new=fake_post):
            result = await provider.generate_structured(
                prompt="hi", system_instruction="sys",
                response_schema={"type": "object"}, model="qwen/qwen3.6-27b",
            )
    assert calls["n"] == 3
    assert "response_format" not in seen_payloads[2]
    assert "reasoning_format" not in seen_payloads[2]
    assert result.structured_data == {"answer": 43}


@pytest.mark.asyncio
async def test_non_reasoning_model_never_gets_reasoning_params():
    provider = GroqAIProvider()
    fmt_err = {"error": {"message": "response_format json_object is not supported"}}
    good_text = json.dumps({"answer": 44})
    calls = {"n": 0}
    seen_payloads = []

    async def fake_post(self, *args, **kwargs):
        calls["n"] += 1
        seen_payloads.append(kwargs.get("json", {}))
        if calls["n"] == 1:
            return _resp(400, fmt_err)
        return _resp(200, _ok_payload(good_text))

    with patch.object(GroqAIProvider, "is_configured", new_callable=lambda: property(lambda self: True)):
        with patch("httpx.AsyncClient.post", new=fake_post):
            result = await provider.generate_structured(
                prompt="hi", system_instruction="sys",
                response_schema={"type": "object"}, model="llama-3.3-70b-versatile",
            )
    assert calls["n"] == 2
    assert "reasoning_format" not in seen_payloads[1]
    assert "response_format" not in seen_payloads[1]
    assert result.structured_data == {"answer": 44}


@pytest.mark.asyncio
async def test_lenient_json_parsing_with_fences():
    provider = GroqAIProvider()
    fenced = 'Here is the result:\n```json\n{"answer": 7}\n```'
    calls = {"n": 0}

    async def fake_post(self, *args, **kwargs):
        calls["n"] += 1
        return _resp(200, _ok_payload(fenced))

    with patch.object(GroqAIProvider, "is_configured", new_callable=lambda: property(lambda self: True)):
        with patch("httpx.AsyncClient.post", new=fake_post):
            result = await provider.generate_structured(
                prompt="hi", system_instruction="sys",
                response_schema={"type": "object"}, model="llama-3.3-70b-versatile",
            )
    assert result.structured_data == {"answer": 7}
