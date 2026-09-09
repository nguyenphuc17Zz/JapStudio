import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, Response


SAMPLE_MOCK_FEED = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>NHK Easy Mock</title>
    <link>https://www3.nhk.or.jp</link>
    <item>
      <title>ニュース1: 富士山の雪</title>
      <link>https://www3.nhk.or.jp/fuji.html</link>
      <guid>fuji_001</guid>
      <description>富士山に初雪が観測されました。</description>
    </item>
  </channel>
</rss>
"""


@pytest.mark.asyncio
async def test_test_connection_and_sync_flow(client: AsyncClient):
    # 1. Create source
    create_resp = await client.post(
        "/api/v1/sources",
        json={
            "name": "Live Test Feed",
            "source_type": "rss",
            "category": "news",
            "feed_url": "https://www3.nhk.or.jp/rss/news.xml",
        },
    )
    assert create_resp.status_code == 201
    source_id = create_resp.json()["id"]

    # 2. Test Connection with mocked httpx GET response
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200,
            text=SAMPLE_MOCK_FEED,
            request=AsyncMock(),
        )

        test_resp = await client.post(f"/api/v1/sources/{source_id}/test")
        assert test_resp.status_code == 200
        test_data = test_resp.json()
        assert test_data["success"] is True
        assert test_data["sample_items_count"] == 1
        assert "富士山" in test_data["sample_preview"][0]["title"]

    # 3. Trigger manual sync
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200,
            text=SAMPLE_MOCK_FEED,
            request=AsyncMock(),
        )

        sync_resp = await client.post(f"/api/v1/sources/{source_id}/sync")
        assert sync_resp.status_code == 200, sync_resp.text
        sync_data = sync_resp.json()
        assert sync_data["success"] is True
        assert sync_data["items_fetched"] == 1
        assert "ニュース1: 富士山の雪" in sync_data["sample_titles"]

    # 4. Verify updated source fields (preview must NOT touch last_sync_at/totals —
    # only real IngestionPipeline jobs persist articles; see President JP regression)
    updated_resp = await client.get(f"/api/v1/sources/{source_id}")
    assert updated_resp.status_code == 200
    updated_data = updated_resp.json()
    assert updated_data["health_status"] == "healthy"
    assert updated_data["items_total_count"] == 0
    assert updated_data["last_synced_at"] is None

    # 5. Check audit logs
    logs_resp = await client.get(f"/api/v1/sources/{source_id}/logs")
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    actions = [l["action"] for l in logs]
    assert "test_connection" in actions
    assert "manual_sync" in actions

    # 6. Background sync must enqueue a real job (President JP regression:
    # preview alone never created canonical_contents, so feed stayed empty)
    bg_resp = await client.post(f"/api/v1/sources/{source_id}/sync?background=true")
    assert bg_resp.status_code == 200, bg_resp.text
    bg_data = bg_resp.json()
    assert bg_data["success"] is True
    assert bg_data["job_id"] is not None
    assert bg_data["status"] in ("QUEUED", "RUNNING")


@pytest.mark.asyncio
async def test_detect_endpoint(client: AsyncClient):
    sample_html = """
    <html>
      <head>
        <title>朝日新聞デジタル</title>
        <link rel="alternate" type="application/rss+xml" href="https://rss.asahi.com/rss/news.rdf">
      </head>
      <body></body>
    </html>
    """
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200,
            text=sample_html,
            headers={"content-type": "text/html"},
            request=AsyncMock(),
        )
        resp = await client.post("/api/v1/sources/detect", json={"url": "https://www.asahi.com"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["recommended_connector"] == "RSS"
        assert len(data["detected_feeds"]) >= 1
        assert "capabilities" in data
