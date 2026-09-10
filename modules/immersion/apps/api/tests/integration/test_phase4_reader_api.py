import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.source import ContentSource
from app.models.content import CanonicalContent
from app.models.enrichment import (
    ContentEnrichment,
    ContentSentence,
    ContentVocabulary,
    ContentGrammar,
)


@pytest.mark.asyncio
async def test_feed_and_smart_reader_flow(test_db_session):
    # 1. Setup Content Source
    source = ContentSource(
        name="Asahi Shimbun Japanese",
        slug="asahi-shimbun-phase4",
        source_type="NEWS",
        content_roles=["FORMAL"],
        connector_type="RSS",
        feed_url="https://asahi.com/rss/news.xml",
        status="ACTIVE",
        priority=8
    )
    test_db_session.add(source)
    await test_db_session.flush()

    # 2. Setup CanonicalContent
    text = (
        "日本政府は持続可能なエネルギー政策に関する新たな対策を講じる方針を決定した。\n"
        "環境への影響を最小限に抑えつつ、経済成長を両立させる狙いがある。\n"
        "しかし、すべての課題が直ちに解決するわけではないと専門家は指摘している。"
    )
    content = CanonicalContent(
        source_id=source.id,
        external_id="asahi-004-p4",
        canonical_url="https://asahi.com/articles/004.html",
        content_type="NEWS",
        title="持続可能なエネルギー政策と将来への影響",
        content=text,
        content_hash="hash_p4_004",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        enrichment_status="ENRICHED"
    )
    test_db_session.add(content)
    await test_db_session.flush()

    # 3. Setup Enrichment & Sentences
    enrichment = ContentEnrichment(
        content_id=content.id,
        language="ja",
        language_confidence=0.99,
        is_japanese=True,
        mixed_language=False,
        primary_type="NEWS",
        secondary_types=["ARTICLE"],
        content_role="FORMAL",
        primary_topic="Environment",
        secondary_topics=["Economy", "Politics"],
        topic_confidence=0.95,
        keywords=["エネルギー", "政策", "環境", "対策"],
        entities=[{"name": "日本政府", "type": "organization", "confidence": 0.99}],
        overall_difficulty=6,
        vocabulary_difficulty=6,
        grammar_difficulty=5,
        kanji_difficulty=7,
        sentence_complexity=6,
        conceptual_difficulty=5,
        estimated_jlpt="N2",
        difficulty_reasons=["N2 collocations and formal news style"],
        micro_summary="日本政府は新たなエネルギー政策を決定した。",
        short_summary="環境保護と経済成長の両立を目指す新たな方針が決定された。",
        detailed_summary=["エネルギー政策の刷新", "環境負荷の低減", "経済成長の両立"],
        register="FORMAL",
        formality_score=90,
        casualness_score=10,
        internet_slang_score=0,
        requires_cultural_context=False,
        cultural_topics=[],
        quality_score=92,
        freshness_score=100,
        learning_readiness_score=90,
        learning_ready=True,
        enrichment_version=1,
        prompt_version="enrichment_comprehensive_v1",
        model_provider="mock",
        model_name="mock-japanese-pedagogy-v1"
    )
    test_db_session.add(enrichment)

    # Add sentences
    s1 = ContentSentence(
        content_id=content.id,
        sentence_index=1,
        text="日本政府は持続可能なエネルギー政策に関する新たな対策を講じる方針を決定した。",
        start_offset=0,
        end_offset=41,
        has_high_learning_value=True
    )
    s2 = ContentSentence(
        content_id=content.id,
        sentence_index=2,
        text="環境への影響を最小限に抑えつつ、経済成長を両立させる狙いがある。",
        start_offset=42,
        end_offset=74,
        has_high_learning_value=True
    )
    s3 = ContentSentence(
        content_id=content.id,
        sentence_index=3,
        text="しかし、すべての課題が直ちに解決するわけではないと専門家は指摘している。",
        start_offset=75,
        end_offset=112,
        has_high_learning_value=True
    )
    test_db_session.add_all([s1, s2, s3])
    await test_db_session.flush()

    # Add vocabulary linked to s1
    v1 = ContentVocabulary(
        content_id=content.id,
        surface_form="対策",
        normalized_form="対策",
        reading="たいさく",
        part_of_speech="noun",
        meaning_in_context="measures / countermeasures",
        importance=5,
        learning_priority=85,
        difficulty=5,
        source_sentence_id=s1.id,
        confidence=0.99
    )
    g1 = ContentGrammar(
        content_id=content.id,
        pattern="〜わけではない",
        meaning_in_context="it does not mean that / not necessarily",
        category="INTERMEDIATE",
        difficulty=6,
        source_sentence_id=s3.id,
        confidence=0.95
    )
    test_db_session.add_all([v1, g1])
    await test_db_session.commit()

    # 4. Test API Endpoints
    transport = ASGITransport(app=app)
    headers = {"X-User-Id": "user_tester_99"}

    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        # A. Feed Endpoint
        feed_resp = await ac.get("/api/v1/immersion/feed?tab=ALL&sort_by=relevant")
        assert feed_resp.status_code == 200
        feed_data = feed_resp.json()
        assert feed_data["total"] >= 1
        found_item = next((i for i in feed_data["items"] if i["content_id"] == content.id), None)
        assert found_item is not None
        assert found_item["title"] == content.title
        assert found_item["estimated_jlpt"] == "N2"
        assert found_item["reading_time_minutes"] >= 1
        assert found_item["is_saved"] is False

        # B. Save Content
        save_resp = await ac.post(f"/api/v1/immersion/content/{content.id}/save")
        assert save_resp.status_code == 200
        assert save_resp.json()["is_saved"] is True

        # Check in Saved List
        saved_list_resp = await ac.get("/api/v1/immersion/saved")
        assert saved_list_resp.status_code == 200
        assert any(i["content_id"] == content.id for i in saved_list_resp.json()["items"])

        # C. Update Reading Progress
        prog_resp = await ac.post(
            f"/api/v1/immersion/content/{content.id}/progress",
            json={
                "progress_percent": 65,
                "last_sentence_index": 2,
                "time_spent_seconds": 90,
                "completed": False
            }
        )
        assert prog_resp.status_code == 200
        assert prog_resp.json()["progress_percent"] == 65

        # Check in Continue Reading shelf
        continue_resp = await ac.get("/api/v1/immersion/continue-reading")
        assert continue_resp.status_code == 200
        assert any(i["content_id"] == content.id for i in continue_resp.json())

        # Check in Reading History
        hist_resp = await ac.get("/api/v1/immersion/history")
        assert hist_resp.status_code == 200
        assert len(hist_resp.json()["today"]) >= 1

        # D. Reader Content Endpoint (mock the refetch chain: the fixture article
        # is short (<300 chars) so the reader would otherwise live-scrape
        # asahi.com and overwrite the fixture title — hermetic test)
        with patch(
            "app.services.reader_service.fetch_html_best_effort",
            new_callable=AsyncMock,
            return_value=(None, "none"),
        ):
            reader_resp = await ac.get(f"/api/v1/immersion/content/{content.id}")
        assert reader_resp.status_code == 200
        reader_data = reader_resp.json()
        assert reader_data["content_id"] == content.id
        assert reader_data["title"] == content.title
        assert reader_data["is_saved"] is True
        assert reader_data["progress_percent"] == 65
        assert len(reader_data["sentences"]) == 3
        # Check vocabulary attached to sentence 1
        assert any(v["surface_form"] == "対策" for v in reader_data["sentences"][0]["vocabularies"])
        # Check grammar attached to sentence 3
        assert any("わけではない" in g["pattern"] for g in reader_data["sentences"][2]["grammars"])

        # E. On-demand Translation with DB Cache
        trans_resp1 = await ac.post(
            f"/api/v1/immersion/content/{content.id}/translate?model_provider=mock",
            json={"sentence_index": 1, "target_language": "vi"}
        )
        assert trans_resp1.status_code == 200
        assert trans_resp1.json()["cached"] is False
        assert len(trans_resp1.json()["translated_text"]) > 0

        # Second call -> must be cached=True
        trans_resp2 = await ac.post(
            f"/api/v1/immersion/content/{content.id}/translate?model_provider=mock",
            json={"sentence_index": 1, "target_language": "vi"}
        )
        assert trans_resp2.status_code == 200
        assert trans_resp2.json()["cached"] is True
        assert trans_resp2.json()["translated_text"] == trans_resp1.json()["translated_text"]

        # F. Sentence Explanation with DB Cache
        expl_resp1 = await ac.post(
            f"/api/v1/immersion/content/{content.id}/explain?sentence_index=1&model_provider=mock"
        )
        assert expl_resp1.status_code == 200
        assert expl_resp1.json()["cached"] is False
        assert len(expl_resp1.json()["natural_meaning"]) > 0

        # Second call -> must be cached=True
        expl_resp2 = await ac.post(
            f"/api/v1/immersion/content/{content.id}/explain?sentence_index=1&model_provider=mock"
        )
        assert expl_resp2.status_code == 200
        assert expl_resp2.json()["cached"] is True

        # G. Unsave Content
        unsave_resp = await ac.delete(f"/api/v1/immersion/content/{content.id}/save")
        assert unsave_resp.status_code == 200
        assert unsave_resp.json()["is_saved"] is False


