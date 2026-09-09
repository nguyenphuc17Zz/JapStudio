import pytest
from app.models.content import CanonicalContent
from app.models.source import ContentSource
from app.models.enrichment import ContentSentence
from app.services.reader_service import ReaderService


@pytest.mark.asyncio
async def test_get_content_for_reader_audio_and_clean_sentences(test_db_session):
    # 1. Create a source
    src = ContentSource(
        name="NHK News Web Easy",
        slug="nhk-news-web-easy",
        source_type="NEWS",
        connector_type="RSS",
        feed_url="https://nhkeasier.com/feed/",
        base_url="https://nhkeasier.com",
    )
    test_db_session.add(src)
    await test_db_session.flush()

    # 2. Create canonical content with audio_url and metadata
    content = CanonicalContent(
        source_id=src.id,
        title="福井県　大雨のあと家具などたくさんのごみ",
        canonical_url="https://nhkeasier.com/story/9921/",
        content="福井県では8月30日、とてもたくさんの雨が降りました。家の中にも水が入りました。",
        status="PUBLISHED",
        language_status="JA",
        content_hash="mockhash123",
        metadata_json={
            "audio_url": "https://nhkeasier.com/media/mp3/20260901de47592.mp3",
            "images": [{"url": "https://nhkeasier.com/media/jpg/20260901de47592.jpg", "caption": "Story illustration", "position": 0}],
            "auto_scraped": True,
        },
        image_url="https://nhkeasier.com/media/jpg/20260901de47592.jpg",
    )
    test_db_session.add(content)
    await test_db_session.flush()

    # 3. Add clean sentences (not starting with title)
    s1 = ContentSentence(
        content_id=content.id,
        sentence_index=1,
        text="福井県では8月30日、とてもたくさんの雨が降りました。",
        start_offset=0,
        end_offset=26,
    )
    s2 = ContentSentence(
        content_id=content.id,
        sentence_index=2,
        text="家の中にも水が入りました。",
        start_offset=27,
        end_offset=40,
    )
    test_db_session.add_all([s1, s2])
    await test_db_session.commit()

    # 4. Load via ReaderService
    reader_data = await ReaderService.get_content_for_reader(test_db_session, content.id, "test_user")

    assert reader_data is not None
    assert reader_data.title == "福井県　大雨のあと家具などたくさんのごみ"
    assert reader_data.audio_url == "https://nhkeasier.com/media/mp3/20260901de47592.mp3"
    assert len(reader_data.sentences) == 2

    # Assert sentences are clean and have furigana tokens
    assert reader_data.sentences[0].text == "福井県では8月30日、とてもたくさんの雨が降りました。"
    assert len(reader_data.sentences[0].furigana_tokens) > 0
    assert "<" not in reader_data.sentences[0].text
    assert ">" not in reader_data.sentences[0].text


@pytest.mark.asyncio
async def test_get_content_for_reader_defensive_dirty_html_cleanup(test_db_session):
    # Test that if a legacy content record still has HTML in sentences, ReaderService dynamically cleans it
    src = ContentSource(
        name="Legacy Source",
        slug="legacy-source",
        source_type="NEWS",
        connector_type="RSS",
        feed_url="https://example.com/feed",
    )
    test_db_session.add(src)
    await test_db_session.flush()

    content = CanonicalContent(
        source_id=src.id,
        title="テスト記事",
        canonical_url="https://example.com/story/1",
        content="<p>これはテストです。</p><audio src='https://example.com/test.mp3'></audio>",
        status="PUBLISHED",
        language_status="JA",
        content_hash="mockhash456",
        metadata_json={"auto_scraped": True},
    )
    test_db_session.add(content)
    await test_db_session.flush()

    # Dirty sentence with raw HTML
    dirty_sent = ContentSentence(
        content_id=content.id,
        sentence_index=1,
        text="<p>これはテストです。</p>",
        start_offset=0,
        end_offset=15,
    )
    test_db_session.add(dirty_sent)
    await test_db_session.commit()

    reader_data = await ReaderService.get_content_for_reader(test_db_session, content.id, "test_user")
    assert reader_data is not None
    assert len(reader_data.sentences) > 0
    for s in reader_data.sentences:
        assert "<" not in s.text
        assert ">" not in s.text
    assert "これはテストです。" in reader_data.sentences[0].text
