import asyncio
import time
from typing import Dict, Any, List, Optional, Tuple
import defusedxml.ElementTree as ET
import httpx

from app.connectors.base import ContentSourceConnector
from app.services.article_extractor import ArticleExtractor
from app.services.normalizer import NormalizationService
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

logger = get_logger("connectors.rss")


class RSSConnector(ContentSourceConnector):
    """Production-grade connector for Japanese RSS 2.0 feeds."""

    connector_type: str = "RSS"
    name: str = "RSS 2.0 Feed Connector"
    description: str = "Ingests Japanese articles, news, and blogs from standard RSS 2.0 XML feeds."
    is_production_ready: bool = True
    supported_auth: List[str] = ["none", "basic_auth", "bearer_token", "api_key"]
    required_config_fields: List[str] = []
    optional_config_fields: List[str] = ["custom_user_agent", "encoding", "timeout_seconds"]

    default_capabilities: Dict[str, str] = {
        "hasTitle": "SUPPORTED",
        "hasAuthor": "SUPPORTED",
        "hasPublishedDate": "SUPPORTED",
        "hasFullContent": "SUPPORTED",
        "hasExcerpt": "SUPPORTED",
        "hasImages": "SUPPORTED",
        "hasComments": "UNSUPPORTED",
        "hasEngagement": "UNSUPPORTED",
        "supportsSearch": "UNSUPPORTED",
        "supportsPagination": "UNSUPPORTED",
        "supportsRealtime": "SUPPORTED",
        "supportsHistoricalQuery": "UNSUPPORTED",
    }

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "config must be a dictionary"
        return True, "Valid RSS configuration"

    def _resolve_target_url(self, source: Any) -> str:
        url = getattr(source, "feed_url", None) or getattr(source, "base_url", None)
        if not url and isinstance(getattr(source, "config_json", None), dict):
            url = source.config_json.get("feed_url") or source.config_json.get("url")
        if not url:
            raise ValueError("No feed_url or base_url specified for RSS source.")
        return str(url).strip()

    def _build_request_headers(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> Dict[str, str]:
        headers = dict(self.default_headers)
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

    def _parse_rss_items(self, xml_text: str) -> List[RawContentItem]:
        items: List[RawContentItem] = []
        try:
            root = ET.fromstring(xml_text.encode("utf-8") if isinstance(xml_text, str) else xml_text)
        except Exception as e:
            logger.warning(f"RSS XML parse error: {e}")
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

        channel = _find_child(root, "channel")
        item_nodes = _find_all_children(channel, "item") if channel is not None else []
        # In RSS 1.0 (RDF), item nodes are direct children of root (<rdf:RDF>), not channel
        if not item_nodes:
            item_nodes = _find_all_children(root, "item")

        for item in item_nodes:
            title_node = _find_child(item, "title")
            link_node = _find_child(item, "link")
            guid_node = _find_child(item, "guid")
            desc_node = _find_child(item, "description")
            pub_date_node = _find_child(item, "pubDate") or _find_child(item, "date")
            author_node = _find_child(item, "author") or _find_child(item, "creator")

            # Content encoded
            content_node = None
            for child in item:
                if _local_tag(child).lower() in ("encoded", "content"):
                    content_node = child
                    break

            # Image/Media detection
            image_url = None
            for child in item:
                tag_low = _local_tag(child).lower()
                if tag_low in ("imageurl", "image") and child.text:
                    image_url = child.text.strip()
                    break
                elif tag_low == "enclosure" and "image" in child.attrib.get("type", ""):
                    image_url = child.attrib.get("url")
                    break
                elif tag_low in ("thumbnail", "content") and "url" in child.attrib:
                    image_url = child.attrib.get("url")
                    break

            title_str = (title_node.text or "").strip() if title_node is not None else "Untitled"
            link_str = (link_node.text or "").strip() if link_node is not None else ""
            guid_str = (guid_node.text or "").strip() if guid_node is not None else link_str
            desc_str = (desc_node.text or "").strip() if desc_node is not None else None
            content_str = (content_node.text or "").strip() if content_node is not None else desc_str
            pub_date_str = (pub_date_node.text or "").strip() if pub_date_node is not None else None
            author_str = (author_node.text or "").strip() if author_node is not None else None

            tags = [cat.text.strip() for cat in (_find_all_children(item, "category") + _find_all_children(item, "subject")) if cat.text]

            # Clean HTML, extract audio, images, and format plain text
            extracted_audio = None
            extracted_images: List[Dict[str, Any]] = []
            if content_str and NormalizationService.has_html_tags(content_str):
                clean_c, cov_img, aud_url, img_list = NormalizationService.clean_html_content(content_str, base_url=link_str)
                content_str = clean_c or content_str
                if cov_img and not image_url:
                    image_url = cov_img
                extracted_audio = aud_url
                extracted_images = img_list

            if desc_str and NormalizationService.has_html_tags(desc_str):
                desc_str = NormalizationService.strip_html_to_plain(desc_str)

            if title_str and NormalizationService.has_html_tags(title_str):
                title_str = NormalizationService.strip_html_to_plain(title_str)

            meta: Dict[str, Any] = {"tags": tags, "guid": guid_str}
            if extracted_audio:
                meta["audio_url"] = extracted_audio
            if extracted_images:
                meta["images"] = extracted_images

            items.append(
                RawContentItem(
                    external_id=guid_str or link_str,
                    title=title_str,
                    url=link_str,
                    content=content_str,
                    excerpt=desc_str[:300] if desc_str else None,
                    author=author_str,
                    published_at=pub_date_str,
                    language="ja",
                    image_url=image_url,
                    source_metadata=meta,
                )
            )

        return items

    def _parse_xml_items(self, xml_content: str, source_id: int = 1) -> List[RawContentItem]:
        """Backwards compatibility helper for parsing RSS or Atom XML."""
        if not xml_content or not xml_content.strip().startswith("<"):
            return []
        try:
            if "<feed" in xml_content[:300]:
                from app.connectors.atom_connector import AtomConnector
                atom_conn = AtomConnector()
                return atom_conn._parse_atom_items(xml_content)
            return self._parse_rss_items(xml_content)
        except Exception:
            return []

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_target_url(source)
            SSRFValidator.validate_url(url)
            headers = self._build_request_headers(source, decrypted_secret)

            async with create_async_client(headers=headers) as client:
                resp = await client.get(url)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code >= 400:
                    return TestConnectionResult(
                        success=False,
                        connector_type=self.connector_type,
                        status_code=resp.status_code,
                        duration_ms=elapsed_ms,
                        message=f"HTTP Error {resp.status_code}: {resp.reason_phrase}",
                        error_details=resp.text[:500],
                        actionable_fix="Kiểm tra lại URL feed và xác thực nếu trang yêu cầu API key.",
                    )

                items = self._parse_rss_items(resp.text)
                preview = [
                    {
                        "title": item.title,
                        "url": item.url,
                        "published_at": item.published_at,
                        "excerpt": item.excerpt,
                    }
                    for item in items[:3]
                ]

                return TestConnectionResult(
                    success=True,
                    connector_type=self.connector_type,
                    status_code=resp.status_code,
                    duration_ms=elapsed_ms,
                    message=f"Kết nối RSS thành công. Tìm thấy {len(items)} bài viết.",
                    sample_items_count=len(items),
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
                actionable_fix="Địa chỉ IP này thuộc mạng nội bộ hoặc private, vui lòng dùng public URL hợp lệ.",
            )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return TestConnectionResult(
                success=False,
                connector_type=self.connector_type,
                duration_ms=elapsed_ms,
                message=f"Lỗi kiểm tra RSS: {str(exc)}",
                error_details=str(exc),
                actionable_fix="Kiểm tra xem máy chủ nguồn có chặn User-Agent hoặc gặp sự cố mạng không.",
            )

    async def _deep_fetch_short_items(
        self,
        client: httpx.AsyncClient,
        items: List[RawContentItem],
        config: Dict[str, Any],
        min_full_chars: int = 2000,
        max_concurrency: int = 5,
    ) -> List[RawContentItem]:
        """Fetches article HTML for RSS items that only carry a short lead."""
        def _plain_len(text: Optional[str]) -> int:
            if not text:
                return 0
            if NormalizationService.has_html_tags(text):
                return len(NormalizationService.strip_html_to_plain(text))
            return len(text)

        targets = [it for it in items if it.url and _plain_len(it.content) < min_full_chars]
        if not targets:
            return items
        sem = asyncio.Semaphore(max_concurrency)

        async def _fetch_html_guarded(url: str) -> Optional[str]:
            try:
                SSRFValidator.validate_url(url)
            except Exception:
                return None
            try:
                async with sem:
                    r = await client.get(url, timeout=10.0)
                if r.status_code == 200 and r.text and len(r.text) > 500:
                    return r.text
            except Exception:
                pass
            return None

        async def _fetch_one(item: RawContentItem) -> None:
            try:
                SSRFValidator.validate_url(item.url)
            except Exception:
                return
            try:
                async with sem:
                    resp = await client.get(item.url, timeout=10.0)
                if resp.status_code != 200:
                    return
                try:
                    extracted = await ArticleExtractor.extract_multipage(
                        resp.text, item.url, _fetch_html_guarded, config=config
                    )
                except Exception:
                    extracted = ArticleExtractor.extract(resp.text, item.url, config=config)
                if extracted.content and _plain_len(extracted.content) > _plain_len(item.content):
                    item.content = extracted.content
                    if extracted.excerpt and not item.excerpt:
                        item.excerpt = extracted.excerpt
                if extracted.title and len(extracted.title) > len(item.title or ""):
                    item.title = extracted.title
                if extracted.image_url and not item.image_url:
                    item.image_url = extracted.image_url
                if extracted.author and not item.author:
                    item.author = extracted.author
                imgs = getattr(extracted, "images", None) or []
                if imgs:
                    meta = item.source_metadata
                    if not isinstance(meta, dict):
                        meta = {}
                        item.source_metadata = meta
                    meta["images"] = ArticleExtractor.merge_image_lists(meta.get("images"), imgs)
                    meta["pages_fetched"] = getattr(extracted, "pages_fetched", 1)
            except Exception as exc:
                logger.debug(f"RSS deep-fetch skipped {item.url}: {exc}")

        await asyncio.gather(*(_fetch_one(it) for it in targets))
        return items

    async def fetch(
        self,
        source: Any,
        decrypted_secret: Optional[str] = None,
        limit: int = 50,
        cursor: Optional[str] = None,
    ) -> ConnectorFetchResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_target_url(source)
            SSRFValidator.validate_url(url)
            headers = self._build_request_headers(source, decrypted_secret)

            async with create_async_client(headers=headers) as client:
                resp = await client.get(url)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code >= 400:
                    return ConnectorFetchResult(
                        success=False,
                        duration_ms=elapsed_ms,
                        errors=[
                            ConnectorError(
                                code="HTTP_ERROR",
                                message=f"Feed returned HTTP {resp.status_code}",
                                details={"status_code": resp.status_code},
                                error_type="permanent" if resp.status_code in (401, 403, 404) else "transient",
                            )
                        ],
                    )

                items = self._parse_rss_items(resp.text)
                items = items[:limit]
                # Deep-fetch full body when feed only carries a short lead.
                # RSS sources (#2/#7/#13/#17) were persisting 200-800 char excerpts.
                try:
                    source_cfg = getattr(source, "config_json", None) or {}
                    if not isinstance(source_cfg, dict):
                        source_cfg = {}
                    items = await self._deep_fetch_short_items(client, items, source_cfg)
                except Exception as deep_err:
                    logger.debug(f"RSS deep-fetch skipped: {deep_err}")
                return ConnectorFetchResult(
                    success=True,
                    items=items,
                    fetched_count=len(items),
                    duration_ms=elapsed_ms,
                    metadata={"total_found": len(items)},
                )
        except SSRFSecurityException as ssrf_err:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return ConnectorFetchResult(
                success=False,
                duration_ms=elapsed_ms,
                errors=[
                    ConnectorError(
                        code="SSRF_BLOCKED",
                        message=str(ssrf_err),
                        error_type="permanent",
                    )
                ],
            )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return ConnectorFetchResult(
                success=False,
                duration_ms=elapsed_ms,
                errors=[
                    ConnectorError(
                        code="FETCH_EXCEPTION",
                        message=str(exc),
                        error_type="transient",
                    )
                ],
            )

    async def health_check(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> HealthCheckResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_target_url(source)
            SSRFValidator.validate_url(url)
            headers = self._build_request_headers(source, decrypted_secret)

            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if 200 <= resp.status_code < 400:
                    status = "HEALTHY" if elapsed_ms < 2000 else "WARNING"
                    return HealthCheckResult(
                        status=status,
                        duration_ms=elapsed_ms,
                        status_code=resp.status_code,
                        message=f"HTTP {resp.status_code} ({elapsed_ms}ms)",
                        timestamp=time.strftime("%Y-%m-%d %H:%M:%S"),
                    )
                else:
                    return HealthCheckResult(
                        status="ERROR",
                        duration_ms=elapsed_ms,
                        status_code=resp.status_code,
                        message=f"Unhealthy HTTP status: {resp.status_code}",
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
