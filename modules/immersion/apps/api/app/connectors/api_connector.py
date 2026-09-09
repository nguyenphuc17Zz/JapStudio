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

logger = get_logger("connectors.api")


class GenericAPIConnector(ContentSourceConnector):
    """Connector for JSON REST APIs providing Japanese content."""

    source_type: str = "api"
    name: str = "REST API Connector"
    description: str = "Ingests Japanese articles or posts from RESTful JSON endpoints."
    supported_auth: List[str] = ["none", "api_key", "bearer_token", "basic_auth"]
    required_config_fields: List[str] = ["endpoint_url"]
    optional_config_fields: List[str] = ["items_path", "title_field", "content_field", "url_field"]

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "Config must be a dictionary"
        endpoint = config.get("endpoint_url")
        if not endpoint and not config.get("base_url"):
            return False, "Configuration requires 'endpoint_url' or 'base_url'"
        return True, "Valid API configuration"

    def _resolve_url(self, source: Any) -> str:
        if getattr(source, "feed_url", None):
            return str(source.feed_url).strip()
        if getattr(source, "base_url", None):
            return str(source.base_url).strip()
        config = getattr(source, "config_json", {}) or {}
        url = config.get("endpoint_url") or config.get("base_url")
        if not url:
            raise ValueError("No endpoint URL configured.")
        return str(url).strip()

    def _build_headers(self, source: Any, decrypted_secret: Optional[str] = None) -> Dict[str, str]:
        headers = dict(self.default_headers)
        headers["Accept"] = "application/json"
        source_headers = getattr(source, "headers_json", None) or {}
        if isinstance(source_headers, dict):
            headers.update(source_headers)

        cred = getattr(source, "credential", None)
        if cred and decrypted_secret:
            auth_type = getattr(cred, "auth_type", "none")
            key_name = getattr(cred, "key_name", "Authorization") or "Authorization"
            if auth_type == "bearer_token":
                headers["Authorization"] = f"Bearer {decrypted_secret}"
            elif auth_type == "api_key":
                headers[key_name] = decrypted_secret
        return headers

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            headers = self._build_headers(source, decrypted_secret)

            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

                if resp.status_code >= 400:
                    return TestConnectionResult(
                        success=False,
                        status_code=resp.status_code,
                        response_time_ms=elapsed_ms,
                        message=f"HTTP Error {resp.status_code}",
                        error_details=resp.text[:400],
                    )

                data = resp.json()
                items_count = len(data) if isinstance(data, list) else (len(data.get("items", [])) if isinstance(data, dict) else 1)
                
                return TestConnectionResult(
                    success=True,
                    status_code=resp.status_code,
                    response_time_ms=elapsed_ms,
                    message=f"Connection successful. Received JSON response ({items_count} items).",
                    sample_items_count=items_count,
                    sample_preview=[{"keys": list(data.keys()) if isinstance(data, dict) else "list"}],
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
                message=f"Connection failed: {str(exc)}",
                error_details=str(exc),
            )

    async def fetch(
        self, source: Any, decrypted_secret: Optional[str] = None, limit: int = 50
    ) -> FetchResult:
        start = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            headers = self._build_headers(source, decrypted_secret)

            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

                if resp.status_code >= 400:
                    return FetchResult(
                        success=False,
                        status_code=resp.status_code,
                        response_time_ms=elapsed_ms,
                        error_message=f"HTTP {resp.status_code}",
                    )

                data = resp.json()
                raw_items = data if isinstance(data, list) else (data.get("items", []) if isinstance(data, dict) else [data])
                
                config = getattr(source, "config_json", {}) or {}
                title_key = config.get("title_field", "title")
                content_key = config.get("content_field", "content")
                url_key = config.get("url_field", "url")

                items: List[StandardRawItem] = []
                for entry in raw_items[:limit]:
                    if isinstance(entry, dict):
                        items.append(
                            StandardRawItem(
                                source_id=getattr(source, "id", None),
                                external_id=str(entry.get("id", entry.get(url_key, ""))),
                                title=str(entry.get(title_key, entry.get("name", "Untitled"))),
                                content=str(entry.get(content_key, entry.get("body", ""))),
                                url=str(entry.get(url_key, url)),
                                extra_metadata=entry,
                            )
                        )

                return FetchResult(
                    success=True,
                    status_code=resp.status_code,
                    response_time_ms=elapsed_ms,
                    items=items,
                    total_found=len(raw_items),
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
            headers = self._build_headers(source, decrypted_secret)

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
