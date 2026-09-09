import pytest
from unittest.mock import AsyncMock, patch
from httpx import Response

from app.connectors.sitemap_connector import SitemapConnector
from app.connectors.rest_api_connector import RestApiConnector, get_by_path
from app.connectors.registry import ConnectorRegistry
from app.services.detector_service import AutoDetectService
from app.services.fallback_service import FallbackService
from app.models.source import ContentSource
from app.schemas.connector import ConnectorFetchResult, RawContentItem

SAMPLE_SITEMAP_XML = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.jp/news/tech-2026</loc>
    <lastmod>2026-03-20T10:00:00+09:00</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.jp/news/culture-spring</loc>
    <lastmod>2026-03-19T14:30:00+09:00</lastmod>
  </url>
</urlset>
"""

SAMPLE_JSON_API_RESPONSE = {
    "status": "ok",
    "data": {
        "articles": [
            {
                "id": "art_101",
                "headline": "AI技術が日本語学習を変革する",
                "canonical_url": "https://example.jp/articles/101",
                "body": "自然言語処理の進化により、学習者に最適な読解教材がリアルタイムで提供可能になりました。",
                "date_published": "2026-03-20T08:00:00Z",
                "creator": "田中太郎",
            }
        ],
        "pagination": {"next_token": "cursor_xyz"}
    }
}


def test_get_by_path_utility():
    data = {"a": {"b": [{"c": "target"}]}}
    assert get_by_path(data, "a.b.0.c") == "target"
    assert get_by_path(data, "a.b.nonexistent", default="fallback") == "fallback"
    assert get_by_path(data, "") == data


def test_sitemap_xml_parsing():
    connector = SitemapConnector()
    items = connector._parse_sitemap_xml(SAMPLE_SITEMAP_XML)
    assert len(items) == 2
    assert items[0].url == "https://example.jp/news/tech-2026"
    assert items[0].source_metadata["changefreq"] == "daily"
    assert items[0].source_metadata["priority"] == "0.8"
    assert items[1].url == "https://example.jp/news/culture-spring"


def test_rest_api_connector_item_mapping():
    connector = RestApiConnector()
    source = ContentSource(
        name="Test REST API",
        feed_url="https://example.jp/api/v1/articles",
        config_json={
            "items_path": "data.articles",
            "id_path": "id",
            "title_path": "headline",
            "url_path": "canonical_url",
            "content_path": "body",
            "author_path": "creator",
            "published_at_path": "date_published",
            "next_cursor_path": "data.pagination.next_token",
        }
    )
    items, next_cursor, next_page = connector._extract_items_from_json(SAMPLE_JSON_API_RESPONSE, source)
    assert len(items) == 1
    assert items[0].title == "AI技術が日本語学習を変革する"
    assert items[0].external_id == "art_101"
    assert items[0].author == "田中太郎"
    assert next_cursor == "cursor_xyz"


@pytest.mark.asyncio
async def test_auto_detect_html_discovery():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>NHK News Easy - 日本語学習</title>
        <meta name="description" content="やさしい日本語で書かれたニュースサイトです。">
        <link rel="alternate" type="application/rss+xml" title="NHK RSS" href="/rss/feed.xml">
        <link rel="icon" href="/favicon.ico">
    </head>
    <body>
        <h1>NHK News Easy</h1>
    </body>
    </html>
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200,
            text=sample_html,
            headers={"content-type": "text/html"},
            request=AsyncMock(),
        )
        res = await AutoDetectService.detect_from_url("https://www3.nhk.or.jp/news/easy/")
        assert res.recommended_connector == "RSS"
        assert len(res.detected_feeds) >= 1
        assert res.detected_feeds[0].url == "https://www3.nhk.or.jp/rss/feed.xml"
        assert "LEARNER" in res.suggested_learning_roles or "NEWS" in res.suggested_learning_roles


@pytest.mark.asyncio
async def test_fallback_service_graceful_recovery():
    # Setup primary RSS returning empty, fallback WEB returning content
    source = ContentSource(
        name="Fallback Source",
        connector_type="RSS",
        feed_url="https://example.jp/broken-feed.xml",
        base_url="https://example.jp",
        fallback_chain=["WEB"]
    )
    
    with patch.object(
        ConnectorRegistry.get("RSS"), "fetch", new_callable=AsyncMock
    ) as mock_rss_fetch, patch.object(
        ConnectorRegistry.get("WEB"), "fetch", new_callable=AsyncMock
    ) as mock_web_fetch:
        mock_rss_fetch.return_value = ConnectorFetchResult(success=False, duration_ms=50.0, items=[])
        mock_web_fetch.return_value = ConnectorFetchResult(
            success=True,
            duration_ms=120.0,
            items=[RawContentItem(external_id="web_1", title="Recovered Web Page", url="https://example.jp")]
        )
        
        result = await FallbackService.execute_with_fallback(source)
        assert result.success is True
        assert len(result.items) == 1
        assert result.items[0].title == "Recovered Web Page"
        assert any(w.code == "FALLBACK_USED" for w in result.warnings)
