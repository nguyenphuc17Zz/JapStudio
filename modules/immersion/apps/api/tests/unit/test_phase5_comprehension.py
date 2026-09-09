import pytest
from app.services.comprehension_service import ComprehensionService
from app.schemas.comprehension import (
    InteractionLogRequest,
    AICompanionQueryRequest,
)
from app.models.content import CanonicalContent
from app.models.enrichment import ContentVocabulary, ContentSentence, ContentEnrichment
from app.models.comprehension import ReadingInteraction


@pytest.mark.asyncio
async def test_record_interaction_unit(test_db_session):
    # Setup dummy content
    content = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/test-comprehend",
        content_type="ARTICLE",
        title="読解テスト記事",
        content="テスト内容",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="test_comp_hash_1",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    req = InteractionLogRequest(
        content_id=content.id,
        sentence_index=1,
        interaction_type="COMPREHENSION_CHECK",
        result="UNDERSTOOD",
        confidence="HIGH",
        time_spent_ms=1200,
    )

    res = await ComprehensionService.record_interaction(test_db_session, "user_unit_test", req)
    assert res.success is True
    assert res.id > 0


@pytest.mark.asyncio
async def test_generate_context_guess_3_stages(test_db_session):
    content = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/guess-test",
        content_type="ARTICLE",
        title="推測テスト",
        content="最近利用者が増加する傾向にある。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="test_guess_hash",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    sentence = ContentSentence(
        content_id=content.id,
        sentence_index=1,
        text="最近利用者が増加する傾向にある。",
        start_offset=0,
        end_offset=18,
    )
    test_db_session.add(sentence)

    vocab = ContentVocabulary(
        content_id=content.id,
        surface_form="傾向",
        normalized_form="傾向",
        reading="けいこう",
        part_of_speech="noun",
        meaning_in_context="xu hướng / khuynh hướng",
        importance=4,
        source_sentence_id=1,
    )
    test_db_session.add(vocab)
    await test_db_session.commit()
    await test_db_session.refresh(vocab)

    guess_res = await ComprehensionService.generate_context_guess(
        test_db_session,
        content_id=content.id,
        vocabulary_id=vocab.id,
        sentence_index=1,
    )

    # Stage 1: 4 options
    assert len(guess_res.options) >= 2
    correct_options = [opt for opt in guess_res.options if opt.is_correct]
    assert len(correct_options) == 1
    assert correct_options[0].text == "xu hướng / khuynh hướng"

    # Stage 2: Clues present
    assert guess_res.clue_hint != ""

    # Stage 3: Full meaning & micro examples
    assert guess_res.full_meaning == "xu hướng / khuynh hướng"
    assert len(guess_res.micro_examples) > 0


@pytest.mark.asyncio
async def test_checkpoint_generation_social_vs_long(test_db_session):
    # 1. Social post -> 0 checkpoints
    social = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/social-post",
        content_type="SOCIAL",
        title="短いSNS投稿",
        content="こんにちは。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="test_social_cp_hash",
    )
    test_db_session.add(social)
    await test_db_session.commit()
    await test_db_session.refresh(social)

    cps = await ComprehensionService.get_content_checkpoints(test_db_session, social.id, "user_unit_test")
    assert len(cps) == 0

    # 2. Medium article -> 1 checkpoint
    article = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/medium-article",
        content_type="ARTICLE",
        title="長めのニュース記事",
        content="これはテスト記事です。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="test_medium_cp_hash",
    )
    test_db_session.add(article)
    await test_db_session.commit()
    await test_db_session.refresh(article)

    # Add 6 sentences
    for i in range(1, 7):
        test_db_session.add(ContentSentence(
            content_id=article.id,
            sentence_index=i,
            text=f"文その{i}です。",
            start_offset=0,
            end_offset=10,
        ))

    test_db_session.add(ContentEnrichment(
        content_id=article.id,
        language="ja",
        is_japanese=True,
        primary_topic="Kinh tế",
        estimated_jlpt="N3",
        short_summary="Phân tích tình hình kinh tế Nhật Bản",
    ))
    await test_db_session.commit()

    cps_med = await ComprehensionService.get_content_checkpoints(test_db_session, article.id, "user_unit_test")
    assert len(cps_med) >= 1
    assert cps_med[0].checkpoint_type == "MAIN_IDEA"
    assert cps_med[0].question_text != ""


@pytest.mark.asyncio
async def test_sentence_decomposition(test_db_session):
    res = await ComprehensionService.decompose_sentence(
        test_db_session,
        content_id=1,
        sentence_index=1,
    )
    assert res.syntax_pattern != ""
    assert len(res.components) > 0
