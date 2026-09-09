import time
from typing import Dict, Any, List, Optional, Tuple
import httpx

from app.connectors.base import ContentSourceConnector
from app.schemas.connector import (
    ConnectorFetchResult,
    TestConnectionResult,
    HealthCheckResult,
    RawContentItem,
    ConnectorWarning,
    ConnectorError,
)
from app.core.ssrf_validator import SSRFValidator, SSRFSecurityException
from app.core.config import settings
from app.core.logging import get_logger
from app.core.http_client import create_async_client

logger = get_logger("connectors.rest_api")


def get_by_path(data: Any, path: Optional[str], default: Any = None) -> Any:
    """Safely traverses nested dictionary or list using dot-notation path.
    e.g. 'data.items' or 'articles.0.title'
    """
    if data is None:
        return default
    if not path or not str(path).strip() or str(path).strip() == "$":
        return data
    curr = data
    parts = str(path).strip().split(".")
    for part in parts:
        if isinstance(curr, dict):
            curr = curr.get(part)
        elif isinstance(curr, list):
            try:
                idx = int(part)
                curr = curr[idx]
            except (ValueError, IndexError):
                return default
        else:
            return default
        if curr is None:
            return default
    return curr


class RestApiConnector(ContentSourceConnector):
    """Production-grade connector for Generic REST and JSON APIs with configurable mapping and pagination."""

    connector_type: str = "REST_API"
    name: str = "Generic REST / JSON API Connector"
    description: str = "Ingests Japanese content from JSON REST APIs with dynamic field mapping and pagination."
    is_production_ready: bool = True
    supported_auth: List[str] = ["none", "api_key", "bearer_token", "basic_auth"]
    required_config_fields: []
    optional_config_fields: [
        "method",
        "query_params",
        "body",
        "response_mapping",
        "pagination",
    ]

    default_capabilities: Dict[str, str] = {
        "hasTitle": "SUPPORTED",
        "hasAuthor": "SUPPORTED",
        "hasPublishedDate": "SUPPORTED",
        "hasFullContent": "SUPPORTED",
        "hasExcerpt": "SUPPORTED",
        "hasImages": "SUPPORTED",
        "hasComments": "UNKNOWN",
        "hasEngagement": "UNKNOWN",
        "supportsSearch": "SUPPORTED",
        "supportsPagination": "SUPPORTED",
        "supportsRealtime": "SUPPORTED",
        "supportsHistoricalQuery": "SUPPORTED",
    }

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "Config must be a dictionary"
        return True, "Valid API configuration"

    def _resolve_url(self, source: Any) -> str:
        url = (
            getattr(source, "api_url", None)
            or getattr(source, "feed_url", None)
            or getattr(source, "base_url", None)
        )
        if not url and isinstance(getattr(source, "config_json", None), dict):
            url = source.config_json.get("url") or source.config_json.get("api_url")
        if not url:
            raise ValueError("No API URL configured for REST API connector.")
        return str(url).strip()

    def _build_request_params(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> Tuple[str, Dict[str, str], Dict[str, Any], Any]:
        config = getattr(source, "config_json", {}) or {}
        method = config.get("method", "GET").upper()
        headers = dict(self.default_headers)
        headers["Accept"] = "application/json"

        # Merge custom headers
        source_headers = getattr(source, "headers_json", None) or {}
        if isinstance(source_headers, dict):
            headers.update(source_headers)

        # Merge auth
        cred = getattr(source, "credential", None)
        if cred and decrypted_secret:
            auth_type = getattr(cred, "auth_type", "none")
            key_name = getattr(cred, "key_name", "Authorization") or "Authorization"
            if auth_type == "bearer_token":
                headers["Authorization"] = f"Bearer {decrypted_secret}"
            elif auth_type == "api_key":
                headers[key_name] = decrypted_secret

        query_params = config.get("query_params", {}) or {}
        body = config.get("body", None)

        return method, headers, query_params, body

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            method, headers, query_params, body = self._build_request_params(source, decrypted_secret)

            async with create_async_client(headers=headers) as client:
                resp = await client.request(
                    method, url, params=query_params, json=body if body else None
                )
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code >= 400:
                    return TestConnectionResult(
                        success=False,
                        connector_type=self.connector_type,
                        status_code=resp.status_code,
                        duration_ms=elapsed_ms,
                        message=f"HTTP Error {resp.status_code}",
                        error_details=resp.text[:400],
                        actionable_fix="Kiểm tra thông tin API key hoặc URL endpoint.",
                    )

                if not (200 <= resp.status_code < 300):
                    return TestConnectionResult(
                        success=False,
                        connector_type=self.connector_type,
                        status_code=resp.status_code,
                        duration_ms=elapsed_ms,
                        message=f"Mã trạng thái HTTP không mong đợi: {resp.status_code}",
                        error_details=resp.text[:300],
                        actionable_fix="Endpoint có thể bị chuyển hướng hoặc từ chối kết nối.",
                    )

                try:
                    data = resp.json()
                except Exception as json_err:
                    return TestConnectionResult(
                        success=False,
                        connector_type=self.connector_type,
                        status_code=resp.status_code,
                        duration_ms=elapsed_ms,
                        message=f"Phản hồi không phải JSON: {json_err}",
                        error_details=resp.text[:300],
                    )

                config = getattr(source, "config_json", {}) or {}
                mapping = config.get("response_mapping", {}) or {}
                items_path = mapping.get("items_path") or config.get("items_path")
                raw_items = get_by_path(data, items_path, data) if items_path else data

                if isinstance(raw_items, dict):
                    raw_items = [raw_items]
                elif not isinstance(raw_items, list):
                    raw_items = []

                preview = [
                    {"keys": list(item.keys()) if isinstance(item, dict) else str(item)}
                    for item in raw_items[:2]
                ]

                return TestConnectionResult(
                    success=True,
                    connector_type=self.connector_type,
                    status_code=resp.status_code,
                    duration_ms=elapsed_ms,
                    message=f"Kết nối API JSON thành công. Trích xuất được {len(raw_items)} phần tử.",
                    sample_items_count=len(raw_items),
                    sample_preview=preview,
                )

        except SSRFSecurityException as ssrf_err:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return TestConnectionResult(
                success=False,
                connector_type=self.connector_type,
                duration_ms=elapsed_ms,
                message=f"Bảo mật SSRF chặn kết nối: {str(ssrf_err)}",
                error_details=str(ssrf_err),
            )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return TestConnectionResult(
                success=False,
                connector_type=self.connector_type,
                duration_ms=elapsed_ms,
                message=f"Lỗi kết nối API: {str(exc)}",
                error_details=str(exc),
            )

    async def fetch(
        self,
        source: Any,
        decrypted_secret: Optional[str] = None,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> ConnectorFetchResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            method, headers, query_params, body = self._build_request_params(source, decrypted_secret)

            config = getattr(source, "config_json", {}) or {}
            pagination = config.get("pagination", {}) or {}
            pag_type = pagination.get("type", "page")

            # Apply cursor/page if requested
            if cursor:
                if pag_type == "cursor":
                    param_name = pagination.get("cursor_param", "cursor")
                    query_params[param_name] = cursor
                elif pag_type == "page":
                    param_name = pagination.get("page_param", "page")
                    query_params[param_name] = cursor

            async with create_async_client(headers=headers) as client:
                resp = await client.request(
                    method, url, params=query_params, json=body if body else None
                )
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code >= 400:
                    return ConnectorFetchResult(
                        success=False,
                        duration_ms=elapsed_ms,
                        errors=[
                            ConnectorError(
                                code="HTTP_ERROR",
                                message=f"API returned HTTP {resp.status_code}",
                                details={"status_code": resp.status_code},
                            )
                        ],
                    )

                if not (200 <= resp.status_code < 300):
                    return ConnectorFetchResult(
                        success=False,
                        duration_ms=elapsed_ms,
                        errors=[
                            ConnectorError(
                                code="UNEXPECTED_STATUS",
                                message=f"API returned unexpected HTTP {resp.status_code}",
                                details={"status_code": resp.status_code},
                            )
                        ],
                    )

                try:
                    data = resp.json()
                except Exception as json_err:
                    return ConnectorFetchResult(
                        success=False,
                        duration_ms=elapsed_ms,
                        errors=[
                            ConnectorError(
                                code="JSON_PARSE_ERROR",
                                message=f"API returned non-JSON response: {json_err}",
                                details={"text_snippet": resp.text[:200]},
                            )
                        ],
                    )
                items, next_cursor, next_page = self._extract_items_from_json(data, source, limit=limit)

                return ConnectorFetchResult(
                    success=True,
                    items=items,
                    fetched_count=len(items),
                    next_cursor=next_cursor,
                    next_page=next_page,
                    duration_ms=elapsed_ms,
                    metadata={"total_found": len(items)},
                )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return ConnectorFetchResult(
                success=False,
                duration_ms=elapsed_ms,
                errors=[ConnectorError(code="FETCH_ERROR", message=str(exc))],
            )

    def _extract_items_from_json(
        self, data: Any, source: Any, limit: int = 50
    ) -> Tuple[List[RawContentItem], Optional[str], Optional[str]]:
        config = getattr(source, "config_json", {}) or {}
        mapping = config.get("response_mapping", {}) or {}
        items_path = mapping.get("items_path") or config.get("items_path")
        title_path = mapping.get("title_path") or config.get("title_path", "title")
        content_path = mapping.get("content_path") or config.get("content_path", "content")
        excerpt_path = mapping.get("excerpt_path") or config.get("excerpt_path", "excerpt")
        url_path = mapping.get("url_path") or config.get("url_path", "url")
        pub_date_path = mapping.get("published_at_path") or config.get("published_at_path", "published_at")
        author_path = mapping.get("author_path") or config.get("author_path", "author")
        image_path = mapping.get("image_path") or config.get("image_path", "image_url")
        id_path = mapping.get("id_path") or config.get("id_path", "id")

        raw_items = get_by_path(data, items_path, data) if items_path else data
        if isinstance(raw_items, dict):
            raw_items = [raw_items]
        elif not isinstance(raw_items, list):
            raw_items = []

        source_url = getattr(source, "feed_url", "") or getattr(source, "base_url", "")
        items: List[RawContentItem] = []
        for entry in raw_items[:limit]:
            if isinstance(entry, dict):
                items.append(
                    RawContentItem(
                        external_id=str(get_by_path(entry, id_path, "")),
                        title=str(get_by_path(entry, title_path, "Untitled")),
                        content=str(get_by_path(entry, content_path, "")),
                        excerpt=str(get_by_path(entry, excerpt_path, ""))[:300] if get_by_path(entry, excerpt_path) else None,
                        url=str(get_by_path(entry, url_path, source_url)),
                        author=get_by_path(entry, author_path),
                        published_at=str(get_by_path(entry, pub_date_path, "")) if get_by_path(entry, pub_date_path) else None,
                        image_url=get_by_path(entry, image_path),
                        language="ja",
                        source_metadata=entry,
                    )
                )

        pagination = config.get("pagination", {}) or {}
        next_cursor = None
        next_cursor_path = pagination.get("next_cursor_path") or config.get("next_cursor_path")
        if next_cursor_path:
            next_cursor = str(get_by_path(data, next_cursor_path, ""))

        next_page = None
        next_page_path = pagination.get("next_page_path") or config.get("next_page_path")
        if next_page_path:
            next_page = str(get_by_path(data, next_page_path, ""))

        return items, next_cursor, next_page

    async def health_check(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> HealthCheckResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            method, headers, query_params, _ = self._build_request_params(source, decrypted_secret)

            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.request(method, url, headers=headers, params=query_params)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                status = "HEALTHY" if 200 <= resp.status_code < 400 else "ERROR"
                return HealthCheckResult(
                    status=status,
                    duration_ms=elapsed_ms,
                    status_code=resp.status_code,
                    message=f"HTTP {resp.status_code}",
                    timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
                )
        except Exception as err:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return HealthCheckResult(
                status="ERROR",
                duration_ms=elapsed_ms,
                status_code=None,
                message=str(err),
                timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
            )
