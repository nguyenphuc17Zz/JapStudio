import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.models.content import CanonicalContent
from app.models.ingestion import IngestionJob, RawIngestionItem, IngestionItemLog
from app.models.enrichment import AIEnrichmentJob
from app.services.ingestion_pipeline import IngestionPipelineService


MOCK_FEED_INITIAL = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>NHK Easy Pipeline Test</title>
    <link>https://www3.nhk.or.jp</link>
    <item>
      <title>ニュース1: 富士山の初雪</title>
      <link>https://www3.nhk.or.jp/news/article_1.html?utm_source=rss</link>
      <guid>nhk_fuji_001</guid>
      <description>富士山頂で初雪が観測されました。例年より3日早いです。</description>
      <pubDate>Tue, 08 Sep 2026 09:00:00 GMT</pubDate>
    </item>
    <item>
      <title>ニュース2: 新幹線の新型車両</title>
      <link>https://www3.nhk.or.jp/news/article_2.html?utm_medium=feed</link>
      <guid>nhk_train_002</guid>
      <description>JR東日本が新型新幹線「E9系」の試験走行を開始しました。</description>
      <pubDate>Tue, 08 Sep 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""

MOCK_FEED_UPDATED = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>NHK Easy Pipeline Test</title>
    <link>https://www3.nhk.or.jp</link>
    <item>
      <title>ニュース1: 富士山の初雪（更新）</title>
      <link>https://www3.nhk.or.jp/news/article_1.html?utm_source=rss</link>
      <guid>nhk_fuji_001</guid>
      <description>富士山頂で初雪が観測されました。気象庁の発表によると積雪は5cmです。</description>
      <pubDate>Tue, 08 Sep 2026 14:00:00 GMT</pubDate>
    </item>
    <item>
      <title>ニュース2: 新幹線の新型車両</title>
      <link>https://www3.nhk.or.jp/news/article_2.html?utm_medium=feed</link>
      <guid>nhk_train_002</guid>
      <description>JR東日本が新型新幹線「E9系」の試験走行を開始しました。</description>
      <pubDate>Tue, 08 Sep 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""


@pytest.mark.asyncio
async def test_end_to_end_ingestion_and_deduplication(
    client: AsyncClient,
    test_db_session: AsyncSession
):
    # 1. Create active source
    create_res = await client.post(
        "/api/v1/sources",
        json={
            "name": "NHK Pipeline Test Source",
            "source_type": "rss",
            "category": "news",
            "feed_url": "https://www3.nhk.or.jp/rss/pipeline.xml",
            "priority": 8,
            "sync_interval_minutes": 15
        }
    )
    assert create_res.status_code == 201
    source_id = create_res.json()["id"]

    # 2. Run initial Ingestion through pipeline
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200,
            text=MOCK_FEED_INITIAL,
            request=AsyncMock()
        )

        job = IngestionJob(source_id=source_id, job_type="MANUAL", status="QUEUED")
        test_db_session.add(job)
        await test_db_session.commit()
        await test_db_session.refresh(job)

        completed_job = await IngestionPipelineService.process_job(test_db_session, job.id)
        assert completed_job.status == "SUCCESS"
        assert completed_job.items_fetched == 2
        assert completed_job.items_created == 2
        assert completed_job.items_duplicate == 0
        assert completed_job.items_updated == 0

    # Verify CanonicalContent persisted
    stmt = select(CanonicalContent).where(CanonicalContent.source_id == source_id)
    res = await test_db_session.execute(stmt)
    contents = res.scalars().all()
    assert len(contents) == 2

    fuji_art = next(c for c in contents if "富士山" in c.title)
    assert fuji_art.external_id == "nhk_fuji_001"
    assert fuji_art.language_status == "JA"
    assert fuji_art.canonical_url == "https://www3.nhk.or.jp/news/article_1.html"
    assert "utm_source" not in fuji_art.canonical_url

    # 3. Second run with SAME feed: verify 100% duplicate detection
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200,
            text=MOCK_FEED_INITIAL,
            request=AsyncMock()
        )

        job2 = IngestionJob(source_id=source_id, job_type="SCHEDULED", status="QUEUED")
        test_db_session.add(job2)
        await test_db_session.commit()
        await test_db_session.refresh(job2)

        completed_job2 = await IngestionPipelineService.process_job(test_db_session, job2.id)
        assert completed_job2.status == "SUCCESS"
        assert completed_job2.items_fetched == 2
        assert completed_job2.items_created == 0
        assert completed_job2.items_duplicate == 2
        assert completed_job2.items_updated == 0

    # Verify total contents remains 2
    res2 = await test_db_session.execute(stmt)
    assert len(res2.scalars().all()) == 2

    # 4. Third run with UPDATED feed: 1 item updated, 1 duplicate
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200,
            text=MOCK_FEED_UPDATED,
            request=AsyncMock()
        )

        job3 = IngestionJob(source_id=source_id, job_type="SCHEDULED", status="QUEUED")
        test_db_session.add(job3)
        await test_db_session.commit()
        await test_db_session.refresh(job3)

        completed_job3 = await IngestionPipelineService.process_job(test_db_session, job3.id)
        assert completed_job3.status == "SUCCESS"
        assert completed_job3.items_created == 0
        assert completed_job3.items_duplicate == 1
        assert completed_job3.items_updated == 1

    # Verify content updated in place
    await test_db_session.refresh(fuji_art)
    assert "（更新）" in fuji_art.title
    assert "積雪は5cm" in fuji_art.content


