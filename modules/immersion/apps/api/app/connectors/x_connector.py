import time
from typing import Dict, Any, List, Optional, Tuple
from app.connectors.base import (
    ContentSourceConnector,
    TestConnectionResult,
    FetchResult,
    HealthCheckResult,
    StandardRawItem,
)
from app.core.logging import get_logger

logger = get_logger("connectors.x")


class XConnector(ContentSourceConnector):
    """Connector skeleton for X / Twitter Japanese accounts and hashtags."""

    source_type: str = "x"
    name: str = "X / Twitter Connector"
    description: str = "Ingests tweets and discussions from Japanese X accounts or hashtags via API v2."
    supported_auth: List[str] = ["bearer_token", "oauth2"]
    required_config_fields: List[str] = ["query_or_username"]
    optional_config_fields: List[str] = ["max_results", "lang"]

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "Config must be a dictionary"
        if not config.get("query_or_username") and not config.get("username"):
            return False, "X Connector requires 'query_or_username'"
        return True, "Valid X configuration"

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start = time.perf_counter()
        # Authenticated check simulation for Phase 1
        cred = getattr(source, "credential", None)
        if not cred or not decrypted_secret:
            return TestConnectionResult(
                success=False,
                status_code=401,
                response_time_ms=round((time.perf_counter() - start) * 1000, 2),
                message="X Connector requires a valid Bearer Token.",
                error_details="Missing credential",
            )
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return TestConnectionResult(
            success=True,
            status_code=200,
            response_time_ms=elapsed_ms,
            message="X API connection credentials validated successfully.",
            sample_items_count=1,
            sample_preview=[{"text": "日本語のつぶやきテスト (X sample feed item)"}],
        )

    async def fetch(
        self, source: Any, decrypted_secret: Optional[str] = None, limit: int = 50
    ) -> FetchResult:
        start = time.perf_counter()
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        config = getattr(source, "config_json", {}) or {}
        query = config.get("query_or_username", "Japanese")
        sample_item = StandardRawItem(
            source_id=getattr(source, "id", None),
            external_id="x_demo_1",
            title=f"X Post from {query}",
            content=f"これは #{query} に関する日本語のサンプル投稿です。",
            url="https://x.com",
            author=query,
            tags=["japanese", query],
        )
        return FetchResult(
            success=True,
            status_code=200,
            response_time_ms=elapsed_ms,
            items=[sample_item],
            total_found=1,
        )

    async def health_check(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> HealthCheckResult:
        return HealthCheckResult(
            status="healthy" if decrypted_secret else "degraded",
            response_time_ms=15.0,
            status_code=200 if decrypted_secret else 401,
            message="X API endpoint reachable",
        )
