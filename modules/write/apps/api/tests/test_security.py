"""Phase 15 B-security tests: headers, request IDs, health probes, 422
sanitization, rate limiting, provider message redaction, docs gating.
"""

import os

from app.core.config import get_settings
from app.core.security import RateLimitMiddleware
from app.providers.ai.redaction import redact_message, redact_secrets
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route


async def test_security_headers_present(client) -> None:
    response = await client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert "default-src 'none'" in response.headers["Content-Security-Policy"]


async def test_request_id_echoed(client) -> None:
    response = await client.get("/health", headers={"X-Request-ID": "my-trace-42"})
    assert response.headers["X-Request-ID"] == "my-trace-42"
    generated = await client.get("/health")
    assert generated.headers["X-Request-ID"]


async def test_health_live_and_ready(client) -> None:
    live = await client.get("/health/live")
    assert live.status_code == 200
    assert live.json()["database"] == "unchecked"
    ready = await client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["database"] == "ok"


async def test_validation_errors_do_not_echo_input(client) -> None:
    response = await client.get("/health?check_db=notabool")
    assert response.status_code == 422
    details = response.json()["error"]["details"]
    assert len(details) == 1
    assert "input" not in details[0]
    assert details[0]["loc"] == ["query", "check_db"]
    assert details[0]["type"]


async def test_rate_limit_returns_429_after_limit() -> None:
    os.environ["RATE_LIMIT_ENABLED"] = "true"
    os.environ["RATE_LIMIT_PER_MINUTE"] = "3"
    get_settings.cache_clear()
    try:
        inner = Starlette(
            routes=[
                Route(
                    "/api/v1/ping",
                    endpoint=lambda request: JSONResponse({"ok": True}),
                )
            ]
        )
        wrapped = RateLimitMiddleware(inner)
        transport = ASGITransport(app=wrapped)

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            statuses = []
            for _ in range(4):
                response = await client.get("/api/v1/ping")
                statuses.append(response.status_code)
            assert statuses == [200, 200, 200, 429]
    finally:
        os.environ["RATE_LIMIT_ENABLED"] = "false"
        get_settings.cache_clear()


async def test_docs_disabled_in_production() -> None:
    os.environ["APP_ENV"] = "production"
    get_settings.cache_clear()
    try:
        from app.main import create_app

        application = create_app()
        assert application.docs_url is None
        assert application.redoc_url is None
        assert application.openapi_url is None
    finally:
        os.environ["APP_ENV"] = "test"
        get_settings.cache_clear()


class TestRedaction:
    def test_masks_google_api_key(self) -> None:
        assert redact_secrets("Key: AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz end") == (
            "Key: [REDACTED] end"
        )

    def test_masks_bearer_token(self) -> None:
        text = "Authorization: Bearer abc123.def456.ghi789"
        assert "Bearer abc123" not in redact_secrets(text)
        assert "[REDACTED]" in redact_secrets(text)

    def test_masks_key_assignment(self) -> None:
        assert "key=supersecretvalue" not in redact_secrets("api_key=supersecretvalue")

    def test_truncates_long_messages(self) -> None:
        long = "x" * 2000
        result = redact_message(long)
        assert len(result) < len(long)
        assert result.endswith("…")

    def test_redact_message_masks_and_truncates(self) -> None:
        result = redact_message(f"AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz {'y' * 500}")
        assert "[REDACTED]" in result
        assert len(result) < 500
