import pytest
from httpx import AsyncClient
from app.models.content import CanonicalContent
from app.models.enrichment import ContentSentence, ContentVocabulary, ContentEnrichment
from app.models.reader import UserReadingProgress


@pytest.mark.asyncio
async def test_comprehension_api_e2e(client: AsyncClient, test_db_session):
    # 1. Create fixture content
    content = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/p5-e2e-article",
        content_type="ARTICLE",
        title="統合読解テスト記事",
        content="最近利用者が増加する傾向にある。新しい制度が発表された。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="p5_e2e_hash_123",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    # Sentences
    for i, s_text in enumerate(["最近利用者が増加する傾向にある。", "新しい制度が発表された。"], 1):
        test_db_session.add(ContentSentence(
            content_id=content.id,
            sentence_index=i,
            text=s_text,
            start_offset=0,
            end_offset=len(s_text),
        ))

    # Vocab
    vocab = ContentVocabulary(
        content_id=content.id,
        surface_form="傾向",
        normalized_form="傾向",
        reading="けいこう",
        part_of_speech="noun",
        meaning_in_context="xu hướng",
        importance=4,
        source_sentence_id=1,
    )
    test_db_session.add(vocab)

    # Enrichment
    test_db_session.add(ContentEnrichment(
        content_id=content.id,
        language="ja",
        is_japanese=True,
        primary_topic="Chính sách",
        estimated_jlpt="N3",
        short_summary="Tóm tắt về chính sách mới và xu hướng người dùng.",
    ))
    await test_db_session.commit()
    await test_db_session.refresh(vocab)

    headers = {"X-User-Id": "user_p5_test"}

    # 2. Test Record Interaction API
    int_resp = await client.post(
        "/api/v1/immersion/reading/interactions",
        headers=headers,
        json={
            "content_id": content.id,
            "sentence_index": 1,
            "interaction_type": "COMPREHENSION_CHECK",
            "result": "UNDERSTOOD",
            "confidence": "HIGH",
            "time_spent_ms": 1500,
        },
    )
    assert int_resp.status_code == 200
    assert int_resp.json()["success"] is True

    # 3. Test Context Guess API
    guess_resp = await client.post(
        f"/api/v1/immersion/content/{content.id}/context-guess?vocabulary_id={vocab.id}",
        headers=headers,
    )
    assert guess_resp.status_code == 200
    guess_data = guess_resp.json()
    assert guess_data["surface_form"] == "傾向"
    assert len(guess_data["options"]) >= 2
    assert guess_data["full_meaning"] == "xu hướng"

    # 4. Test Decompose Sentence API
    decomp_resp = await client.post(
        f"/api/v1/immersion/content/{content.id}/decompose-sentence?sentence_index=1",
        headers=headers,
    )
    assert decomp_resp.status_code == 200
    decomp_data = decomp_resp.json()
    assert "syntax_pattern" in decomp_data
    assert len(decomp_data["components"]) > 0

    # 5. Test AI Companion Query API & Caching
    comp_query = {
        "sentence_index": 1,
        "question_type": "WHY_GRAMMAR",
        "custom_query": "Tại sao dùng cấu trúc にある ở đây?",
        "depth": "standard",
        "language": "vi",
    }
    comp_resp1 = await client.post(
        f"/api/v1/immersion/content/{content.id}/companion",
        headers=headers,
        json=comp_query,
    )
    assert comp_resp1.status_code == 200
    comp_data1 = comp_resp1.json()
    assert comp_data1["cached"] is False
    assert "answer_markdown" in comp_data1

    # Second call should hit persistent cache
    comp_resp2 = await client.post(
        f"/api/v1/immersion/content/{content.id}/companion",
        headers=headers,
        json=comp_query,
    )
    assert comp_resp2.status_code == 200
    comp_data2 = comp_resp2.json()
    assert comp_data2["cached"] is True

    # 6. Test Session Summary API
    summary_resp = await client.get(
        f"/api/v1/immersion/content/{content.id}/session-summary",
        headers=headers,
    )
    assert summary_resp.status_code == 200
    sum_data = summary_resp.json()
    assert sum_data["content_id"] == content.id
    assert "signals" in sum_data
    assert sum_data["signals"]["vocabulary_signal"] in ("strong", "medium", "needs_review")

    # 7. Test Resume Point API
    resume_resp = await client.get(
        f"/api/v1/immersion/content/{content.id}/resume-point",
        headers=headers,
    )
    assert resume_resp.status_code == 200
    assert "has_unclear_sentence" in resume_resp.json()
