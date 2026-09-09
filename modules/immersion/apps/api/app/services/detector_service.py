import re
import time
from urllib.parse import urlparse, urljoin
from typing import Optional, Dict, Any, List
import httpx

from app.core.ssrf_validator import SSRFValidator, SSRFSecurityException
from app.core.config import settings
from app.schemas.connector import AutoDetectResponse, AutoDetectFeedItem
from app.core.logging import get_logger

from app.core.http_client import create_async_client

logger = get_logger("services.detector")


class AutoDetectService:
    """Smart source capability discovery from user-provided URLs."""

    COMMON_FEED_PATHS = ["/rss", "/feed", "/rss.xml", "/atom.xml", "/index.xml"]

    @classmethod
    async def detect_from_url(
        cls, raw_url: str, headers: Optional[Dict[str, str]] = None
    ) -> AutoDetectResponse:
        """Probes destination URL to discover RSS, Atom, Sitemap, JSON, and Web capabilities."""
        if not raw_url or not isinstance(raw_url, str):
            raise ValueError("Vui lòng cung cấp một URL hợp lệ.")

        target_url = raw_url.strip()
        if not target_url.startswith("http://") and not target_url.startswith("https://"):
            target_url = "https://" + target_url

        # 1. SSRF Safety
        SSRFValidator.validate_url(target_url)

        response = AutoDetectResponse(url=target_url)

        try:
            async with create_async_client(timeout=8.0, headers=headers) as client:
                res = await client.get(target_url)

                if res.status_code >= 400:
                    response.recommended_connector = "WEB"
                    return response

                content_type = res.headers.get("content-type", "").lower()
                text = res.text

                # Check if target URL itself is already a feed
                if "application/rss+xml" in content_type or "<rss" in text[:300]:
                    response.rss_detected = True
                    response.detected_feeds.append(
                        AutoDetectFeedItem(title="Primary RSS Feed", url=target_url, feed_type="RSS")
                    )
                    response.recommended_connector = "RSS"
                    return response

                if "application/atom+xml" in content_type or "<feed" in text[:300]:
                    response.atom_detected = True
                    response.detected_feeds.append(
                        AutoDetectFeedItem(title="Primary Atom Feed", url=target_url, feed_type="ATOM")
                    )
                    response.recommended_connector = "ATOM"
                    return response

                if "application/json" in content_type:
                    response.json_api_detected = True
                    response.recommended_connector = "REST_API"
                    return response

                # Otherwise target is a Web Page (HTML)
                response.website_detected = True
                cls._extract_html_meta(text, target_url, response)

                # Scan HTML <link rel="alternate"> for feeds
                feed_matches = re.findall(
                    r'<link[^>]+rel=["\']alternate["\'][^>]*>', text, re.IGNORECASE
                )
                for link_tag in feed_matches:
                    href_m = re.search(r'href=["\']([^"\']+)["\']', link_tag, re.IGNORECASE)
                    type_m = re.search(r'type=["\']([^"\']+)["\']', link_tag, re.IGNORECASE)
                    title_m = re.search(r'title=["\']([^"\']+)["\']', link_tag, re.IGNORECASE)

                    if href_m:
                        feed_href = urljoin(target_url, href_m.group(1).strip())
                        feed_type_str = type_m.group(1).lower() if type_m else ""
                        feed_title = title_m.group(1).strip() if title_m else "Feed"

                        if "rss" in feed_type_str or "xml" in feed_type_str:
                            response.rss_detected = True
                            response.detected_feeds.append(
                                AutoDetectFeedItem(title=feed_title, url=feed_href, feed_type="RSS")
                            )
                        elif "atom" in feed_type_str:
                            response.atom_detected = True
                            response.detected_feeds.append(
                                AutoDetectFeedItem(title=feed_title, url=feed_href, feed_type="ATOM")
                            )

                # Check Sitemap
                sitemap_url = urljoin(target_url, "/sitemap.xml")
                try:
                    sm_res = await client.head(sitemap_url, timeout=3.0)
                    if sm_res.status_code == 200:
                        response.sitemap_detected = True
                        response.detected_sitemaps.append(sitemap_url)
                except Exception:
                    pass

                # If no feeds in HTML, probe common feed endpoints
                if not response.rss_detected and not response.atom_detected:
                    for path in cls.COMMON_FEED_PATHS[:3]:
                        probe_url = urljoin(target_url, path)
                        try:
                            probe_res = await client.get(probe_url, timeout=3.0)
                            if probe_res.status_code == 200:
                                probe_text = probe_res.text[:300].lower()
                                if "<rss" in probe_text:
                                    response.rss_detected = True
                                    response.detected_feeds.append(
                                        AutoDetectFeedItem(
                                            title=f"Discovered Feed ({path})",
                                            url=probe_url,
                                            feed_type="RSS",
                                        )
                                    )
                                    break
                                elif "<feed" in probe_text:
                                    response.atom_detected = True
                                    response.detected_feeds.append(
                                        AutoDetectFeedItem(
                                            title=f"Discovered Atom ({path})",
                                            url=probe_url,
                                            feed_type="ATOM",
                                        )
                                    )
                                    break
                        except Exception:
                            continue

        except SSRFSecurityException:
            raise
        except Exception as exc:
            logger.warning(f"Auto-detect failed for {target_url}: {exc}")

        # Determine recommended connector
        if response.rss_detected:
            response.recommended_connector = "RSS"
        elif response.atom_detected:
            response.recommended_connector = "ATOM"
        elif response.sitemap_detected:
            response.recommended_connector = "SITEMAP"
        else:
            response.recommended_connector = "WEB"

        # Auto-suggest learning roles & categories from domain
        cls._suggest_roles_and_categories(target_url, response)

        return response

    @classmethod
    def _extract_html_meta(cls, text: str, url: str, response: AutoDetectResponse) -> None:
        title_m = re.search(r"<title[^>]*>(.*?)</title>", text, re.IGNORECASE | re.DOTALL)
        if title_m:
            response.site_title = title_m.group(1).strip()

        og_desc = re.search(
            r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
            text,
            re.IGNORECASE,
        )
        meta_desc = re.search(
            r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
            text,
            re.IGNORECASE,
        )
        response.site_description = (
            og_desc.group(1).strip()
            if og_desc
            else (meta_desc.group(1).strip() if meta_desc else None)
        )

        canon = re.search(
            r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', text, re.IGNORECASE
        )
        if canon:
            response.canonical_url = canon.group(1).strip()

        icon_m = re.search(
            r'<link[^>]+rel=["\'](?:shortcut )?icon["\'][^>]+href=["\']([^"\']+)["\']',
            text,
            re.IGNORECASE,
        )
        if icon_m:
            response.site_icon = urljoin(url, icon_m.group(1).strip())

    @classmethod
    def _suggest_roles_and_categories(cls, url: str, response: AutoDetectResponse) -> None:
        lowered = (url + " " + (response.site_title or "")).lower()

        roles = []
        categories = []

        if any(w in lowered for w in ["news", "nhk", "asahi", "mainichi", "yomiuri"]):
            roles.extend(["FORMAL", "NEWS"])
            categories.extend(["Politics", "Society", "Economy"])
        if any(w in lowered for w in ["qiita", "zenn", "dev", "tech", "github", "hatena"]):
            roles.extend(["TECHNICAL", "BUSINESS"])
            categories.extend(["Technology", "AI"])
        if any(w in lowered for w in ["reddit", "twitter", "threads", "sns", "community"]):
            roles.extend(["CASUAL", "INTERNET"])
            categories.extend(["Culture", "Lifestyle"])
        if any(w in lowered for w in ["travel", "matcha", "tabelog", "food", "ramen"]):
            roles.extend(["LIFESTYLE", "CULTURE"])
            categories.extend(["Travel", "Food"])

        if not roles:
            roles = ["FORMAL"]
        if not categories:
            categories = ["Culture"]

        response.suggested_learning_roles = list(set(roles))
        response.suggested_categories = list(set(categories))