LONG_JA_PARAGRAPH = "富士山頂で初雪が観測されました。気象庁の発表によると積雪は5センチです。登山者の安全確保のため山梨県が注意を呼びかけています。" * 30

MOCK_FEED_LONG_NOIMG = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Long Feed Test</title>
    <link>https://example.com</link>
    <item>
      <title>特集記事: 富士山の四季</title>
      <link>https://example.com/articles/fuji-seasons.html</link>
      <guid>fuji_seasons_001</guid>
      <description>{body}</description>
      <pubDate>Tue, 09 Sep 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
""".format(body=LONG_JA_PARAGRAPH)

MOCK_ARTICLE_WITH_IMG = """
<html><head><meta property="og:title" content="特集記事: 富士山の四季" /></head>
<body><!-- padding to pass fetch guard 0123456789 0123456789 0123456789 0123456789 -->
<main><article class="article"><section class="article-body">
<p>リード文です。富士山の四季について紹介します。</p>
<div class="image-area"><img src="https://cdn.example.com/fuji-winter.jpg" alt="冬の富士山" />
<div class="caption">雪化粧の富士山</div><div class="source">写真＝気象庁</div></div>
<p>春には桜と富士山の共演が見られます。多くの観光客が訪れます。</p>
</section></article></main></body></html>
"""


@pytest.mark.asyncio
async def test_no_auto_enrich_queue_by_default(
    client: AsyncClient,
    test_db_session: AsyncSession,
    monkeypatch,
):
    """Manual-only enrichment: ingestion must NOT auto-queue AI jobs unless
    ENRICHMENT_AUTO_QUEUE_ENABLED is explicitly turned on."""
    monkeypatch.setattr(settings, "ENRICHMENT_AUTO_QUEUE_ENABLED", False)

    create_res = await client.post(
        "/api/v1/sources",
        json={
            "name": "No Auto Enrich Source",
            "source_type": "rss",
            "category": "news",
            "feed_url": "https://example.com/rss/noauto.xml",
        },
    )
    assert create_res.status_code == 201
    source_id = create_res.json()["id"]

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200, text=MOCK_FEED_INITIAL, request=AsyncMock()
        )
        job = IngestionJob(source_id=source_id, job_type="MANUAL", status="QUEUED")
        test_db_session.add(job)
        await test_db_session.commit()
        await test_db_session.refresh(job)

        completed = await IngestionPipelineService.process_job(test_db_session, job.id)
        assert completed.status == "SUCCESS"
        assert completed.items_created == 2

    n_jobs = (
        await test_db_session.execute(
            select(func.count())
            .select_from(AIEnrichmentJob)
            .where(AIEnrichmentJob.content_id.in_(
                select(CanonicalContent.id).where(CanonicalContent.source_id == source_id)
            ))
        )
    ).scalar_one()
    assert n_jobs == 0


@pytest.mark.asyncio
async def test_auto_enrich_queue_when_flag_on(
    client: AsyncClient,
    test_db_session: AsyncSession,
    monkeypatch,
):
    """Opt-in path: with the flag on, ingestion queues enrichment with the
    empty sentinel (resolved at execution, never a stale snapshot)."""
    monkeypatch.setattr(settings, "ENRICHMENT_AUTO_QUEUE_ENABLED", True)

    create_res = await client.post(
        "/api/v1/sources",
        json={
            "name": "Auto Enrich Opt-in Source",
            "source_type": "rss",
            "category": "news",
            "feed_url": "https://example.com/rss/optin.xml",
        },
    )
    assert create_res.status_code == 201
    source_id = create_res.json()["id"]

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = Response(
            status_code=200, text=MOCK_FEED_INITIAL, request=AsyncMock()
        )
        job = IngestionJob(source_id=source_id, job_type="MANUAL", status="QUEUED")
        test_db_session.add(job)
        await test_db_session.commit()
        await test_db_session.refresh(job)

        completed = await IngestionPipelineService.process_job(test_db_session, job.id)
        assert completed.status == "SUCCESS"

    res = await test_db_session.execute(
        select(AIEnrichmentJob).where(
            AIEnrichmentJob.content_id.in_(
                select(CanonicalContent.id).where(CanonicalContent.source_id == source_id)
            )
        )
    )
    jobs = res.scalars().all()
    assert len(jobs) == 2
    assert all(j.model_provider == "" and j.model_name == "" for j in jobs)


@pytest.mark.asyncio
async def test_wall_batch_fails_loudly_without_persisting(
    client: AsyncClient,
    test_db_session: AsyncSession
):
    """Nikkei regression: 50 same-wall-text items under different titles must NOT
    become 50 junk articles. Batch guard rejects them and fails the job loudly."""
    from app.schemas.connector import ConnectorFetchResult, RawContentItem

    create_res = await client.post(
        "/api/v1/sources",
        json={
            "name": "Walled Site Test",
            "source_type": "news",
            "category": "news",
            "base_url": "https://walled.example.com/",
        }
    )
    assert create_res.status_code == 201
    source_id = create_res.json()["id"]

    wall_text = "アクセス確認のためのページです。しばらくお待ちください。"

    class FakeWalledConnector:
        async def fetch(self, source=None, decrypted_secret=None, limit=50, cursor=None):
            return ConnectorFetchResult(
                success=True,
                items=[
                    RawContentItem(
                        external_id=f"wall_{i}",
                        title=f"記事タイトルその{i}",
                        url=f"https://walled.example.com/a{i}.html",
                        content=wall_text,
                        excerpt=wall_text,
                        language="ja",
                    )
                    for i in range(6)
                ],
                fetched_count=6,
            )

    with patch(
        "app.services.ingestion_pipeline.connector_registry.get",
        return_value=FakeWalledConnector(),
    ):
        job = IngestionJob(source_id=source_id, job_type="MANUAL", status="QUEUED")
        test_db_session.add(job)
        await test_db_session.commit()
        await test_db_session.refresh(job)

        completed = await IngestionPipelineService.process_job(test_db_session, job.id)
        assert completed.status == "FAILED"
        assert completed.error_type == "permanent"
        assert completed.items_created == 0
        assert completed.items_updated == 0
        assert completed.items_rejected == 6
        assert "bot-wall" in (completed.error_summary or "")

    stmt = select(CanonicalContent).where(CanonicalContent.source_id == source_id)
    res = await test_db_session.execute(stmt)
    assert len(res.scalars().all()) == 0


@pytest.mark.asyncio
async def test_image_backfill_for_long_rss_items(
    client: AsyncClient,
    test_db_session: AsyncSession
):
    """RSS items already full (>=2000 chars) skip auto-scrape, but must still
    get inline images via the image-only backfill (8b-3) without touching text."""
    create_res = await client.post(
        "/api/v1/sources",
        json={
            "name": "Long Feed Img Source",
            "source_type": "rss",
            "category": "news",
            "feed_url": "https://example.com/rss/long.xml",
        }
    )
    assert create_res.status_code == 201
    source_id = create_res.json()["id"]

    async def fake_get(url, *args, **kwargs):
        if "long.xml" in str(url):
            return Response(status_code=200, text=MOCK_FEED_LONG_NOIMG, request=AsyncMock())
        return Response(status_code=200, text=MOCK_ARTICLE_WITH_IMG, request=AsyncMock())

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = fake_get

        job = IngestionJob(source_id=source_id, job_type="MANUAL", status="QUEUED")
        test_db_session.add(job)
        await test_db_session.commit()
        await test_db_session.refresh(job)

        completed = await IngestionPipelineService.process_job(test_db_session, job.id)
        assert completed.status == "SUCCESS"
        assert completed.items_created == 1

    stmt = select(CanonicalContent).where(CanonicalContent.source_id == source_id)
    res = await test_db_session.execute(stmt)
    art = res.scalars().one()
    # Feed text preserved (image-backfill must not overwrite content)
    assert "富士山頂で初雪" in (art.content or "")
    assert "リード文です" not in (art.content or "")
    # ...but inline image collected via hotlink (nothing downloaded)
    meta = art.metadata_json or {}
    imgs = meta.get("images") or []
    assert len(imgs) >= 1
    assert imgs[0]["url"] == "https://cdn.example.com/fuji-winter.jpg"
    assert art.image_url == "https://cdn.example.com/fuji-winter.jpg"


@pytest.mark.asyncio
async def test_ingestion_api_endpoints(
    client: AsyncClient,
    test_db_session: AsyncSession
):
    # 1. Test Stats
    stats_res = await client.get("/api/v1/ingestion/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "jobs_today" in stats
    assert "items_created" in stats

    # 2. Test Jobs Listing
    jobs_res = await client.get("/api/v1/ingestion/jobs")
    assert jobs_res.status_code == 200
    data = jobs_res.json()
    assert "items" in data
    assert "total" in data

    # 3. Test Contents Listing
    contents_res = await client.get("/api/v1/ingestion/contents")
    assert contents_res.status_code == 200
    contents_data = contents_res.json()
    assert "items" in contents_data
    assert "total" in contents_data
