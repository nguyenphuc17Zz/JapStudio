"""Tests for cultural API endpoints (Hanko, Haiku, Omikuji, Kotowaza, Kitsune)."""

import pytest


@pytest.mark.asyncio
async def test_hanko_suggestion_endpoint(client) -> None:
    response = await client.post(
        "/api/v1/culture/hanko/suggest",
        json={"name": "Phuc Nguyen"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name_input"] == "Phuc Nguyen"
    assert len(data["options"]) > 0
    assert "kanji" in data["options"][0]
    assert "meaning_vi" in data["options"][0]


@pytest.mark.asyncio
async def test_haiku_generation_endpoint(client) -> None:
    response = await client.post(
        "/api/v1/culture/haiku/generate",
        json={"season": "Xuân", "theme": "Tĩnh lặng", "streak_days": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["lines_jp"]) == 3
    assert len(data["lines_reading"]) == 3
    assert data["translation_vi"]
    assert data["kigo"]


@pytest.mark.asyncio
async def test_omikuji_draw_endpoint(client) -> None:
    response = await client.post(
        "/api/v1/culture/omikuji/draw",
        json={"clan_id": "sakura", "study_focus": "ngữ pháp"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "rank" in data and data["rank"]
    assert "waka_jp" in data
    assert "writing_advice" in data
    assert "lucky_kanji" in data
    assert "lucky_grammar" in data


@pytest.mark.asyncio
async def test_kotowaza_random_endpoint(client) -> None:
    response = await client.post(
        "/api/v1/culture/kotowaza/random",
        json={"category": "kiên trì", "jlpt_level": "N3"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["expression_jp"]
    assert data["reading"]
    assert data["vietnamese_equivalent"]
    assert data["example_sentence_jp"]


@pytest.mark.asyncio
async def test_kitsune_dialogue_endpoint(client) -> None:
    response = await client.post(
        "/api/v1/culture/kitsune/dialogue",
        json={"streak": 3, "today_completed_count": 2, "current_clan": "sakura", "page_context": "dashboard"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mood"]
    assert data["message_vi"]
    assert data["action_tip"]


@pytest.mark.asyncio
async def test_kitsune_chat_endpoint(client) -> None:
    response = await client.post(
        "/api/v1/culture/kitsune/chat",
        json={
            "messages": [
                {"role": "user", "content": "Cáo ơi đố ta một câu chữ Hán đi!"}
            ],
            "clan_id": "ryu",
            "page_context": "practice",
            "streak": 5,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data and len(data["reply"]) > 0
    assert "mood" in data
    assert isinstance(data.get("suggested_chips", []), list)

