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

logger = get_logger("connectors.atom")


class AtomConnector(ContentSourceConnector):
    """Production-grade connector for Japanese Atom 1.0 feeds."""

    connector_type: str = "ATOM"
    name: str = "Atom 1.0 Feed Connector"
    description: str = "Ingests Japanese articles, technical posts, and blogs from standard Atom XML feeds."
    is_production_ready: bool = True
    supported_auth: List[str] = ["none", "basic_auth", "bearer_token", "api_key"]
    required_config_fields: []
    optional_config_fields: List[str] = ["custom_user_agent", "encoding", "timeout_seconds"]

    default_capabilities: Dict[str, str] = {
        "hasTitle": "SUPPORTED",
        "hasAuthor": "SUPPORTED",
        "hasPublishedDate": "SUPPORTED",
        "hasFullContent": "SUPPORTED",
        "hasExcerpt": "SUPPORTED",
        "hasImages": "UNKNOWN",
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
        return True, "Valid Atom configuration"

    def _resolve_target_url(self, source: Any) -> str:
        url = getattr(source, "feed_url", None) or getattr(source, "base_url", None)
        if not url and isinstance(getattr(source, "config_json", None), dict):
            url = source.config_json.get("feed_url") or source.config_json.get("url")
        if not url:
            raise ValueError("No feed_url or base_url specified for Atom source.")
        return str(url).strip()

    def _build_request_headers(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> Dict[str, str]:
        headers = dict(self.default_headers)
        headers["Accept"] = "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
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

    def _parse_atom_items(self, xml_text: str) -> List[RawContentItem]:
        items: List[RawContentItem] = []
        try:
            root = ET.fromstring(xml_text.encode("utf-8") if isinstance(xml_text, str) else xml_text)
        except Exception as e:
            logger.warning(f"Atom XML parse error: {e}")
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

        for entry in _find_all_children(root, "entry"):
            title_elem = _find_child(entry, "title")
            link_elem = _find_child(entry, "link")
            id_elem = _find_child(entry, "id")
            summary_elem = _find_child(entry, "summary")
            content_elem = _find_child(entry, "content")
            published_elem = _find_child(entry, "published") or _find_child(entry, "updated")
            author_elem = _find_child(entry, "author")
            author_name_elem = _find_child(author_elem, "name") if author_elem is not None else None

            link_url = ""
            if link_elem is not None:
                link_url = link_elem.attrib.get("href") or (link_elem.text or "").strip()

            title_text = (title_elem.text if title_elem is not None else "") or "Untitled"
            content_text = (content_elem.text if content_elem is not None else None) or (
                summary_elem.text if summary_elem is not None else None
            )
            summary_text = summary_elem.text if summary_elem is not None else None
            ext_id = (id_elem.text if id_elem is not None else None) or link_url
            pub_date = (published_elem.text if published_elem is not None else None) or None
            author_name = author_name_elem.text if author_name_elem is not None else None

            # Clean HTML, extract audio, images, and format plain text
            image_url = None
            extracted_audio = None
            extracted_images: List[Dict[str, Any]] = []
            if content_text and NormalizationService.has_html_tags(content_text):
                clean_c, cov_img, aud_url, img_list = NormalizationService.clean_html_content(content_text, base_url=link_url)
                content_text = clean_c or content_text
                image_url = cov_img
                extracted_audio = aud_url
                extracted_images = img_list

            if summary_text and NormalizationService.has_html_tags(summary_text):
                summary_text = NormalizationService.strip_html_to_plain(summary_text)

            if title_text and NormalizationService.has_html_tags(title_text):
                title_text = NormalizationService.strip_html_to_plain(title_text)

            meta: Dict[str, Any] = {}
            if extracted_audio:
                meta["audio_url"] = extracted_audio
            if extracted_images:
                meta["images"] = extracted_images

            items.append(
                RawContentItem(
                    external_id=ext_id,
                    title=title_text.strip(),
                    url=link_url.strip(),
                    content=content_text.strip() if content_text else None,
                    excerpt=summary_text.strip()[:300] if summary_text else None,
                    author=author_name.strip() if author_name else None,
                    published_at=pub_date.strip() if pub_date else None,
                    language="ja",
                    image_url=image_url,
                    source_metadata=meta,
                )
            )

        return items

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
                        actionable_fix="Kiểm tra lại URL Atom feed hoặc quyền truy cập.",
                    )

                items = self._parse_atom_items(resp.text)
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
                    message=f"Kết nối Atom feed thành công. Tìm thấy {len(items)} mục.",
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
            )
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return TestConnectionResult(
                success=False,
                connector_type=self.connector_type,
                duration_ms=elapsed_ms,
                message=f"Lỗi kiểm tra Atom feed: {str(exc)}",
                error_details=str(exc),
            )

    async def _deep_fetch_short_items(
        self,
        client: httpx.AsyncClient,
        items: List[RawContentItem],
        config: Dict[str, Any],
        min_full_chars: int = 2000,
        max_concurrency: int = 5,
    ) -> List[RawContentItem]:
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
                logger.debug(f"Atom deep-fetch skipped {item.url}: {exc}")

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
                                message=f"Atom feed returned HTTP {resp.status_code}",
                                details={"status_code": resp.status_code},
                            )
                        ],
                    )

                items = self._parse_atom_items(resp.text)
                items = items[:limit]
                # Same short-lead problem as RSS: deep-fetch full body + images.
                try:
                    source_cfg = getattr(source, "config_json", None) or {}
                    if not isinstance(source_cfg, dict):
                        source_cfg = {}
                    items = await self._deep_fetch_short_items(client, items, source_cfg)
                except Exception as deep_err:
                    logger.debug(f"Atom deep-fetch skipped: {deep_err}")
                return ConnectorFetchResult(
                    success=True,
                    items=items,
                    fetched_count=len(items),
                    duration_ms=elapsed_ms,
                    metadata={"total_found": len(items)},
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
