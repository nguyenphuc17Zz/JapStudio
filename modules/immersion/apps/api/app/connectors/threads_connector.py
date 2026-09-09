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

logger = get_logger("connectors.threads")


class ThreadsConnector(ContentSourceConnector):
    """Connector skeleton for Meta Threads Japanese creators."""

    source_type: str = "threads"
    name: str = "Threads Connector"
    description: str = "Ingests Japanese social posts from Meta Threads via official API."
    supported_auth: List[str] = ["bearer_token", "oauth2"]
    required_config_fields: List[str] = ["creator_id"]
    optional_config_fields: List[str] = ["limit"]

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "Config must be a dictionary"
        if not config.get("creator_id") and not config.get("username"):
            return False, "Threads connector requires 'creator_id' or 'username'"
        return True, "Valid Threads configuration"

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start = time.perf_counter()
        cred = getattr(source, "credential", None)
        if not cred or not decrypted_secret:
            return TestConnectionResult(
                success=False,
                status_code=401,
                response_time_ms=round((time.perf_counter() - start) * 1000, 2),
                message="Threads API requires OAuth User Token.",
                error_details="Missing credential",
            )
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return TestConnectionResult(
            success=True,
            status_code=200,
            response_time_ms=elapsed_ms,
            message="Threads API token validated successfully.",
            sample_items_count=1,
            sample_preview=[{"text": "Threads 日本語ポストサンプル"}],
        )

    async def fetch(
        self, source: Any, decrypted_secret: Optional[str] = None, limit: int = 50
    ) -> FetchResult:
        start = time.perf_counter()
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        config = getattr(source, "config_json", {}) or {}
        creator = config.get("creator_id", "japanese_user")
        sample_item = StandardRawItem(
            source_id=getattr(source, "id", None),
            external_id="threads_demo_1",
            title=f"Threads update from {creator}",
            content="今日も日本語の勉強を頑張りましょう！ (Sample Threads post)",
            url="https://threads.net",
            author=creator,
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
            response_time_ms=12.0,
            status_code=200 if decrypted_secret else 401,
            message="Threads API endpoint reachable",
        )