@pytest.mark.asyncio
async def test_selection_lookup_and_validation(test_db_session):
    """Verifies free-selection lookup (bôi đen tra từ) returns contextual meaning."""
    transport = ASGITransport(app=app)
    headers = {"X-User-Id": "user_tester_99"}

    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        # A1. Quick lookup (default): chỉ reading + nghĩa, nhanh
        quick_resp = await ac.post(
            "/api/v1/immersion/lookup",
            json={
                "query": "対策を講じる",
                "context": "日本政府は新たな対策を講じる方針を決定した。",
                "model_provider": "mock",
            },
        )
        assert quick_resp.status_code == 200, quick_resp.text
        quick_data = quick_resp.json()
        assert quick_data["query"] == "対策を講じる"
        assert len(quick_data["meaning_vi"]) > 0
        assert len(quick_data["reading"]) > 0

        # A2. Full lookup: chi tiết AI đầy đủ
        resp = await ac.post(
            "/api/v1/immersion/lookup",
            json={
                "query": "対策を講じる",
                "context": "日本政府は新たな対策を講じる方針を決定した。",
                "model_provider": "mock",
                "detail": "full",
            },
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["query"] == "対策を講じる"
        assert len(data["meaning_vi"]) > 0
        assert len(data["reading"]) > 0
        # Rich dictionary format (mirrors write module lookup box)
        assert isinstance(data["examples"], list) and len(data["examples"]) >= 1
        assert data["examples"][0]["sentence_ja"]
        assert isinstance(data["alternatives"], list) and len(data["alternatives"]) >= 1
        assert data["alternatives"][0]["expression"]

        # B. Too-short query rejected
        short_resp = await ac.post(
            "/api/v1/immersion/lookup",
            json={"query": "あ", "model_provider": "mock"},
        )
        assert short_resp.status_code == 400

        # C. Empty query rejected by schema validation
        empty_resp = await ac.post(
            "/api/v1/immersion/lookup",
            json={"query": "   ", "model_provider": "mock"},
        )
        assert empty_resp.status_code in (400, 422)
