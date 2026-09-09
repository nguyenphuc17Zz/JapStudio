import pytest
from unittest.mock import AsyncMock, patch

from app.services.browser_fetcher import (
    fetch_html_best_effort,
    browser_mode_for_config,
    is_browser_allowed,
)

WALL_HTML = "<html><head><title>Access Check</title></head><body><p>wait</p></body></html>"
# 'Access Check' is not in patterns; use a real one:
WALL_HTML_JP = (
    "<html><head><title>アクセス確認</title></head><body><p>shibaraku</p>"
    "<!-- padding to pass length guard 0123456789 0123456789 0123456789 "
    "0123456789 0123456789 0123456789 0123456789 0123456789 0123456789 --></body></html>"
)
GOOD_HTML = (
    "<html><head><title>Normal Article Title Here</title>"
    '<meta property="og:title" content="Normal Article Title Here" /></head>'
    "<body><main><article><p>"
    + "本文テキストがここに続きます。" * 40
    + "</p></article></main></body></html>"
)


def test_browser_mode_defaults_and_parsing():
    assert browser_mode_for_config(None) == "auto"
    assert browser_mode_for_config({}) == "auto"
    assert browser_mode_for_config({"extraction_mode": "browser"}) == "browser"
    assert browser_mode_for_config({"extraction_mode": "http"}) == "http"
    assert browser_mode_for_config({"extraction_mode": "nonsense"}) == "auto"


@pytest.mark.asyncio
async def test_mode_http_never_touches_browser():
    async def fake_http(url):
        return (200, GOOD_HTML)

    with patch(
        "app.services.browser_fetcher.browser_fetcher.fetch_html",
        new_callable=AsyncMock,
        side_effect=AssertionError("browser must not be called in http mode"),
    ):
        html, via = await fetch_html_best_effort(
            "https://example.com/a", fake_http, config={"extraction_mode": "http"}
        )
    assert via == "http"
    assert html == GOOD_HTML


@pytest.mark.asyncio
async def test_auto_uses_direct_when_clean():
    async def fake_http(url):
        return (200, GOOD_HTML)

    with patch(
        "app.services.browser_fetcher.browser_fetcher.fetch_html",
        new_callable=AsyncMock,
        side_effect=AssertionError("browser must not be called for clean pages"),
    ):
        html, via = await fetch_html_best_effort("https://example.com/a", fake_http, config={})
    assert via == "http"
    assert html == GOOD_HTML


@pytest.mark.asyncio
async def test_auto_falls_back_to_browser_on_wall():
    async def fake_http(url):
        return (200, WALL_HTML_JP)

    async def fake_browser(url, headers=None, config=None):
        return GOOD_HTML

    with patch(
        "app.services.browser_fetcher.browser_fetcher.fetch_html", side_effect=fake_browser
    ):
        html, via = await fetch_html_best_effort("https://example.com/a", fake_http, config={})
    assert via == "browser"
    assert html == GOOD_HTML


@pytest.mark.asyncio
async def test_auto_returns_wall_direct_when_browser_unavailable():
    async def fake_http(url):
        return (200, WALL_HTML_JP)

    with patch("app.services.browser_fetcher.BROWSER_AVAILABLE", False):
        assert is_browser_allowed({}) is False
        html, via = await fetch_html_best_effort("https://example.com/a", fake_http, config={})
    assert via == "http"
    assert html == WALL_HTML_JP
