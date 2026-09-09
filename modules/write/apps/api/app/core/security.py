"""Request-scoped middleware: request IDs, access logging, security headers, rate limiting.

- RequestContextMiddleware: assigns ``X-Request-ID`` (incoming or generated),
  stores it in a context variable for log correlation, emits one access-log
  line per request, and always echoes the ID back on the response.
- SecurityHeadersMiddleware: hardening response headers (nosniff, frame
  denial, referrer policy, permissions policy, CSP for API payloads, and
  HSTS in production).
- RateLimitMiddleware: in-process fixed-window rate limiting keyed by client
  IP. Single-process only (documented); shared across processes requires an
  external limiter (e.g. Redis).
"""

import logging
import time
import uuid
from collections import defaultdict
from contextvars import ContextVar
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings

logger = logging.getLogger("app.access")

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


def current_request_id() -> str:
    """Request ID for the current request (log correlation)."""
    return request_id_var.get()


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID", "").strip()[:64] or uuid.uuid4().hex
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.error(
                "request_id=%s method=%s path=%s status=500 error=unhandled",
                request_id,
                request.method,
                request.url.path,
            )
            raise
        finally:
            request_id_var.reset(token)
        duration_ms = int((time.perf_counter() - started) * 1000)
        if request.url.path != "/health/live":
            logger.info(
                "request_id=%s method=%s path=%s status=%d duration_ms=%d",
                request_id,
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
        if get_settings().app_env.lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window per-IP limiter. Single-process only.

    The window is aligned to wall-clock minutes; a client may therefore make
    up to 2x the limit across a window boundary. Acceptable for the
    lightweight protection this provides; swap for a distributed limiter
    (Redis token bucket) behind a load balancer.
    """

    def __init__(self, app: Any, max_keys: int = 5000) -> None:
        super().__init__(app)
        self._counts: dict[tuple[str, int], int] = defaultdict(int)
        self._window = -1
        self._max_keys = max_keys

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        settings = get_settings()
        if not settings.rate_limit_enabled or request.url.path.startswith("/health"):
            return await call_next(request)
        if request.method in ("OPTIONS", "HEAD"):
            return await call_next(request)
        client_ip = self._client_ip(request, settings.rate_limit_trusted_proxy_headers)
        window = int(time.time() // 60)
        if window != self._window:
            self._counts.clear()
            self._window = window
        key = (client_ip, window)
        # Guard against unbounded growth (many IPs in one window)
        if len(self._counts) > self._max_keys:
            # Drop oldest half to avoid OOM; next window will clear anyway
            for k in list(self._counts.keys())[: self._max_keys // 2]:
                self._counts.pop(k, None)
        count = self._counts[key] + 1
        if count > settings.rate_limit_per_minute:
            self._counts[key] = count
            retry_after = 60 - int(time.time()) % 60
            logger.warning(
                "rate_limit_exceeded ip=%s path=%s retry_after=%d",
                client_ip,
                request.url.path,
                retry_after,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "rate_limit_exceeded",
                        "message": "Too many requests, slow down.",
                    }
                },
                headers={"Retry-After": str(retry_after)},
            )
        self._counts[key] = count
        return await call_next(request)

    def _client_ip(self, request: Request, trusted_proxy_headers: bool) -> str:
        if trusted_proxy_headers:
            forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            if forwarded:
                return forwarded
        return request.client.host if request.client is not None else "unknown"
