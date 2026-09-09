import ssl
from typing import Optional, Dict
import httpx

from app.core.config import settings

# Realistic, production-grade browser headers to prevent WAF / CloudFront / Cloudflare 403 blocks
DEFAULT_BROWSER_HEADERS: Dict[str, str] = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def get_ssl_context() -> ssl.SSLContext:
    """Creates an SSL context with standard OpenSSL DEFAULT ciphers.
    This resolves CloudFront WAF and Akamai TLS fingerprinting blocks (HTTP 403).
    """
    ctx = ssl.create_default_context()
    try:
        ctx.set_ciphers("DEFAULT")
    except Exception:
        pass
    return ctx


def create_async_client(
    timeout: Optional[float] = None,
    headers: Optional[Dict[str, str]] = None,
    follow_redirects: bool = True,
    **kwargs,
) -> httpx.AsyncClient:
    """Factory creating an AsyncClient configured for maximum resilience against bot blockers."""
    merged_headers = dict(DEFAULT_BROWSER_HEADERS)
    if headers:
        merged_headers.update(headers)

    return httpx.AsyncClient(
        verify=get_ssl_context(),
        headers=merged_headers,
        timeout=timeout if timeout is not None else settings.REQUEST_TIMEOUT_SECONDS,
        follow_redirects=follow_redirects,
        **kwargs,
    )
