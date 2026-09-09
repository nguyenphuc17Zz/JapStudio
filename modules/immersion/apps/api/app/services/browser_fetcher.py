import asyncio
from typing import Dict, Any, Optional, Tuple, Callable, Awaitable

from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger("services.browser_fetcher")

try:
    from playwright.async_api import async_playwright  # type: ignore

    _PLAYWRIGHT_IMPORTABLE = True
except Exception:
    async_playwright = None  # type: ignore
    _PLAYWRIGHT_IMPORTABLE = False

BROWSER_AVAILABLE = _PLAYWRIGHT_IMPORTABLE

_DESKTOP_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

_STEALTH_INIT_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = window.chrome || { runtime: {} };
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP', 'ja', 'en-US', 'en'] });
"""


def browser_mode_for_config(config: Optional[Dict[str, Any]]) -> str:
    """Returns 'auto' | 'http' | 'browser' for a source config."""
    try:
        mode = ((config or {}).get("extraction_mode") or "auto").strip().lower()
    except Exception:
        return "auto"
    return mode if mode in ("auto", "http", "browser") else "auto"


def is_browser_allowed(config: Optional[Dict[str, Any]]) -> bool:
    """Global kill-switch + availability + per-source opt-out."""
    if not settings.EXTRACTION_BROWSER_ENABLED:
        return False
    if not BROWSER_AVAILABLE:
        return False
    return browser_mode_for_config(config) in ("auto", "browser")


class BrowserFetcher:
    """Tier-2 extraction: renders JS/bot-wall pages with headless Chromium.

    Used ONLY as a fallback when direct httpx HTML is a bot wall (mode=auto),
    or for every page when a source opts in via config extraction_mode=browser.
    Callers MUST SSRF-validate URLs before calling (browser has no SSRF guard).
    Nothing is downloaded to disk — rendered HTML is parsed in memory only.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BrowserFetcher, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._playwright = None
        self._browser = None
        self._lock = asyncio.Lock()
        self._sem = asyncio.Semaphore(max(1, settings.BROWSER_MAX_CONCURRENCY))
        self._initialized = True

    @classmethod
    def get_instance(cls) -> "BrowserFetcher":
        return cls()

    async def _ensure_browser(self):
        if self._browser is not None:
            return self._browser
        async with self._lock:
            if self._browser is not None:
                return self._browser
            if not BROWSER_AVAILABLE:
                raise RuntimeError("Playwright is not installed")
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
            )
            logger.info("BrowserFetcher: Chromium launched")
            return self._browser

    async def fetch_html(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        config: Optional[Dict[str, Any]] = None,
        timeout_s: Optional[float] = None,
    ) -> Optional[str]:
        """Renders a URL in headless Chromium and returns the final HTML."""
        if not is_browser_allowed(config):
            return None
        timeout_ms = int((timeout_s or settings.BROWSER_TIMEOUT_SECONDS) * 1000)
        async with self._sem:
            browser = await self._ensure_browser()
            context = await browser.new_context(
                user_agent=(headers or {}).get("User-Agent", _DESKTOP_UA),
                viewport={"width": 1366, "height": 900},
                locale="ja-JP",
                timezone_id="Asia/Tokyo",
            )
            try:
                await context.add_init_script(_STEALTH_INIT_SCRIPT)
                # Per-source cookies (e.g. cf_clearance pasted from a real browser)
                try:
                    cookies_cfg = (config or {}).get("cookies") or (config or {}).get("cookie")
                    cookie_items = self._parse_cookies(cookies_cfg, url)
                    if cookie_items:
                        await context.add_cookies(cookie_items)
                except Exception as ck_err:
                    logger.debug(f"Browser cookie setup skipped: {ck_err}")

                page = await context.new_page()
                # Block heavy sub-resources (tags stay in DOM for the extractor)
                try:
                    await page.route(
                        "**/*",
                        lambda route: route.abort()
                        if route.request.resource_type in ("image", "media", "font")
                        else route.continue_(),
                    )
                except Exception:
                    pass
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                except Exception as nav_err:
                    logger.debug(f"Browser nav notice for {url}: {nav_err}")
                # Give JS challenges a moment, then wait for article-ish content
                try:
                    await page.wait_for_selector(
                        "article, main, [itemprop='articleBody'], .article-body",
                        timeout=min(timeout_ms, 10000),
                    )
                except Exception:
                    pass
                try:
                    await page.wait_for_timeout(1500)
                except Exception:
                    pass
                html = await page.content()
                if html and len(html) > 500:
                    return html
                return None
            except Exception as e:
                logger.debug(f"Browser fetch failed for {url}: {e}")
                return None
            finally:
                try:
                    await context.close()
                except Exception:
                    pass

    @staticmethod
    def _parse_cookies(cookies_cfg: Any, url: str):
        """Accepts 'k=v; k2=v2' string or {k: v} dict -> playwright cookie list."""
        from urllib.parse import urlparse

        domain = urlparse(url).hostname or ""
        items = []
        pairs: Dict[str, str] = {}
        if isinstance(cookies_cfg, str):
            for part in cookies_cfg.split(";"):
                part = part.strip()
                if "=" in part:
                    k, v = part.split("=", 1)
                    pairs[k.strip()] = v.strip()
        elif isinstance(cookies_cfg, dict):
            pairs = {str(k): str(v) for k, v in cookies_cfg.items()}
        for k, v in pairs.items():
            if k and v:
                items.append({"name": k, "value": v, "domain": domain, "path": "/"})
        return items


browser_fetcher = BrowserFetcher.get_instance()


async def fetch_html_best_effort(
    url: str,
    http_get: Callable[[str], Awaitable[Optional[Tuple[int, str]]]],
    headers: Optional[Dict[str, str]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> Tuple[Optional[str], str]:
    """Tiered chain: direct httpx -> headless browser (wall-gated).

    http_get(url) must SSRF-validate and return (status_code, text) or None.
    Returns (html_or_None, via) where via is 'http' | 'browser' | 'none'.

    - mode=http: direct only, never launches a browser.
    - mode=auto (default): browser only when direct HTML is a bot wall/empty.
    - mode=browser: browser first, direct as fallback.
    The bot-wall re-check on browser HTML is left to the caller (extractor flag).
    """
    from app.services.article_extractor import ArticleExtractor

    async def _direct() -> Optional[str]:
        try:
            res = await http_get(url)
        except Exception:
            return None
        if not res:
            return None
        try:
            status, text = res
        except Exception:
            return None
        if status and status >= 400:
            return None
        if text and len(text) > 200:
            return text
        return None

    async def _browser() -> Optional[str]:
        try:
            return await browser_fetcher.fetch_html(url, headers=headers, config=config)
        except Exception as e:
            logger.debug(f"Browser fallback skipped for {url}: {e}")
            return None

    mode = browser_mode_for_config(config)
    if mode == "browser" and is_browser_allowed(config):
        html = await _browser()
        if html:
            return html, "browser"
        html = await _direct()
        return (html, "http") if html else (None, "none")

    # auto / http: direct first
    html = await _direct()
    if mode == "http" or not is_browser_allowed(config):
        return (html, "http") if html else (None, "none")
    if html:
        try:
            probe = ArticleExtractor.extract(html, url)
            if not probe.is_bot_wall:
                return html, "http"
            logger.info(f"Bot wall via http for {url} ({probe.wall_reason}) — trying browser")
        except Exception:
            return html, "http"
    else:
        logger.info(f"Empty direct response for {url} — trying browser")
    bhtml = await _browser()
    return (bhtml, "browser") if bhtml else ((html, "http") if html else (None, "none"))
