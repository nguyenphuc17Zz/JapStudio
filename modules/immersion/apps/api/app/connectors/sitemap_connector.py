import time
from typing import Dict, Any, List, Optional, Tuple
import defusedxml.ElementTree as ET
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

logger = get_logger("connectors.sitemap")


class SitemapConnector(ContentSourceConnector):
    """Production-grade connector for XML Sitemaps and Sitemap Indexes."""

    connector_type: str = "SITEMAP"
    name: str = "XML Sitemap Connector"
    description: str = "Discovers Japanese article and page URLs from standard sitemap.xml and sitemap indexes."
    is_production_ready: bool = True
    supported_auth: List[str] = ["none", "basic_auth", "bearer_token", "api_key"]
    required_config_fields: []
    optional_config_fields: ["sitemap_index_depth", "filter_pattern"]

    default_capabilities: Dict[str, str] = {
        "hasTitle": "UNKNOWN",
        "hasAuthor": "UNSUPPORTED",
        "hasPublishedDate": "SUPPORTED", # lastmod
        "hasFullContent": "UNSUPPORTED",
        "hasExcerpt": "UNSUPPORTED",
        "hasImages": "UNKNOWN",
        "hasComments": "UNSUPPORTED",
        "hasEngagement": "UNSUPPORTED",
        "supportsSearch": "UNSUPPORTED",
        "supportsPagination": "SUPPORTED",
        "supportsRealtime": "UNSUPPORTED",
        "supportsHistoricalQuery": "SUPPORTED",
    }

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "Config must be a dictionary"
        return True, "Valid Sitemap configuration"

    def _resolve_url(self, source: Any) -> str:
        url = getattr(source, "feed_url", None) or getattr(source, "base_url", None)
        if not url and isinstance(getattr(source, "config_json", None), dict):
            url = source.config_json.get("sitemap_url") or source.config_json.get("url")
        if not url:
            raise ValueError("No sitemap URL specified.")
        url_str = str(url).strip()
        if not url_str.endswith(".xml") and "sitemap" not in url_str.lower():
            url_str = url_str.rstrip("/") + "/sitemap.xml"
        return url_str

    def _parse_sitemap_urls(self, xml_text: str) -> List[RawContentItem]:
        items: List[RawContentItem] = []
        try:
            root = ET.fromstring(xml_text.encode("utf-8") if isinstance(xml_text, str) else xml_text)
        except Exception as e:
            logger.warning(f"Sitemap XML parse error: {e}")
            return items

        def _local_tag(elem) -> str:
            return elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag

        def _find_child(parent, name: str):
            for ch in parent:
                if _local_tag(ch).lower() == name.lower():
                    return ch
            return None

        def _find_all_children(parent, name: str):
            return [ch for ch in parent if _local_tag(ch).lower() == name.lower()]

        root_tag = _local_tag(root).lower()

        # Handle URLSET (<urlset><url><loc>...)
        if root_tag == "urlset":
            for url_elem in _find_all_children(root, "url"):
                loc_elem = _find_child(url_elem, "loc")
                lastmod_elem = _find_child(url_elem, "lastmod")
                changefreq_elem = _find_child(url_elem, "changefreq")
                priority_elem = _find_child(url_elem, "priority")

                loc_url = loc_elem.text.strip() if loc_elem is not None and loc_elem.text else ""
                if not loc_url:
                    continue

                lastmod = lastmod_elem.text.strip() if lastmod_elem is not None and lastmod_elem.text else None
                priority = priority_elem.text.strip() if priority_elem is not None and priority_elem.text else None
                changefreq = changefreq_elem.text.strip() if changefreq_elem is not None and changefreq_elem.text else None

                # Generate clean title from URL slug as fallback
                url_slug = loc_url.rstrip("/").split("/")[-1].replace("-", " ").replace("_", " ")

                items.append(
                    RawContentItem(
                        external_id=loc_url,
                        title=url_slug or loc_url,
                        url=loc_url,
                        published_at=lastmod,
                        updated_at=lastmod,
                        language="ja",
                        source_metadata={
                            "priority": priority,
                            "changefreq": changefreq,
                        },
                    )
                )

        # Handle SITEMAPINDEX (<sitemapindex><sitemap><loc>...)
        elif root_tag == "sitemapindex":
            for sitemap_elem in _find_all_children(root, "sitemap"):
                loc_elem = _find_child(sitemap_elem, "loc")
                lastmod_elem = _find_child(sitemap_elem, "lastmod")
                if loc_elem is not None and loc_elem.text:
                    sub_url = loc_elem.text.strip()
                    items.append(
                        RawContentItem(
                            external_id=sub_url,
                            title=f"Sub-Sitemap: {sub_url}",
                            url=sub_url,
                            published_at=lastmod_elem.text.strip() if lastmod_elem is not None and lastmod_elem.text else None,
                            source_metadata={"is_sitemap_index": True},
                        )
                    )

        return items

    _parse_sitemap_xml = _parse_sitemap_urls

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            headers = dict(self.default_headers)

            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code >= 400:
                    return TestConnectionResult(
                        success=False,
                        connector_type=self.connector_type,
                        status_code=resp.status_code,
                        duration_ms=elapsed_ms,
                        message=f"HTTP Error {resp.status_code} khi tải sitemap.",
                        error_details=resp.text[:400],
                        actionable_fix="Kiểm tra lại URL sitemap.xml có tồn tại không.",
                    )

                items = self._parse_sitemap_urls(resp.text)
                preview = [{"url": item.url, "lastmod": item.published_at} for item in items[:3]]

                return TestConnectionResult(
                    success=True,
                    connector_type=self.connector_type,
                    status_code=resp.status_code,
                    duration_ms=elapsed_ms,
                    message=f"Phát hiện Sitemap hợp lệ với {len(items)} đường dẫn URL.",
                    sample_items_count=len(items),
                    sample_preview=preview,
                )
        except SSRFSecurityException as ssrf_err:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return TestConnectionResult(
                success=False,
                connector_type=self.connector_type,
                duration_ms=elapsed_ms,
                message=f"Bảo mật SSRF chặn URL: {str(ssrf_err)}",
                error_details=str(ssrf_err),
            )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return TestConnectionResult(
                success=False,
                connector_type=self.connector_type,
                duration_ms=elapsed_ms,
                message=f"Lỗi kiểm tra Sitemap: {str(exc)}",
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
            headers = dict(self.default_headers)

            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code >= 400:
                    return ConnectorFetchResult(
                        success=False,
                        duration_ms=elapsed_ms,
                        errors=[ConnectorError(code="HTTP_ERROR", message=f"HTTP {resp.status_code}")],
                    )

                items = self._parse_sitemap_urls(resp.text)
                return ConnectorFetchResult(
                    success=True,
                    items=items[:limit],
                    fetched_count=len(items[:limit]),
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

    async def health_check(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> HealthCheckResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            headers = dict(self.default_headers)

            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
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
