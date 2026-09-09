import time
import re
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

logger = get_logger("connectors.html")


class HTMLScraperConnector(ContentSourceConnector):
    """Connector for scraping Japanese websites and blogs directly via HTML."""

    source_type: str = "html"
    name: str = "Web / HTML Scraper"
    description: str = "Scrapes Japanese articles and blog posts directly from web pages."
    supported_auth: List[str] = ["none", "basic_auth", "bearer_token"]
    required_config_fields: []
    optional_config_fields: List[str] = ["article_selector", "title_selector", "link_selector"]

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "Config must be a dictionary"
        return True, "Valid HTML scraper configuration"

    def _resolve_url(self, source: Any) -> str:
        url = getattr(source, "base_url", None) or getattr(source, "feed_url", None)
        if not url and isinstance(getattr(source, "config_json", None), dict):
            url = source.config_json.get("url") or source.config_json.get("base_url")
        if not url:
            raise ValueError("No base_url or url specified for HTML scraper.")
        return str(url).strip()

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            headers = dict(self.default_headers)
            if getattr(source, "headers_json", None):
                headers.update(source.headers_json)

            async with httpx.AsyncClient(
                timeout=settings.REQUEST_TIMEOUT_SECONDS, follow_redirects=True
            ) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

                if resp.status_code >= 400:
                    return TestConnectionResult(
                        success=False,
                        status_code=resp.status_code,
                        response_time_ms=elapsed_ms,
                        message=f"HTTP Error {resp.status_code}",
                        error_details=resp.text[:300],
                    )

                # Extract page title using regex
                title_match = re.search(r"<title>(.*?)</title>", resp.text, re.IGNORECASE | re.DOTALL)
                page_title = title_match.group(1).strip() if title_match else "No <title> found"

                return TestConnectionResult(
                    success=True,
                    status_code=resp.status_code,
                    response_time_ms=elapsed_ms,
                    message=f"Web page reached successfully. Title: '{page_title}'",
                    sample_items_count=1,
                    sample_preview=[{"page_title": page_title, "length": len(resp.text)}],
                )
        except SSRFSecurityException as ssrf_err:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return TestConnectionResult(
                success=False,
                status_code=None,
                response_time_ms=elapsed_ms,
                message=f"Security Blocked (SSRF): {str(ssrf_err)}",
                error_details=str(ssrf_err),
            )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            return TestConnectionResult(
                success=False,
                status_code=None,
                response_time_ms=elapsed_ms,
                message=f"HTML connection failed: {str(exc)}",
                error_details=str(exc),
            )

    async def fetch(
        self, source: Any, decrypted_secret: Optional[str] = None, limit: int = 50
    ) -> FetchResult:
        start = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            headers = dict(self.default_headers)
            if getattr(source, "headers_json", None):
                headers.update(source.headers_json)

            async with httpx.AsyncClient(
                timeout=settings.REQUEST_TIMEOUT_SECONDS, follow_redirects=True
            ) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

                title_match = re.search(r"<title>(.*?)</title>", resp.text, re.IGNORECASE | re.DOTALL)
                page_title = title_match.group(1).strip() if title_match else url

                # Simple clean text excerpt
                clean_text = re.sub(r"<[^>]+>", " ", resp.text)
                clean_text = " ".join(clean_text.split())

                item = StandardRawItem(
                    source_id=getattr(source, "id", None),
                    external_id=url,
                    title=page_title,
                    content=clean_text[:5000],
                    summary=clean_text[:300],
                    url=url,
                )

                return FetchResult(
                    success=True,
                    status_code=resp.status_code,
                    response_time_ms=elapsed_ms,
                    items=[item],
                    total_found=1,
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
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            headers = dict(self.default_headers)

            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
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
