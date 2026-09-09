import time
import re
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
import httpx
import lxml.html
import xml.etree.ElementTree as ET

from app.connectors.base import ContentSourceConnector
from app.services.article_extractor import ArticleExtractor
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
from app.services.browser_fetcher import fetch_html_best_effort

logger = get_logger("connectors.web")


def _make_http_get(client: httpx.AsyncClient, timeout: float = 10.0):
    """Builds an SSRF-guarded http_get closure for the tiered fetch chain."""

    async def _get(url: str):
        try:
            SSRFValidator.validate_url(url)
        except Exception:
            return None
        try:
            r = await client.get(url, timeout=timeout)
            return (r.status_code, r.text)
        except Exception:
            return None

    return _get


class WebConnector(ContentSourceConnector):
    """Generic Web Source Abstraction with SSRF protection, content-type verification, and metadata discovery."""

    connector_type: str = "WEB"
    name: str = "Generic Web Connector"
    description: str = "Ingests Japanese articles, blogs, and public web pages via standard HTTP web extraction."
    is_production_ready: bool = True
    supported_auth: List[str] = ["none", "basic_auth", "bearer_token"]
    required_config_fields: []
    optional_config_fields: [
        "extraction_mode",
        "title_selector",
        "content_selector",
        "author_selector",
    ]

    default_capabilities: Dict[str, str] = {
        "hasTitle": "SUPPORTED",
        "hasAuthor": "UNKNOWN",
        "hasPublishedDate": "UNKNOWN",
        "hasFullContent": "SUPPORTED",
        "hasExcerpt": "SUPPORTED",
        "hasImages": "SUPPORTED",
        "hasComments": "UNSUPPORTED",
        "hasEngagement": "UNSUPPORTED",
        "supportsSearch": "UNSUPPORTED",
        "supportsPagination": "UNSUPPORTED",
        "supportsRealtime": "UNSUPPORTED",
        "supportsHistoricalQuery": "UNSUPPORTED",
    }

    def validate_config(
        self, config: Dict[str, Any], headers: Dict[str, str]
    ) -> Tuple[bool, str]:
        if not isinstance(config, dict):
            return False, "Config must be a dictionary"
        return True, "Valid Web connector configuration"

    def _resolve_url(self, source: Any) -> str:
        url = getattr(source, "base_url", None) or getattr(source, "feed_url", None)
        if not url and isinstance(getattr(source, "config_json", None), dict):
            url = source.config_json.get("url") or source.config_json.get("base_url")
        if not url:
            raise ValueError("No URL specified for Web connector.")
        return str(url).strip()

    def _extract_html_metadata(self, html_text: str, page_url: str) -> Dict[str, Any]:
        """Extracts standard OpenGraph, Twitter, and canonical metadata from HTML markup."""
        meta: Dict[str, Any] = {"url": page_url}

        # Title
        title_match = re.search(r"<title[^>]*>(.*?)</title>", html_text, re.IGNORECASE | re.DOTALL)
        meta["title"] = title_match.group(1).strip() if title_match else page_url

        # OpenGraph Title
        og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        if og_title:
            meta["title"] = og_title.group(1).strip()

        # OpenGraph Description
        og_desc = re.search(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        meta_desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        meta["excerpt"] = (og_desc.group(1) if og_desc else (meta_desc.group(1) if meta_desc else None))

        # OpenGraph Image
        og_img = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        meta["image_url"] = og_img.group(1).strip() if og_img else None

        # Canonical Link
        canonical = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        meta["canonical_url"] = canonical.group(1).strip() if canonical else page_url

        # Author
        author_meta = re.search(r'<meta[^>]+name=["\']author["\'][^>]+content=["\']([^"\']+)["\']', html_text, re.IGNORECASE)
        meta["author"] = author_meta.group(1).strip() if author_meta else None

        # Clean body text excerpt
        body_match = re.search(r"<body[^>]*>(.*?)</body>", html_text, re.IGNORECASE | re.DOTALL)
        raw_body = body_match.group(1) if body_match else html_text
        clean_text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw_body, flags=re.IGNORECASE | re.DOTALL)
        clean_text = re.sub(r"<[^>]+>", " ", clean_text)
        clean_text = " ".join(clean_text.split())
        meta["content"] = clean_text[:5000]
        if not meta["excerpt"]:
            meta["excerpt"] = clean_text[:300]

        return meta

    def _build_request_headers(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> Dict[str, str]:
        headers = dict(self.default_headers)

        # 1. Custom headers from headers_json
        source_headers = getattr(source, "headers_json", None) or {}
        if isinstance(source_headers, dict):
            headers.update(source_headers)

        # 2. Config options: cookie bypass, referer, custom user-agent
        config = getattr(source, "config_json", None) or {}
        if isinstance(config, dict):
            cookie_val = config.get("cookies") or config.get("cookie")
            if cookie_val:
                headers["Cookie"] = (
                    cookie_val if isinstance(cookie_val, str)
                    else "; ".join(f"{k}={v}" for k, v in cookie_val.items())
                )
            referer = config.get("referer") or config.get("referrer")
            if referer:
                headers["Referer"] = referer
            elif "Referer" not in headers:
                headers["Referer"] = "https://www.google.co.jp/"

            custom_ua = config.get("user_agent") or config.get("custom_user_agent")
            if custom_ua:
                headers["User-Agent"] = custom_ua

        # 3. Credential-based cookie or auth token
        cred = getattr(source, "credential", None)
        if cred and decrypted_secret:
            auth_type = getattr(cred, "auth_type", "none")
            key_name = getattr(cred, "key_name", "Authorization") or "Authorization"
            if auth_type == "bearer_token":
                headers["Authorization"] = f"Bearer {decrypted_secret}"
            elif auth_type == "api_key":
                headers[key_name] = decrypted_secret
            elif auth_type == "cookie":
                headers["Cookie"] = decrypted_secret

        return headers

    def _extract_listing_articles(
        self, html_text: str, page_url: str, limit: int = 50
    ) -> List[RawContentItem]:
        """
        Universal Heuristic Article Extractor for news indexes, blogs, and magazine homepages.
        Extracts individual articles, titles, URLs, excerpts, and images using semantic HTML and heuristics.
        """
        items: List[RawContentItem] = []
        seen_urls = set()

        try:
            doc = lxml.html.fromstring(html_text)
        except Exception as e:
            logger.warning(f"Failed to parse HTML with lxml: {e}")
            return items

        # Drop noise tags
        for tag in doc.xpath("//script | //style | //nav | //footer | //header | //aside | //noscript"):
            tag.drop_tree()

        parsed_page_url = urlparse(page_url)
        base_domain = parsed_page_url.netloc

        anchors = doc.xpath("//article//a[@href] | //a[@href]")

        for a in anchors:
            href = (a.get("href") or "").strip()
            if not href or href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:"):
                continue

            full_url = urljoin(page_url, href)
            parsed = urlparse(full_url)

            # Ignore URLs on unrelated domains
            if not (
                parsed.netloc == base_domain
                or parsed.netloc.endswith("." + base_domain)
                or base_domain.endswith("." + parsed.netloc)
            ):
                continue

            # Skip the listing page itself
            if full_url.rstrip("/") == page_url.rstrip("/"):
                continue

            # Skip common non-article paths
            path_lower = parsed.path.lower()
            if any(
                ign in path_lower
                for ign in [
                    "/login", "/signup", "/terms", "/privacy", "/about",
                    "/contact", "/help", "/faq", "/rss", "/feed", "/sitemap",
                    "/cart", "/checkout", "/user", "/account", "/tags", "/category"
                ]
            ):
                continue

            # Title extraction: heading inside <a> (h1..h4), or title attribute, or text_content()
            heading = a.xpath(".//h1 | .//h2 | .//h3 | .//h4 | .//strong")
            if heading:
                title_text = heading[0].text_content().strip()
            else:
                title_text = a.get("title", "").strip() or a.text_content().strip()

            title_text = " ".join(title_text.split())

            # Japanese news titles are usually at least 10-12 characters long
            if len(title_text) < 10:
                continue

            # Avoid duplicate URLs or titles
            if full_url in seen_urls:
                continue
            seen_urls.add(full_url)

            # Excerpt / Description: Look for nearby paragraph or sibling summary
            excerpt = None
            parent = a.getparent()
            if parent is not None:
                p_tags = parent.xpath(".//p | following-sibling::p[1]")
                for p in p_tags:
                    p_text = " ".join(p.text_content().split())
                    if len(p_text) > 15 and p_text != title_text:
                        excerpt = p_text[:400]
                        break

            # Image extraction
            image_url = None
            img_nodes = a.xpath(".//img | following-sibling::*//img | preceding-sibling::*//img")
            if not img_nodes and parent is not None:
                img_nodes = parent.xpath(".//img")
            for img in img_nodes:
                src = img.get("src") or img.get("data-src") or img.get("data-original")
                if src and not src.startswith("data:"):
                    image_url = urljoin(page_url, src)
                    break

            # Published Date
            published_at = None
            time_nodes = a.xpath(".//time/@datetime") or (parent.xpath(".//time/@datetime") if parent is not None else [])
            if time_nodes:
                published_at = time_nodes[0].strip()
            else:
                if parent is not None:
                    date_m = re.search(r"(\d{4}[年/\-\.]\d{1,2}[月/\-\.]\d{1,2}(?:日)?)", parent.text_content())
                    if date_m:
                        published_at = date_m.group(1)

            items.append(
                RawContentItem(
                    external_id=full_url,
                    title=title_text,
                    url=full_url,
                    content=excerpt,
                    excerpt=excerpt,
                    image_url=image_url,
                    published_at=published_at,
                    language="ja",
                    metadata={"extracted_by": "universal_web_scraper"},
                )
            )

            if len(items) >= limit:
                break

        return items

    async def _fetch_spa_or_feed_fallback(
        self,
        client: httpx.AsyncClient,
        url: str,
        html_text: str,
        limit: int = 30
    ) -> List[RawContentItem]:
        """Auto-discovers and extracts articles when the page is an SPA (DOM has no articles).
        Checks:
        1. Specialized platform APIs (e.g. Note.com).
        2. HTML <link rel="alternate"> for RSS/Atom.
        3. Probing standard feed paths (/rss, /feed, /atom.xml).
        """
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()

        # 1. Platform-Specific API: Note.com
        if "note.com" in domain or "note.jp" in domain:
            try:
                api_resp = await client.get("https://note.com/api/v3/notes", timeout=8.0)
                if api_resp.status_code == 200:
                    notes_data = api_resp.json().get("data", [])
                    items: List[RawContentItem] = []
                    for n in notes_data[:limit]:
                        name = (n.get("name") or "").strip()
                        key = n.get("key")
                        user_obj = n.get("user") or {}
                        user_urlname = user_obj.get("urlname")
                        if not name or not key or not user_urlname:
                            continue
                        article_url = f"https://note.com/{user_urlname}/n/{key}"
                        author_name = user_obj.get("nickname") or user_urlname
                        excerpt_text = (n.get("description") or n.get("summary") or "").strip()
                        eyecatch = n.get("eyecatch_url") or n.get("thumbnail_external_url")
                        pub_at = n.get("publish_at")
                        items.append(
                            RawContentItem(
                                external_id=key,
                                title=name,
                                url=article_url,
                                excerpt=excerpt_text or None,
                                content=excerpt_text or None,
                                author=author_name,
                                image_url=eyecatch,
                                published_at=pub_at,
                                language="ja",
                                metadata={"extracted_by": "note_platform_api"},
                            )
                        )
                    if items:
                        logger.info(f"SPA Fallback: Extracted {len(items)} articles via Note.com API")
                        return items
            except Exception as note_err:
                logger.warning(f"Note.com API fallback failed: {note_err}")

        # 2. Check HTML <link rel="alternate"> for RSS/Atom
        feed_candidates: List[str] = []
        matches = re.findall(r'<link[^>]+rel=["\']alternate["\'][^>]*>', html_text, re.IGNORECASE)
        for link_tag in matches:
            href_m = re.search(r'href=["\']([^"\']+)["\']', link_tag, re.IGNORECASE)
            type_m = re.search(r'type=["\']([^"\']+)["\']', link_tag, re.IGNORECASE)
            if href_m:
                t = (type_m.group(1).lower() if type_m else "")
                if "rss" in t or "xml" in t or "atom" in t:
                    feed_candidates.append(urljoin(url, href_m.group(1).strip()))

        # 3. If no feed link found, probe common paths
        if not feed_candidates:
            for path in ["/rss", "/feed", "/rss.xml", "/atom.xml"]:
                feed_candidates.append(urljoin(url, path))

        # 4. Probe feed candidates
        for f_url in feed_candidates[:4]:
            try:
                f_resp = await client.get(f_url, timeout=5.0)
                if f_resp.status_code == 200 and ("<rss" in f_resp.text[:400] or "<feed" in f_resp.text[:400]):
                    root = ET.fromstring(f_resp.text)
                    channel = root.find("channel")
                    feed_items: List[RawContentItem] = []
                    if channel is not None:
                        # RSS 2.0
                        for el in channel.findall("item")[:limit]:
                            t = el.findtext("title")
                            l = el.findtext("link")
                            if t and l:
                                desc = (el.findtext("description") or "").strip()
                                guid = el.findtext("guid") or l
                                pub = el.findtext("pubDate")
                                feed_items.append(
                                    RawContentItem(
                                        external_id=guid.strip(),
                                        title=t.strip(),
                                        url=l.strip(),
                                        excerpt=desc[:300] if desc else None,
                                        content=desc if desc else None,
                                        published_at=pub,
                                        language="ja",
                                        metadata={"extracted_by": "spa_feed_discovery"},
                                    )
                                )
                    else:
                        # Atom
                        ns = {"atom": "http://www.w3.org/2005/Atom"}
                        entries = root.findall("atom:entry", ns) or root.findall("entry")
                        for entry in entries[:limit]:
                            t_el = entry.find("atom:title", ns) if entry.find("atom:title", ns) is not None else entry.find("title")
                            link_el = entry.find("atom:link", ns) if entry.find("atom:link", ns) is not None else entry.find("link")
                            id_el = entry.find("atom:id", ns) if entry.find("atom:id", ns) is not None else entry.find("id")
                            if t_el is not None and t_el.text:
                                item_href = link_el.get("href") if link_el is not None else None
                                if item_href:
                                    feed_items.append(
                                        RawContentItem(
                                            external_id=(id_el.text if id_el is not None and id_el.text else item_href).strip(),
                                            title=t_el.text.strip(),
                                            url=item_href.strip(),
                                            language="ja",
                                            metadata={"extracted_by": "spa_atom_discovery"},
                                        )
                                    )
                    if feed_items:
                        logger.info(f"SPA Fallback: Discovered {len(feed_items)} articles via feed {f_url}")
                        return feed_items
            except Exception:
                continue

        return []

    async def _deep_fetch_articles(
        self,
        client: httpx.AsyncClient,
        articles: List[RawContentItem],
        config: Dict[str, Any],
        max_concurrency: int = 5,
    ) -> List[RawContentItem]:
        """Deep-fetches individual article URLs incl. ?page=N multipage merge
        and inline images (hotlink URLs stored in source_metadata)."""
        sem = asyncio.Semaphore(max_concurrency)
        # Separate semaphore for multipage sub-fetches (must NOT reuse `sem`:
        # _fetch_one already holds it, re-acquiring would deadlock).
        sub_sem = asyncio.Semaphore(max_concurrency * 2)

        def _merge_images(item: RawContentItem, extracted) -> None:
            imgs = getattr(extracted, "images", None) or []
            if not imgs:
                return
            try:
                meta = item.source_metadata
                if not isinstance(meta, dict):
                    meta = {}
                    item.source_metadata = meta
                meta["images"] = ArticleExtractor.merge_image_lists(meta.get("images"), imgs)
                meta["pages_fetched"] = getattr(extracted, "pages_fetched", 1)
            except Exception:
                pass

        async def _fetch_html_guarded(url: str) -> Optional[str]:
            async with sub_sem:
                html, _via = await fetch_html_best_effort(
                    url, _make_http_get(client), headers=None, config=config
                )
            return html

        async def _fetch_one(item: RawContentItem) -> RawContentItem:
            if not item.url:
                return item
            try:
                SSRFValidator.validate_url(item.url)
            except Exception as ssrf_err:
                logger.warning(f"SSRF blocked article URL {item.url}: {ssrf_err}")
                return item

            async with sem:
                try:
                    html, _via = await fetch_html_best_effort(
                        item.url, _make_http_get(client), headers=None, config=config
                    )
                    if html:
                        try:
                            extracted = await ArticleExtractor.extract_multipage(
                                html, item.url, _fetch_html_guarded, config=config
                            )
                        except Exception:
                            extracted = ArticleExtractor.extract(html, item.url, config=config)
                        if getattr(extracted, "is_bot_wall", False):
                            # Article URL itself serves a bot wall — flag for the
                            # pipeline to reject instead of persisting junk.
                            try:
                                meta = item.source_metadata
                                if not isinstance(meta, dict):
                                    meta = {}
                                    item.source_metadata = meta
                                meta["bot_wall"] = True
                                meta["wall_reason"] = extracted.wall_reason or "unknown"
                            except Exception:
                                pass
                            return item
                        if extracted.content and len(extracted.content) > len(item.content or ""):
                            item.content = extracted.content
                        if extracted.title and (not item.title or len(extracted.title) > len(item.title)):
                            item.title = extracted.title
                        if extracted.image_url and not item.image_url:
                            item.image_url = extracted.image_url
                        if extracted.author and not item.author:
                            item.author = extracted.author
                        if extracted.excerpt and (not item.excerpt or len(item.excerpt) < len(extracted.excerpt)):
                            item.excerpt = extracted.excerpt
                        _merge_images(item, extracted)
                except Exception as exc:
                    logger.warning(f"Failed to deep-fetch article at {item.url}: {exc}")
            return item

        tasks = [_fetch_one(item) for item in articles]
        fetched_items = await asyncio.gather(*tasks)
        return list(fetched_items)

    async def test_connection(
        self, source: Any, decrypted_secret: Optional[str] = None
    ) -> TestConnectionResult:
        start_time = time.perf_counter()
        try:
            url = self._resolve_url(source)
            SSRFValidator.validate_url(url)
            headers = self._build_request_headers(source, decrypted_secret)

            async with create_async_client(headers=headers) as client:
                resp = await client.get(url)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if resp.status_code >= 400:
                    is_cf = "Just a moment..." in resp.text or "cf-mitigated" in resp.headers
                    fix_hint = (
                        "Trang web yêu cầu Cloudflare JS Challenge. Cấu hình cookie 'cf_clearance' trong config_json['cookie'] để bypass."
                        if is_cf
                        else "Kiểm tra URL hoặc cấu hình access control của trang web."
                    )
                    return TestConnectionResult(
                        success=False,
                        connector_type=self.connector_type,
                        status_code=resp.status_code,
                        duration_ms=elapsed_ms,
                        message=f"HTTP Error {resp.status_code}",
                        error_details=resp.text[:400],
                        actionable_fix=fix_hint,
                    )

                # 0. Bot-wall guard: never treat a challenge page as connectable content
                # (Nikkei アクセス確認 regression: test reported SUCCESS on a wall page).
                _wall_probe = ArticleExtractor.extract(resp.text, url)
                _page_html = resp.text
                _via_browser = False
                if _wall_probe.is_bot_wall:
                    # One browser attempt: if the real browser passes the wall,
                    # report success (ingestion uses the same chain).
                    _src_cfg = getattr(source, "config_json", None) or {}
                    if not isinstance(_src_cfg, dict):
                        _src_cfg = {}
                    _bhtml, _bvia = await fetch_html_best_effort(
                        url,
                        _make_http_get(client),
                        headers=headers,
                        config=_src_cfg,
                    )
                    if _bhtml:
                        _reprobe = ArticleExtractor.extract(_bhtml, url)
                        if not _reprobe.is_bot_wall:
                            _page_html = _bhtml
                            _via_browser = True
                            _wall_probe = _reprobe
                    if _wall_probe.is_bot_wall:
                        return TestConnectionResult(
                            success=False,
                            connector_type=self.connector_type,
                            status_code=resp.status_code,
                            duration_ms=round((time.perf_counter() - start_time) * 1000, 2),
                            message=f"Trang web chặn bot ({_wall_probe.wall_reason}). Không lấy được nội dung thật.",
                            error_details=f"Detected bot-wall: {_wall_probe.wall_reason}. Page title: '{_wall_probe.title}'",
                            actionable_fix=ArticleExtractor.BOT_WALL_FIX_HINT,
                        )

                # 1. Check if this is an article listing page
                articles = self._extract_listing_articles(_page_html, url, limit=5)
                if not articles:
                    articles = await self._fetch_spa_or_feed_fallback(client, url, _page_html, limit=5)

                if articles:
                    preview_items = [
                        {
                            "title": a.title,
                            "url": a.url,
                            "excerpt": a.excerpt,
                            "image_url": a.image_url,
                        }
                        for a in articles[:3]
                    ]
                    _via_note = " (qua trình duyệt thật)" if _via_browser else ""
                    return TestConnectionResult(
                        success=True,
                        connector_type=self.connector_type,
                        status_code=resp.status_code,
                        duration_ms=round((time.perf_counter() - start_time) * 1000, 2),
                        message=f"Kết nối thành công{_via_note}! Đã bóc tách được {len(articles)} bài viết riêng lẻ trên trang.",
                        sample_items_count=len(articles),
                        sample_preview=preview_items,
                    )

                # 2. Fallback to single page metadata
                meta = self._extract_html_metadata(_page_html, url)
                return TestConnectionResult(
                    success=True,
                    connector_type=self.connector_type,
                    status_code=resp.status_code,
                    duration_ms=elapsed_ms,
                    message=f"Trang web phản hồi thành công. Tiêu đề: '{meta.get('title')}'",
                    sample_items_count=1,
                    sample_preview=[meta],
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
                message=f"Lỗi kết nối Web: {str(exc)}",
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
            headers = self._build_request_headers(source, decrypted_secret)

            async with create_async_client(headers=headers) as client:
                source_config_early = getattr(source, "config_json", None) or {}
                if not isinstance(source_config_early, dict):
                    source_config_early = {}
                # Tiered chain: direct httpx -> headless browser (wall-gated).
                listing_html, listing_via = await fetch_html_best_effort(
                    url, _make_http_get(client), headers=headers, config=source_config_early
                )
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                if not listing_html:
                    return ConnectorFetchResult(
                        success=False,
                        duration_ms=elapsed_ms,
                        errors=[ConnectorError(code="HTTP_ERROR", message="Listing page unreachable (direct + browser)")],
                    )
                resp_text = listing_html

                # 0. Bot-wall guard: a walled listing yields only junk nav links —
                # fail fast instead of ingesting 50 fake articles (Nikkei regression).
                _wall_probe = ArticleExtractor.extract(resp_text, url)
                if _wall_probe.is_bot_wall:
                    return ConnectorFetchResult(
                        success=False,
                        duration_ms=elapsed_ms,
                        errors=[
                            ConnectorError(
                                code="BOT_WALL",
                                message=f"Source returned a bot-wall page ({_wall_probe.wall_reason}). {ArticleExtractor.BOT_WALL_FIX_HINT}",
                                details={"wall_reason": _wall_probe.wall_reason or "unknown"},
                                error_type="permanent",
                            )
                        ],
                    )

                # 1. Attempt universal article listing extraction
                articles = self._extract_listing_articles(resp_text, url, limit=limit)
                if not articles:
                    articles = await self._fetch_spa_or_feed_fallback(client, url, resp_text, limit=limit)

                source_config = getattr(source, "config_json", None) or {}
                if not isinstance(source_config, dict):
                    source_config = {}

                if articles:
                    # Deep-fetch genuine article bodies
                    articles = await self._deep_fetch_articles(
                        client=client,
                        articles=articles,
                        config=source_config,
                    )
                    return ConnectorFetchResult(
                        success=True,
                        items=articles,
                        fetched_count=len(articles),
                        duration_ms=elapsed_ms,
                    )

                # 2. Fallback: single page / article extraction via ArticleExtractor
                extracted = ArticleExtractor.extract(resp_text, url, config=source_config)
                if extracted.is_bot_wall:
                    return ConnectorFetchResult(
                        success=False,
                        duration_ms=elapsed_ms,
                        errors=[
                            ConnectorError(
                                code="BOT_WALL",
                                message=f"Source returned a bot-wall page ({extracted.wall_reason}). {ArticleExtractor.BOT_WALL_FIX_HINT}",
                                details={"wall_reason": extracted.wall_reason or "unknown"},
                                error_type="permanent",
                            )
                        ],
                    )
                item = RawContentItem(
                    external_id=url,
                    title=extracted.title or url,
                    url=url,
                    content=extracted.content or extracted.excerpt,
                    excerpt=extracted.excerpt,
                    author=extracted.author,
                    image_url=extracted.image_url,
                    language="ja",
                    metadata={"extracted_by": "article_extractor_single"},
                )

                return ConnectorFetchResult(
                    success=True,
                    items=[item],
                    fetched_count=1,
                    duration_ms=elapsed_ms,
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
            headers = self._build_request_headers(source, decrypted_secret)

            async with create_async_client(timeout=10.0, headers=headers) as client:
                resp = await client.get(url)
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
