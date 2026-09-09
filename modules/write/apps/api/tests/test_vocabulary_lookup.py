"""Tests for AI Contextual Vocabulary Lookup & Save Lookup endpoints."""

import pytest


@pytest.mark.asyncio
async def test_ai_vocabulary_lookup_success(client, session):
    response = await client.post(
        "/api/v1/vocabulary/ai-lookup",
        json={
            "query": "bàn bạc lại",
            "context": "Tôi muốn bàn bạc lại về tiến độ dự án do phát sinh một số vấn đề.",
            "direction": "vi_to_ja",
            "register_preference": "business",
            "target_level": "N2",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "bàn bạc lại"
    assert data["detected_direction"] == "vi_to_ja"
    assert data["best_match"]["expression"] == "すり合わせる"
    assert data["best_match"]["reading"] == "すりあわせる"
    assert data["best_match"]["meaning_vi"]
    assert data["best_match"]["nuance_explanation"]
    assert len(data["alternatives"]) >= 1


@pytest.mark.asyncio
async def test_save_lookup_vocabulary_and_idempotent(client, session):
    # 1. Save a new lookup entry
    payload = {
        "expression": "すり合わせる",
        "reading": "すりあわせる",
        "meaning_vi": "Bàn bạc, đối chiếu, thống nhất",
        "part_of_speech": "動詞",
        "estimated_jlpt_level": "N2",
        "difficulty": 6,
        "register": "business",
        "nuance_explanation": "Dùng khi đối chiếu và thống nhất lại các điểm mấu chốt trong công việc.",
        "example_sentence": "進捗スケジュールをすり合わせる。",
    }
    res1 = await client.post("/api/v1/vocabulary/save-lookup", json=payload)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["is_new"] is True
    entry_id = d1["entry_id"]

    # 2. Check that it appears in vocabulary bank
    res_list = await client.get("/api/v1/vocabulary?search=すり合わせる")
    assert res_list.status_code == 200
    list_data = res_list.json()
    assert list_data["total"] >= 1
    found = next((x for x in list_data["items"] if x["expression"] == "すり合わせる"), None)
    assert found is not None
    assert found["reading"] == "すりあわせる"

    # 3. Save again -> idempotent update (is_new=False)
    res2 = await client.post("/api/v1/vocabulary/save-lookup", json=payload)
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["is_new"] is False
    assert d2["entry_id"] == entry_id
