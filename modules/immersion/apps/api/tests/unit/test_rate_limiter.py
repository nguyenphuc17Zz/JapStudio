import time
import asyncio
import pytest
import httpx
from app.core.rate_limiter import (
    AsyncTokenBucket,
    AIRateLimiterManager,
    ai_rate_limiter_manager,
    extract_provider_retry_delay,
    extract_google_retry_delay,
    calculate_decorrelated_jitter,
)


@pytest.mark.asyncio
async def test_token_bucket_instant_acquire():
    # Capacity 3 tokens, fill_rate 1 token/s
    bucket = AsyncTokenBucket(capacity=3.0, fill_rate=1.0)
    
    # First 3 tokens should be acquired with 0 wait
    w1 = await bucket.acquire(1.0)
    w2 = await bucket.acquire(1.0)
    w3 = await bucket.acquire(1.0)
    assert w1 == 0.0
    assert w2 == 0.0
    assert w3 == 0.0


@pytest.mark.asyncio
async def test_token_bucket_waits_when_empty():
    # Capacity 1 token, fill_rate 10 tokens/s (1 token per 0.1s)
    bucket = AsyncTokenBucket(capacity=1.0, fill_rate=10.0)
    
    # Acquire the 1 available token
    w1 = await bucket.acquire(1.0)
    assert w1 == 0.0
    
    # Next token requires waiting ~0.1s
    t0 = time.monotonic()
    w2 = await bucket.acquire(1.0)
    elapsed = time.monotonic() - t0
    assert w2 > 0.05
    assert elapsed >= 0.08


@pytest.mark.asyncio
async def test_ai_rate_limiter_manager_independent_buckets():
    mgr = AIRateLimiterManager()
    
    # Groq bucket should be distinct from Gemini bucket
    groq_bucket = mgr.get_bucket("groq")
    gemini_bucket = mgr.get_bucket("gemini")
    assert groq_bucket is not None
    assert gemini_bucket is not None
    assert groq_bucket is not gemini_bucket
    assert groq_bucket.capacity == 10.0
    assert gemini_bucket.capacity == 5.0

    # Exhausting gemini tokens does not affect groq tokens
    for _ in range(5):
        w = await mgr.acquire("gemini", 1.0)
        assert w == 0.0

    # Groq should still have its full burst capacity intact
    w_groq = await mgr.acquire("groq", 1.0)
    assert w_groq == 0.0


@pytest.mark.asyncio
async def test_ai_rate_limiter_manager_unlimited_providers():
    mgr = AIRateLimiterManager()
    
    # Ollama is local, unlimited
    ollama_bucket = mgr.get_bucket("ollama")
    assert ollama_bucket is None
    w_ollama = await mgr.acquire("ollama", 5.0)
    assert w_ollama == 0.0

    # Mock is test, unlimited
    mock_bucket = mgr.get_bucket("mock")
    assert mock_bucket is None
    w_mock = await mgr.acquire("mock", 5.0)
    assert w_mock == 0.0


@pytest.mark.asyncio
async def test_ai_rate_limiter_manager_future_provider():
    mgr = AIRateLimiterManager()
    
    # Unlisted future provider e.g. "mistral" defaults safely to 30 RPM
    mistral_bucket = mgr.get_bucket("mistral")
    assert mistral_bucket is not None
    assert mistral_bucket.capacity == 10.0
    assert mistral_bucket.fill_rate == 0.50
    w = await mgr.acquire("mistral", 1.0)
    assert w == 0.0


def test_extract_provider_retry_delay_from_groq_message():
    groq_err_body = {
        "error": {
            "message": "Rate limit reached for model `llama-3.3-70b-versatile` in organization org_123. Please try again in 4.35s.",
            "type": "tokens",
            "code": "rate_limit_exceeded"
        }
    }
    resp = httpx.Response(
        status_code=429,
        json=groq_err_body,
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions"),
    )
    delay = extract_provider_retry_delay(resp, "groq")
    assert delay == 4.35


def test_extract_provider_retry_delay_from_openai_message():
    openai_err_body = {
        "error": {
            "message": "Rate limit reached for requests. Please retry after 6 seconds.",
            "type": "requests",
            "code": 429
        }
    }
    resp = httpx.Response(
        status_code=429,
        json=openai_err_body,
        request=httpx.Request("POST", "https://api.openai.com/v1/chat/completions"),
    )
    delay = extract_provider_retry_delay(resp, "openai")
    assert delay == 6.0


def test_extract_provider_retry_delay_from_raw_text():
    resp = httpx.Response(
        status_code=429,
        content=b"Too many requests. Please wait 2.5s before retrying.",
        request=httpx.Request("POST", "https://api.custom-ai.com/v1"),
    )
    delay = extract_provider_retry_delay(resp)
    assert delay == 2.5


def test_extract_google_retry_delay_from_header():
    resp = httpx.Response(
        status_code=429,
        headers={"retry-after": "17"},
        request=httpx.Request("POST", "https://example.com"),
    )
    delay = extract_provider_retry_delay(resp)
    assert delay == 17.0
    # Backward compatibility alias
    assert extract_google_retry_delay(resp) == 17.0


def test_extract_google_retry_delay_from_rpc_body():
    body = {
        "error": {
            "code": 429,
            "message": "Quota exceeded",
            "details": [
                {
                    "@type": "type.googleapis.com/google.rpc.RetryInfo",
                    "retryDelay": "12.450s"
                }
            ]
        }
    }
    resp = httpx.Response(
        status_code=429,
        json=body,
        request=httpx.Request("POST", "https://example.com"),
    )
    delay = extract_provider_retry_delay(resp)
    assert delay == 12.45


def test_extract_google_retry_delay_empty_on_normal():
    resp = httpx.Response(
        status_code=200,
        json={"ok": True},
        request=httpx.Request("POST", "https://example.com"),
    )
    delay = extract_provider_retry_delay(resp)
    assert delay is None


def test_calculate_decorrelated_jitter():
    base = 2.0
    prev_sleep = 2.0
    cap = 30.0
    for _ in range(50):
        val = calculate_decorrelated_jitter(base=base, prev_sleep=prev_sleep, cap=cap)
        assert base <= val <= cap
