import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.models.source import ContentSource
from app.models.content import CanonicalContent
from app.models.enrichment import (
    AIEnrichmentJob,
    ContentEnrichment,
    ContentSentence,
    ContentVocabulary,
    ContentGrammar,
    ContentExpression
)
from app.services.enrichment_pipeline import EnrichmentPipelineService


@pytest.mark.asyncio
async def test_end_to_end_ai_enrichment_and_cache(test_db_session):
    # 1. Create a Content Source
    source = ContentSource(
        name="NHK News Easy Test",
        slug="nhk-news-easy-phase3",
        source_type="NEWS",
        content_roles=["FORMAL"],
        connector_type="RSS",
        feed_url="https://nhk.or.jp/news/easy.rss",
        status="ACTIVE"
    )
    test_db_session.add(source)
    await test_db_session.flush()

    # 2. Create a CanonicalContent item
    content_text = """
    日本の経済政策において、政府は新たな対策を講じる傾向にある。
    特にAIやデジタル技術の開発を支援し、市場への影響を最小限に抑える方針だ。
    しかし、全ての課題が一度に解決するわけではない。
    専門家は今後の動向を慎重に検討している。
    """
    content = CanonicalContent(
        source_id=source.id,
        external_id="nhk-item-phase3-001",
        canonical_url="https://nhk.or.jp/news/easy/001.html",
        content_type="NEWS",
        title="日本の新たな経済対策と技術革新の動向",
        content=content_text.strip(),
        content_hash="mock_hash_phase3_001",
        language="ja",
        language_status="JA",
        enrichment_status="NOT_PROCESSED"
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    # 3. Run Enrichment Pipeline
    enrichment = await EnrichmentPipelineService.enrich_content(
        db=test_db_session,
        content_id=content.id,
        task="ALL",
        model_provider="mock",
        model_name="mock-japanese-pedagogy-v1",
        force=True
    )

    assert enrichment is not None
    assert enrichment.content_id == content.id
    assert enrichment.is_japanese is True
    assert enrichment.language == "ja"
    assert enrichment.estimated_jlpt in ["N1", "N2", "N3", "N4", "N5"]
    assert enrichment.quality_score >= 60
    assert enrichment.learning_ready is True
    assert len(enrichment.micro_summary) > 0
    assert len(enrichment.detailed_summary) >= 1

    # Verify content status updated
    await test_db_session.refresh(content)
    assert content.enrichment_status == "ENRICHED"

    # Verify sentences persisted
    sent_res = await test_db_session.execute(
        select(ContentSentence).where(ContentSentence.content_id == content.id)
    )
    sentences = sent_res.scalars().all()
    assert len(sentences) >= 3
    assert sentences[0].sentence_index == 1
    assert sentences[0].start_offset == 0

    # Verify vocabulary persisted with anchored sentences
    vocab_res = await test_db_session.execute(
        select(ContentVocabulary).where(ContentVocabulary.content_id == content.id)
    )
    vocab_list = vocab_res.scalars().all()
    assert len(vocab_list) >= 1
    for v in vocab_list:
        assert v.surface_form in content_text
        assert v.meaning_in_context
        assert v.reading
        assert 1 <= v.importance <= 5

    # Verify grammar persisted
    gram_res = await test_db_session.execute(
        select(ContentGrammar).where(ContentGrammar.content_id == content.id)
    )
    gram_list = gram_res.scalars().all()
    assert len(gram_list) >= 1
    assert any("わけではない" in g.pattern or "傾向にある" in g.pattern for g in gram_list)

    # Verify AI Job audit record
    job_res = await test_db_session.execute(
        select(AIEnrichmentJob).where(AIEnrichmentJob.content_id == content.id)
    )
    jobs = job_res.scalars().all()
    assert len(jobs) == 1
    assert jobs[0].status == "SUCCESS"
    assert jobs[0].model_provider == "mock"

    # 4. Test Cache Idempotency (Re-running with force=False should be a cache hit)
    cached_enrichment = await EnrichmentPipelineService.enrich_content(
        db=test_db_session,
        content_id=content.id,
        task="ALL",
        model_provider="mock",
        model_name="mock-japanese-pedagogy-v1",
        force=False
    )
    assert cached_enrichment.id == enrichment.id

    # Verify no new job created
    job_res_2 = await test_db_session.execute(
        select(AIEnrichmentJob).where(AIEnrichmentJob.content_id == content.id)
    )
    jobs_2 = job_res_2.scalars().all()
    assert len(jobs_2) == 1  # Still 1 job, cache hit!


@pytest.mark.asyncio
async def test_enrichment_api_endpoints(test_db_session):
    # Setup sample content with enrichment
    source = ContentSource(
        name="API Test Source",
        slug="api-test-source",
        source_type="BLOG",
        content_roles=["CASUAL"],
        connector_type="RSS",
        feed_url="https://blog.test.jp/feed",
        status="ACTIVE"
    )
    test_db_session.add(source)
    await test_db_session.flush()

    content = CanonicalContent(
        source_id=source.id,
        external_id="blog-002",
        canonical_url="https://blog.test.jp/002",
        content_type="BLOG_POST",
        title="日本語の学習とテクノロジーの進化",
        content="日本語の学習はとても興味深いです。新しい技術を使って効率的に勉強することができます。",
        content_hash="hash_002",
        language="ja",
        language_status="JA",
        enrichment_status="NOT_PROCESSED"
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Trigger Re-enrich via API (synchronous)
        re_enrich_resp = await ac.post(
            f"/api/v1/enrichment/content/{content.id}/re-enrich",
            json={"task": "ALL", "model_provider": "mock", "force": True}
        )
        assert re_enrich_resp.status_code == 200
        detail = re_enrich_resp.json()
        assert detail["content_id"] == content.id
        assert detail["enrichment_status"] == "ENRICHED"
        assert detail["enrichment"] is not None
        assert len(detail["sentences"]) >= 1

        # 2. Test GET /enrichment/content/{content_id}
        get_resp = await ac.get(f"/api/v1/enrichment/content/{content.id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["title"] == content.title

        # 3. Test GET /enrichment/stats
        stats_resp = await ac.get("/api/v1/enrichment/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["success"] >= 1

        # 4. Test GET /enrichment/jobs
        jobs_resp = await ac.get("/api/v1/enrichment/jobs")
        assert jobs_resp.status_code == 200
        job_data = jobs_resp.json()
        assert job_data["total"] >= 1
        assert job_data["items"][0]["content_id"] == content.id

        # 5. Test GET /enrichment/providers
        prov_resp = await ac.get("/api/v1/enrichment/providers")
        assert prov_resp.status_code == 200
        providers = prov_resp.json()
        assert any(p["name"] == "mock" for p in providers)

        # 6. Test GET /enrichment/models
        models_resp = await ac.get("/api/v1/enrichment/models?provider=mock")
        assert models_resp.status_code == 200
        models = models_resp.json()
        assert len(models) >= 1


@pytest.mark.asyncio
async def test_enrichment_worker_kill_switch(client: AsyncClient):
    """Queue on/off toggle: status reflects flag, toggle persists in-memory."""
    from app.core.config import settings

    old = settings.ENRICHMENT_WORKER_ENABLED
    try:
        res = await client.get("/api/v1/enrichment/worker")
        assert res.status_code == 200
        assert "enabled" in res.json()

        off = await client.post("/api/v1/enrichment/worker", json={"enabled": False})
        assert off.status_code == 200
        assert off.json()["enabled"] is False
        assert settings.ENRICHMENT_WORKER_ENABLED is False

        on = await client.post("/api/v1/enrichment/worker", json={"enabled": True})
        assert on.status_code == 200
        assert on.json()["enabled"] is True
    finally:
        settings.ENRICHMENT_WORKER_ENABLED = old
        # restore persisted .env value to the original too
        from app.services.ai.provider_registry import ai_provider_registry
        try:
            ai_provider_registry._persist_env_var(
                "ENRICHMENT_WORKER_ENABLED", "true" if old else "false"
            )
        except Exception:
            pass


@pytest.mark.asyncio
async def test_model_select_rejects_unknown_id(client: AsyncClient):
    """Stale/typo'd model ids must never be persisted (they break every AI
    feature with an opaque provider 400)."""
    from app.services.ai.base import AIModelMeta

    live = [AIModelMeta(id="llama-3.3-70b-versatile", name="Llama", provider="groq")]
    with patch(
        "app.api.v1.endpoints.enrichment.ai_provider_registry.list_models",
        new_callable=AsyncMock,
        return_value=live,
    ):
        bad = await client.post(
            "/api/v1/enrichment/models/select",
            json={"provider": "groq", "model_id": "qwen/does-not-exist-1"},
        )
        assert bad.status_code == 400
        assert "không tồn tại" in bad.json()["detail"]

        unknown_prov = await client.post(
            "/api/v1/enrichment/models/select",
            json={"provider": "nope", "model_id": "x"},
        )
        assert unknown_prov.status_code == 400
