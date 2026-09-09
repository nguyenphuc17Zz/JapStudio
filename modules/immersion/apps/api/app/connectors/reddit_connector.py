import time
from typing import Dict, Any, List, Optional, Tuple
import httpx

from app.connectors.base import (
    ContentSourceConnector,
    TestConnectionResult,
    FetchResult,
    HealthCheckResult,
    StandardRawItem,
)
from app.core.ssrf_validator import SSRFValidator, SSRFSecurityException
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("connectors.reddit")


class RedditConnector(ContentSourceConnector):
    """Connector for Reddit Japanese communities (e.g., r/LearnJapanese, r/newsokue)."""

    source_type: str = "reddit"
    name: str = "Reddit Japanese Communities"
    description: str = "Ingests community discussions and news from Japanese subreddits via JSON feeds."
    supported_auth: List[str] = ["none", "bearer_token", "oauth2"]
    required_config_fields: List[str] = ["subreddit"]
    optional_config_fields: List[str] = ["listing", "limit"]
    default_headers: Dict[str, str] = {
        "User-Agent": "JapStudio-Immersion-RedditBot/1.0 (by /u/japstudio_bot)"
    }

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "Config must be a dictionary"
        subreddit = config.get("subreddit")
        if not subreddit and not config.get("feed_url"):
            return False, "Configuration requires 'subreddit' name or 'feed_url'"
        return True, "Valid Reddit configuration"

    def _build_url(self, source: Any) -> str:
        if getattr(source, "feed_url", None):
            return str(source.feed_url).strip()
        config = getattr(source, "config_json", {}) or {}
        subreddit = config.get("subreddit", "LearnJapanese").strip().lstrip("r/").lstrip("/")
        listing = config.get("listing", "hot")
        return f"https://www.reddit.com/r/{subreddit}/{listing}.json?limit=25"

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start = time.perf_counter()
        try:
            url = self._build_url(source)
            SSRFValidator.validate_url(url)
            headers = dict(self.default_headers)
            if getattr(source, "headers_json", None):
                headers.update(source.headers_json)

            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

                if resp.status_code >= 400:
                    return TestConnectionResult(
                        success=False,
                        status_code=resp.status_code,
                        response_time_ms=elapsed_ms,
                        message=f"Reddit HTTP Error {resp.status_code}",
                        error_details=resp.text[:300],
                    )

                data = resp.json()
                children = data.get("data", {}).get("children", [])
                preview = [
                    {
                        "title": post.get("data", {}).get("title"),
                        "author": post.get("data", {}).get("author"),
                        "score": post.get("data", {}).get("ups"),
                    }
                    for post in children[:3]
                ]

                return TestConnectionResult(
                    success=True,
                    status_code=resp.status_code,
                    response_time_ms=elapsed_ms,
                    message=f"Connection to Reddit successful. Found {len(children)} posts.",
                    sample_items_count=len(children),
                    sample_preview=preview,
                )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return TestConnectionResult(
                success=False,
                status_code=None,
                response_time_ms=elapsed_ms,
                message=f"Reddit connection failed: {str(exc)}",
                error_details=str(exc),
            )

    async def fetch(
        self, source: Any, decrypted_secret: Optional[str] = None, limit: int = 50
    ) -> FetchResult:
        start = time.perf_counter()
        try:
            url = self._build_url(source)
            SSRFValidator.validate_url(url)
            headers = dict(self.default_headers)
            if getattr(source, "headers_json", None):
                headers.update(source.headers_json)

            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

                if resp.status_code >= 400:
                    return FetchResult(
                        success=False,
                        status_code=resp.status_code,
                        response_time_ms=elapsed_ms,
                        error_message=f"Reddit returned {resp.status_code}",
                    )

                data = resp.json()
                children = data.get("data", {}).get("children", [])
                items: List[StandardRawItem] = []

                for child in children[:limit]:
                    p = child.get("data", {})
                    items.append(
                        StandardRawItem(
                            source_id=getattr(source, "id", None),
                            external_id=str(p.get("id", "")),
                            title=str(p.get("title", "")),
                            content=str(p.get("selftext", "")),
                            summary=str(p.get("selftext", ""))[:200] if p.get("selftext") else None,
                            url=f"https://reddit.com{p.get('permalink', '')}" if p.get("permalink") else p.get("url", ""),
                            author=p.get("author"),
                            tags=[p.get("link_flair_text")] if p.get("link_flair_text") else [],
                            extra_metadata={
                                "ups": p.get("ups"),
                                "num_comments": p.get("num_comments"),
                            },
                        )
                    )

                return FetchResult(
                    success=True,
                    status_code=resp.status_code,
                    response_time_ms=elapsed_ms,
                    items=items,
                    total_found=len(children),
                )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return FetchResult(
                success=False,
                response_time_ms=elapsed_ms,
                error_message=str(exc),
            )

    async def health_check(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> HealthCheckResult:
        start = time.perf_counter()
        try:
            url = self._build_url(source)
            SSRFValidator.validate_url(url)
            headers = dict(self.default_headers)

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
                status = "healthy" if 200 <= resp.status_code < 400 else "down"
                return HealthCheckResult(
                    status=status,
                    response_time_ms=elapsed_ms,
                    status_code=resp.status_code,
                    message=f"HTTP {resp.status_code}",
                )
        except Exception as err:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return HealthCheckResult(
                status="down",
                response_time_ms=elapsed_ms,
                status_code=None,
                message=str(err),
            )
