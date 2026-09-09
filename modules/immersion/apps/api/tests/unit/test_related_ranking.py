import pytest

from app.models.content import CanonicalContent
from app.models.enrichment import ContentEnrichment, ContentVocabulary
from app.services.reader_service import ReaderService


async def _make_content(
    test_db_session,
    tag: str,
    topic="Kinh tế",
    secondary=None,
    keywords=None,
    jlpt="N3",
    vocab_terms=None,
    source_id=1,
    days_ago=1,
):
    from datetime import datetime, timedelta

    content = CanonicalContent(
        source_id=source_id,
        canonical_url=f"https://example.com/related-{tag}",
        content_type="ARTICLE",
        title=f"Bài {tag}",
        content="本文テストです。" * 20,
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash=f"related_hash_{tag}",
        published_at=datetime.utcnow() - timedelta(days=days_ago),
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    test_db_session.add(ContentEnrichment(
        content_id=content.id,
        language="ja",
        is_japanese=True,
        primary_topic=topic,
        secondary_topics=secondary or [],
        keywords=keywords or [],
        estimated_jlpt=jlpt,
        quality_score=80,
        learning_readiness_score=80,
    ))
    for term in (vocab_terms or []):
        test_db_session.add(ContentVocabulary(
            content_id=content.id,
            surface_form=term,
            normalized_form=term,
            reading=term,
            part_of_speech="noun",
            meaning_in_context="nghĩa",
        ))
    await test_db_session.commit()
    await test_db_session.refresh(content)
    return content.id


@pytest.mark.asyncio
async def test_same_topic_outranks_newest_unrelated(test_db_session):
    target = await _make_content(
        test_db_session, "target", topic="Kinh tế",
        keywords=["lạm phát"], jlpt="N3", vocab_terms=["経済", "物価"],
    )
    # Newer but totally unrelated article
    await _make_content(
        test_db_session, "new-unrelated", topic="Thể thao",
        keywords=["bóng đá"], jlpt="N5", vocab_terms=["サッカー"], days_ago=0,
    )
    # Older but same topic + shared vocab
    same_id = await _make_content(
        test_db_session, "old-same", topic="Kinh tế",
        keywords=["lạm phát"], jlpt="N3", vocab_terms=["経済", "物価"], days_ago=30,
    )

    items = await ReaderService.get_related_contents(
        db=test_db_session, content_id=target, limit=4
    )
    assert len(items) == 2
    # Same-topic article wins despite being older
    assert items[0].content_id == same_id
    assert any("Cùng chủ đề" in r for r in items[0].match_reasons)
    assert items[0].match_score > items[1].match_score
    # Current article is never recommended to itself
    assert all(i.content_id != target for i in items)


@pytest.mark.asyncio
async def test_jlpt_proximity_and_reasons(test_db_session):
    target = await _make_content(test_db_session, "t2", topic="General", jlpt="N3")
    near = await _make_content(test_db_session, "near", topic="General", jlpt="N3", days_ago=2)
    far = await _make_content(test_db_session, "far", topic="General", jlpt="N1", days_ago=1)

    items = await ReaderService.get_related_contents(
        db=test_db_session, content_id=target, limit=4
    )
    assert len(items) == 2
    assert items[0].content_id == near
    assert any("Cùng N3" in r for r in items[0].match_reasons)


@pytest.mark.asyncio
async def test_mmr_diversifies_near_tie_candidates(test_db_session):
    target = await _make_content(test_db_session, "t3", topic="Kinh tế", keywords=["a"])
    # Two identical clones + one same-topic article with different keywords/vocab
    clone_ids = []
    for i in range(2):
        clone_ids.append(await _make_content(
            test_db_session, f"clone{i}", topic="Kinh tế", keywords=["a"],
            vocab_terms=["経済"], days_ago=i,
        ))
    varied = await _make_content(
        test_db_session, "varied", topic="Kinh tế", keywords=["b"],
        vocab_terms=["貯蓄"], days_ago=1,
    )

    items = await ReaderService.get_related_contents(
        db=test_db_session, content_id=target, limit=2
    )
    ids = [i.content_id for i in items]
    # First pick: an identical clone; second pick: the varied article wins over
    # the remaining identical clone thanks to the MMR diversity penalty.
    assert ids[0] in clone_ids
    assert ids[1] == varied
    assert all(i.match_score >= 0 for i in items)
    assert all(len(i.match_reasons) <= 2 for i in items)


@pytest.mark.asyncio
async def test_empty_pool_returns_empty(test_db_session):
    lonely = await _make_content(test_db_session, "lonely")
    # Remove every other article from the pool
    from sqlalchemy import delete
    await test_db_session.execute(
        delete(CanonicalContent).where(CanonicalContent.id != lonely)
    )
    await test_db_session.commit()

    items = await ReaderService.get_related_contents(
        db=test_db_session, content_id=lonely, limit=4
    )
    assert items == []
