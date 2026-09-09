import pytest
from unittest.mock import AsyncMock, patch

from app.models.content import CanonicalContent
from app.models.enrichment import ContentExpression, ContentSentence
from app.models.knowledge import UserExpression
from app.services.knowledge_service import KnowledgeService
from sqlalchemy import select, func


async def _make_article(test_db_session, tag: str) -> int:
    content = CanonicalContent(
        source_id=1,
        canonical_url=f"https://example.com/auto-collect-{tag}",
        content_type="ARTICLE",
        title="テスト記事",
        content="これはテスト記事です。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash=f"auto_collect_hash_{tag}",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    sent = ContentSentence(
        content_id=content.id,
        sentence_index=1,
        text="対策を講じる必要がある。",
        start_offset=0,
        end_offset=20,
    )
    test_db_session.add(sent)
    await test_db_session.commit()
    await test_db_session.refresh(sent)

    exprs = [
        ("対策を講じる", "たいさくをこうじる", "thực hiện biện pháp", "COLLOCATION", 90, sent.id),
        ("必要がある", "ひつようがある", "cần thiết", "COLLOCATION", 70, sent.id),
        ("テスト記事", "てすときじ", "bài test", "SLANG", 20, None),
    ]
    for expression, reading, meaning, type_, priority, sent_id in exprs:
        test_db_session.add(ContentExpression(
            content_id=content.id,
            expression=expression,
            reading=reading,
            meaning_in_context=meaning,
            type=type_,
            difficulty=5,
            learning_priority=priority,
            source_sentence_id=sent_id,
        ))
    await test_db_session.commit()
    return content.id


@pytest.mark.asyncio
async def test_auto_collect_saves_top_expressions(test_db_session):
    content_id = await _make_article(test_db_session, "basic")

    res = await KnowledgeService.auto_collect_expressions(
        db=test_db_session, user_id="user_unit_test", content_id=content_id, max_items=2
    )
    assert res == {"saved": 2, "skipped": 0}

    rows = (
        await test_db_session.execute(
            select(UserExpression).where(UserExpression.user_id == "user_unit_test")
        )
    ).scalars().all()
    assert len(rows) == 2
    by_expr = {r.expression: r for r in rows}
    # Top priority first, with reading/meaning carried over
    assert by_expr["対策を講じる"].reading == "たいさくをこうじる"
    assert by_expr["対策を講じる"].meaning == "thực hiện biện pháp"
    # Source sentence captured as context
    assert any(
        c.get("sentence") == "対策を講じる必要がある。"
        for c in (by_expr["対策を講じる"].contexts_json or [])
    )


@pytest.mark.asyncio
async def test_auto_collect_is_idempotent(test_db_session):
    content_id = await _make_article(test_db_session, "idem")

    first = await KnowledgeService.auto_collect_expressions(
        db=test_db_session, user_id="user_unit_test", content_id=content_id
    )
    assert first["saved"] == 3

    second = await KnowledgeService.auto_collect_expressions(
        db=test_db_session, user_id="user_unit_test", content_id=content_id
    )
    assert second["saved"] == 0
    assert second["skipped"] == 3

    total = (
        await test_db_session.execute(
            select(func.count(UserExpression.id)).where(UserExpression.user_id == "user_unit_test")
        )
    ).scalar()
    assert total == 3


@pytest.mark.asyncio
async def test_auto_collect_empty_article(test_db_session):
    content = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/auto-collect-empty",
        content_type="ARTICLE",
        title="空記事",
        content="短い。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="auto_collect_hash_empty",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    res = await KnowledgeService.auto_collect_expressions(
        db=test_db_session, user_id="user_unit_test", content_id=content.id
    )
    assert res == {"saved": 0, "skipped": 0}


async def _make_unenriched_article(test_db_session, tag: str, body: str) -> int:
    content = CanonicalContent(
        source_id=1,
        canonical_url=f"https://example.com/auto-scan-{tag}",
        content_type="ARTICLE",
        title="走るのが好きです",
        content=body,
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash=f"auto_scan_hash_{tag}",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)
    return content.id


@pytest.mark.asyncio
async def test_auto_collect_runs_ai_scan_when_nothing_stored(test_db_session):
    content_id = await _make_unenriched_article(
        test_db_session, "scan", "政府は新しい経済対策を講じる方針を発表した。" * 10
    )

    async def fake_enrich(db, content_id, **kwargs):
        db.add(ContentExpression(
            content_id=content_id,
            expression="対策を講じる",
            reading="たいさくをこうじる",
            meaning_in_context="thực hiện biện pháp",
            type="COLLOCATION",
            difficulty=5,
            learning_priority=90,
        ))
        await db.commit()
        return None

    with patch(
        "app.services.enrichment_pipeline.EnrichmentPipelineService.enrich_content",
        new=AsyncMock(side_effect=fake_enrich),
    ) as mock_enrich:
        res = await KnowledgeService.auto_collect_expressions(
            db=test_db_session, user_id="user_unit_test", content_id=content_id
        )
    mock_enrich.assert_awaited_once()
    assert res["saved"] == 1


@pytest.mark.asyncio
async def test_auto_collect_skips_scan_for_short_body(test_db_session):
    content_id = await _make_unenriched_article(test_db_session, "short", "短い。")
    with patch(
        "app.services.enrichment_pipeline.EnrichmentPipelineService.enrich_content",
        new=AsyncMock(side_effect=AssertionError("AI must not run for short body")),
    ):
        res = await KnowledgeService.auto_collect_expressions(
            db=test_db_session, user_id="user_unit_test", content_id=content_id
        )
    assert res == {"saved": 0, "skipped": 0}


@pytest.mark.asyncio
async def test_auto_collect_ai_failure_raises(test_db_session):
    content_id = await _make_unenriched_article(
        test_db_session, "fail", "これは十分に長いテスト記事の本文です。" * 10
    )
    with patch(
        "app.services.enrichment_pipeline.EnrichmentPipelineService.enrich_content",
        new=AsyncMock(side_effect=ValueError("Groq overloaded")),
    ):
        with pytest.raises(ValueError, match="Không thể quét"):
            await KnowledgeService.auto_collect_expressions(
                db=test_db_session, user_id="user_unit_test", content_id=content_id
            )


@pytest.mark.asyncio
async def test_auto_collect_unknown_content_raises(test_db_session):
    with pytest.raises(ValueError, match="not found"):
        await KnowledgeService.auto_collect_expressions(
            db=test_db_session, user_id="user_unit_test", content_id=999999
        )
