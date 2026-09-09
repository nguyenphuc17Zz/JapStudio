import pytest
from httpx import AsyncClient
from app.models.content import CanonicalContent
from app.models.enrichment import ContentSentence, ContentVocabulary, ContentGrammar, ContentEnrichment


@pytest.mark.asyncio
async def test_quiz_api_e2e_flow(client: AsyncClient, test_db_session):
    """End-to-end integration test of Phase 6 Quiz engine: Generate -> Take -> Answer -> Complete -> Admin Stats."""
    # 1. Setup article
    content = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/p6-quiz-e2e",
        content_type="ARTICLE",
        title="日本の自然エネルギー導入の現状",
        content="日本全国で太陽光発電や風力発電の導入が進んでいる。気候変動対策としての期待が大きい一方で、送電網の整備が急務となっている。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="p6_quiz_hash_e2e",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    enrichment = ContentEnrichment(
        content_id=content.id,
        enrichment_version=1,
        prompt_version="v1",
        model_name="mock",
        model_provider="mock",
        micro_summary="自然エネルギー導入と送電網の課題",
        overall_difficulty=6,
        estimated_jlpt="N2",
        learning_ready=True,
    )
    test_db_session.add(enrichment)
    await test_db_session.commit()
    await test_db_session.refresh(enrichment)

    s1 = ContentSentence(
        content_id=content.id,
        sentence_index=0,
        text="日本全国で太陽光発電や風力発電の導入が進んでいる。",
        start_offset=0,
        end_offset=26,
    )
    s2 = ContentSentence(
        content_id=content.id,
        sentence_index=1,
        text="気候変動対策としての期待が大きい一方で、送電網の整備が急務となっている。",
        start_offset=27,
        end_offset=65,
    )
    vocab = ContentVocabulary(
        content_id=content.id,
        surface_form="整備",
        normalized_form="整備",
        reading="せいび",
        part_of_speech="noun",
        meaning_in_context="trang bị, hoàn thiện hệ thống",
        difficulty=3,
        learning_priority=9,
    )
    grammar = ContentGrammar(
        content_id=content.id,
        pattern="〜一方で",
        meaning_in_context="mặt khác, đồng thời với",
        difficulty=3,
    )
    test_db_session.add_all([s1, s2, vocab, grammar])
    await test_db_session.commit()

    # 2. POST /content/{id}/quiz/generate
    gen_res = await client.post(f"/api/v1/immersion/content/{content.id}/quiz/generate")
    assert gen_res.status_code == 200
    quiz_data = gen_res.json()
    assert quiz_data["content_id"] == content.id
    assert quiz_data["status"] == "READY"
    assert len(quiz_data["questions"]) > 0
    quiz_id = quiz_data["id"]

    # Verify no answer leakage in client options
    for q in quiz_data["questions"]:
        for opt in q["options"]:
            assert "is_correct" not in opt
            assert "explanation" not in opt

    # 3. GET /content/{id}/quiz (Verify Cache)
    get_res = await client.get(f"/api/v1/immersion/content/{content.id}/quiz")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == quiz_id

    # 4. POST /quizzes/{id}/attempts (Start attempt)
    headers = {"X-User-Id": "integration_tester"}
    att_res = await client.post(
        f"/api/v1/immersion/quizzes/{quiz_id}/attempts",
        json={"mode": "RELAXED"},
        headers=headers,
    )
    assert att_res.status_code == 200
    attempt_data = att_res.json()
    attempt_id = attempt_data["id"]
    assert attempt_data["completion_status"] == "IN_PROGRESS"

    # 5. POST /attempts/{id}/answers (Submit answer for Question 1)
    q1 = quiz_data["questions"][0]
    opt1_id = q1["options"][0]["id"]

    ans_res = await client.post(
        f"/api/v1/immersion/attempts/{attempt_id}/answers",
        json={
            "question_id": q1["id"],
            "selected_option_id": opt1_id,
            "confidence": "HIGH",
            "response_time_ms": 2500,
            "hints_used": 0,
        },
        headers=headers,
    )
    assert ans_res.status_code == 200
    ans_data = ans_res.json()
    assert "is_correct" in ans_data
    assert "explanation" in ans_data
    assert ans_data["correct_option_id"] is not None

    # 6. POST /attempts/{id}/complete
    comp_res = await client.post(
        f"/api/v1/immersion/attempts/{attempt_id}/complete",
        headers=headers,
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["completion_status"] == "COMPLETED"
    assert "skill_scores" in comp_data
    assert "confidence_pattern" in comp_data
    assert len(comp_data["vocabulary_bridge"]) > 0
    assert len(comp_data["grammar_bridge"]) > 0
    assert len(comp_data["answers_review"]) == len(quiz_data["questions"])

    # 7. GET /attempts/{id}/results
    res_res = await client.get(
        f"/api/v1/immersion/attempts/{attempt_id}/results",
        headers=headers,
    )
    assert res_res.status_code == 200
    assert res_res.json()["attempt_id"] == attempt_id

    # 8. GET /quizzes/admin/stats
    admin_res = await client.get("/api/v1/immersion/quizzes/admin/stats")
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert admin_data["total_quizzes"] >= 1
    assert admin_data["ready_quizzes"] >= 1
    assert admin_data["total_attempts"] >= 1
    assert len(admin_data["quizzes_list"]) >= 1
