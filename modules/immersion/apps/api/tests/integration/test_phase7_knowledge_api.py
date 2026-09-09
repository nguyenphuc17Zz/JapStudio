import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


async def _echo_distractors(specs):
    return {s["key"]: [f"nhiễu {s['key']}-{i}" for i in range(1, 4)] for s in specs}


@pytest.mark.asyncio
async def test_learning_event_ingestion_and_library_flow(client: AsyncClient):
    headers = {"X-User-Id": "test_learner_1"}

    # 1. Ingest Vocabulary Event
    vocab_payload = {
        "event_type": "ENCOUNTERED",
        "item_type": "VOCABULARY",
        "term": "技術革新",
        "reading": "ぎじゅつかくしん",
        "meaning": "đổi mới công nghệ / cách mạng công nghệ",
        "sentence_text": "近年の技術革新によって、AIの応用分野が急速に広がっている。",
        "source_name": "Tech News JP",
        "learning_priority": 85,
    }
    resp = await client.post("/api/v1/immersion/knowledge/events", json=vocab_payload, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["success"] is True
    assert data["item_type"] == "VOCABULARY"
    vocab_id = data["item_id"]

    # 2. Ingest Expression Event
    expr_payload = {
        "event_type": "ENCOUNTERED",
        "item_type": "EXPRESSION",
        "term": "拍車をかける",
        "reading": "はくしゃをかける",
        "meaning": "thúc đẩy nhanh hơn, chắp cánh cho",
        "sentence_text": "この政策がインフレに拍車をかける可能性がある。",
    }
    resp = await client.post("/api/v1/immersion/knowledge/events", json=expr_payload, headers=headers)
    assert resp.status_code == 200
    expr_data = resp.json()
    assert expr_data["item_type"] == "EXPRESSION"

    # 3. Ingest Grammar Event
    gram_payload = {
        "event_type": "QUIZ_CORRECT",
        "item_type": "GRAMMAR",
        "term": "〜にもかかわらず",
        "meaning": "Mặc dù... thế nhưng...",
        "sentence_text": "大雨にもかかわらず、多くの参加者が集まった。",
    }
    resp = await client.post("/api/v1/immersion/knowledge/events", json=gram_payload, headers=headers)
    assert resp.status_code == 200
    gram_data = resp.json()
    assert gram_data["item_type"] == "GRAMMAR"

    # 4. List Vocabulary
    resp = await client.get("/api/v1/immersion/knowledge/vocabulary", headers=headers)
    assert resp.status_code == 200
    v_list = resp.json()
    assert v_list["total"] >= 1
    assert any(item["term"] == "技術革新" for item in v_list["items"])

    # 5. Get Vocabulary Detail
    resp = await client.get(f"/api/v1/immersion/knowledge/vocabulary/{vocab_id}", headers=headers)
    assert resp.status_code == 200
    v_detail = resp.json()
    assert v_detail["term"] == "技術革新"
    assert len(v_detail["contexts"]) >= 1
    assert "近年の技術革新によって" in v_detail["contexts"][0]["sentence"]

    # 6. List Expressions and Grammar
    resp = await client.get("/api/v1/immersion/knowledge/expressions", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    resp = await client.get("/api/v1/immersion/knowledge/grammar", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    # 7. Update Vocabulary Status to MASTERED
    resp = await client.post(
        f"/api/v1/immersion/knowledge/vocabulary/{vocab_id}/status",
        json={"status": "MASTERED"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["new_status"] == "MASTERED"


@pytest.mark.asyncio
async def test_saved_sentence_crud(client: AsyncClient):
    headers = {"X-User-Id": "sentence_saver"}

    # Save sentence
    payload = {
        "sentence_text": "努力を重ねることが、最終的に大きな成果を生む。",
        "translation_text": "Việc tích luỹ nỗ lực cuối cùng sẽ tạo ra thành quả to lớn.",
        "reason": "MEMORABLE",
        "notes": "Câu truyền cảm hứng rất hay trong bài phỏng vấn",
    }
    resp = await client.post("/api/v1/immersion/knowledge/sentences", json=payload, headers=headers)
    assert resp.status_code == 200
    s_data = resp.json()
    assert s_data["sentence_text"] == payload["sentence_text"]
    sentence_id = s_data["id"]

    # List sentences
    resp = await client.get("/api/v1/immersion/knowledge/sentences", headers=headers)
    assert resp.status_code == 200
    all_s = resp.json()
    assert all_s["total"] >= 1
    assert any(s["id"] == sentence_id for s in all_s["items"])

    # Delete sentence
    resp = await client.delete(f"/api/v1/immersion/knowledge/sentences/{sentence_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Verify deleted
    resp = await client.get("/api/v1/immersion/knowledge/sentences", headers=headers)
    assert not any(s["id"] == sentence_id for s in resp.json()["items"])


@pytest.mark.asyncio
async def test_spaced_review_and_analytics(client: AsyncClient):
    headers = {"X-User-Id": "review_student"}

    # Ingest words (3+, so the session can sample real distractors from the library)
    payload = {
        "event_type": "FAILED_RECOGNITION",
        "item_type": "VOCABULARY",
        "term": "懸念",
        "reading": "けねん",
        "meaning": "lo ngại, mối quan ngại",
        "sentence_text": "景気後退への懸念が高まっている。",
    }
    resp = await client.post("/api/v1/immersion/knowledge/events", json=payload, headers=headers)
    assert resp.status_code == 200
    item_id = resp.json()["item_id"]
    assert resp.json()["review_scheduled"] is True

    for term, reading, meaning in [
        ("対策", "たいさく", "biện pháp đối phó"),
        ("動向", "どうこう", "xu hướng động thái"),
    ]:
        extra = {
            "event_type": "ENCOUNTERED",
            "item_type": "VOCABULARY",
            "term": term,
            "reading": reading,
            "meaning": meaning,
            "sentence_text": f"市場対策の動向を注視する。",
        }
        resp = await client.post("/api/v1/immersion/knowledge/events", json=extra, headers=headers)
        assert resp.status_code == 200

    # Check due review count
    resp = await client.get("/api/v1/immersion/review/due", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["due_count"] >= 1

    # Start review session (AI distractors mocked: no fallback exists, AI error = 502)
    with patch(
        "app.services.knowledge_service.KnowledgeService._ai_session_distractors",
        new=AsyncMock(side_effect=_echo_distractors),
    ):
        resp = await client.post("/api/v1/immersion/review/session", json={"limit": 10}, headers=headers)
    assert resp.status_code == 200
    session_data = resp.json()
    assert session_data["items_total"] >= 1
    card = next((c for c in session_data["cards"] if c["item_id"] == item_id), session_data["cards"][0])
    assert card["item_id"] == item_id
    assert len(card["options"]) >= 3
    assert set(card["interval_preview"].keys()) == {"again", "hard", "good", "easy"}

    # Submit review answer rating (Rating 3 = GOOD)
    answer_payload = {
        "item_id": item_id,
        "item_type": "VOCABULARY",
        "rating": 3,
        "answer_was_correct": True,
    }
    resp = await client.post(
        f"/api/v1/immersion/review/session/{session_data['session_id']}/answer",
        json=answer_payload,
        headers=headers,
    )
    assert resp.status_code == 200
    ans_res = resp.json()
    assert ans_res["rating"] == 3
    assert ans_res["rating_label"] == "GOOD"
    assert ans_res["scheduled_days"] >= 1
    assert ans_res["new_mastery_score"] > 0

    # Check knowledge stats
    resp = await client.get("/api/v1/immersion/knowledge/stats", headers=headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total_vocabulary"] >= 1
    assert "recognition_vs_recall" in stats

    # Check knowledge gaps
    resp = await client.get("/api/v1/immersion/knowledge/gaps", headers=headers)
    assert resp.status_code == 200
    gaps_data = resp.json()
    assert "gaps" in gaps_data
    assert "summary" in gaps_data


@pytest.mark.asyncio
async def test_review_session_ai_failure_returns_502(client: AsyncClient):
    headers = {"X-User-Id": "review_ai_fail"}
    payload = {
        "event_type": "WORD_SAVED",
        "item_type": "VOCABULARY",
        "term": "曖昧",
        "reading": "あいまい",
        "meaning": "mơ hồ",
        "sentence_text": "彼の返事は曖昧だった。",
    }
    resp = await client.post("/api/v1/immersion/knowledge/events", json=payload, headers=headers)
    assert resp.status_code == 200

    # No fallback: AI distractor failure surfaces as 502 with a clear message
    with patch(
        "app.services.knowledge_service.KnowledgeService._ai_session_distractors",
        new=AsyncMock(return_value={}),
    ):
        resp = await client.post("/api/v1/immersion/review/session", json={"limit": 5}, headers=headers)
    assert resp.status_code == 502
    assert "nhiễu" in resp.json()["detail"]
