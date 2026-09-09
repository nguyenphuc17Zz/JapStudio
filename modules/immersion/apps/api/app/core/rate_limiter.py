import time
import random
import asyncio
import re
import logging
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)


class AsyncTokenBucket:
    """Thread-safe and asyncio-safe Token Bucket Rate Limiter (Denning / Tanenbaum).
    
    Prevents burst requests from overwhelming upstream APIs (e.g. Google Gemini 15 RPM).
    """

    def __init__(self, capacity: float = 5.0, fill_rate: float = 0.25):
        """
        Args:
            capacity: Maximum burst capacity in tokens (e.g. 5 tokens).
            fill_rate: Refill speed in tokens per second (0.25 tokens/s = 15 tokens/minute).
        """
        self.capacity = float(capacity)
        self.fill_rate = float(fill_rate)
        self.tokens = float(capacity)
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: float = 1.0) -> float:
        """Acquires the requested tokens, sleeping asynchronously if needed.
        
        Returns:
            The amount of time (in seconds) that was waited.
        """
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.last_update = now

            # Refill tokens according to elapsed time
            self.tokens = min(self.capacity, self.tokens + elapsed * self.fill_rate)

            if self.tokens >= tokens:
                self.tokens -= tokens
                return 0.0

            # Need to wait for tokens to refill
            deficit = tokens - self.tokens
            wait_seconds = deficit / self.fill_rate
            self.tokens = 0.0
            self.last_update = now + wait_seconds

        # Sleep outside the lock so other tasks can register their queue order
        if wait_seconds > 0:
            logger.info(f"Token bucket throttler: waiting {wait_seconds:.2f}s before sending request.")
            await asyncio.sleep(wait_seconds)
        return wait_seconds


class AIRateLimiterManager:
    """Centralized rate limiter registry providing isolated token buckets per AI provider."""

    # Default limits format: (burst_capacity, fill_rate_tokens_per_second)
    # None indicates unlimited / local inference (no network throttle)
    PROVIDER_RPM_LIMITS: Dict[str, Optional[tuple[float, float]]] = {
        "gemini": (5.0, 0.25),       # 15 RPM (Google AI Studio Free Tier safe)
        "groq": (10.0, 0.50),        # 30 RPM (Groq Cloud Free Tier safe)
        "openai": (15.0, 1.00),      # 60 RPM
        "deepseek": (10.0, 0.50),    # 30 RPM
        "anthropic": (10.0, 0.50),   # 30 RPM
        "ollama": None,              # Unlimited local inference
        "mock": None,                # Unlimited mock testing
    }
    DEFAULT_LIMIT = (10.0, 0.50)     # 30 RPM default for any future unlisted provider

    def __init__(self):
        self._buckets: Dict[str, Optional[AsyncTokenBucket]] = {}
        self._lock = asyncio.Lock()

    def get_bucket(self, provider_name: str) -> Optional[AsyncTokenBucket]:
        key = (provider_name or "").strip().lower()
        if key in self._buckets:
            return self._buckets[key]

        # Check configuration
        limit = self.PROVIDER_RPM_LIMITS.get(key, self.DEFAULT_LIMIT)
        if limit is None:
            self._buckets[key] = None
            return None

        cap, fill = limit
        bucket = AsyncTokenBucket(capacity=cap, fill_rate=fill)
        self._buckets[key] = bucket
        return bucket

    async def acquire(self, provider_name: str, tokens: float = 1.0) -> float:
        """Acquires tokens from the provider's dedicated token bucket."""
        bucket = self.get_bucket(provider_name)
        if bucket is None:
            return 0.0
        return await bucket.acquire(tokens)


# Global singleton instance
ai_rate_limiter_manager = AIRateLimiterManager()


def extract_provider_retry_delay(response: httpx.Response, provider: str = "") -> Optional[float]:
    """Universal retry delay extractor across AI providers (Google, Groq, OpenAI, Anthropic).
    
    Checks:
    1. HTTP Header 'Retry-After' (RFC 7231).
    2. Google RPC 'RetryInfo.retryDelay' in error details JSON.
    3. Error message regex matching for delay strings (Groq, OpenAI).
    """
    # 1. Try standard Retry-After header
    retry_after = response.headers.get("retry-after")
    if retry_after:
        try:
            val = float(retry_after.strip())
            if val > 0:
                return val
        except (ValueError, TypeError):
            pass

    # 2. Inspect response JSON body
    try:
        body = response.json()
    except Exception:
        body = None

    if isinstance(body, dict):
        # Google RPC structure: body["error"]["details"][...]["retryDelay"]
        error_obj = body.get("error")
        if isinstance(error_obj, dict):
            details = error_obj.get("details", [])
            if isinstance(details, list):
                for item in details:
                    if isinstance(item, dict) and "RetryInfo" in str(item.get("@type", "")):
                        raw_delay = item.get("retryDelay")
                        if raw_delay:
                            m = re.search(r"([\d\.]+)\s*s?", str(raw_delay).strip())
                            if m:
                                return float(m.group(1))

            # Groq & OpenAI error text: body["error"]["message"]
            msg = error_obj.get("message", "")
            if msg and isinstance(msg, str):
                # Pattern e.g. "Please try again in 5.234s.", "retry after 3s", "wait 2.5 seconds"
                m = re.search(r"(?:try again in|retry after|wait|retry in)\s*([\d\.]+)\s*(?:s|seconds)?", msg, re.IGNORECASE)
                if m:
                    return float(m.group(1))
        elif isinstance(error_obj, str):
            m = re.search(r"(?:try again in|retry after|wait|retry in)\s*([\d\.]+)\s*(?:s|seconds)?", error_obj, re.IGNORECASE)
            if m:
                return float(m.group(1))

    # 3. Fallback: inspect raw text if JSON didn't yield a match
    try:
        raw_text = response.text or ""
        if raw_text:
            m = re.search(r"(?:try again in|retry after|wait|retry in)\s*([\d\.]+)\s*(?:s|seconds)?", raw_text, re.IGNORECASE)
            if m:
                return float(m.group(1))
    except Exception:
        pass

    return None


# Backward-compatibility alias
extract_google_retry_delay = extract_provider_retry_delay


def calculate_decorrelated_jitter(base: float, prev_sleep: float, cap: float = 30.0) -> float:
    """Calculates backoff sleep duration using Decorrelated Jitter algorithm (AWS Architecture).
    
    Formula:
        sleep = min(cap, uniform(base, prev_sleep * 3))
    """
    if prev_sleep <= 0:
        return base
    sleep_time = random.uniform(base, prev_sleep * 3.0)
    return min(cap, max(base, sleep_time))
