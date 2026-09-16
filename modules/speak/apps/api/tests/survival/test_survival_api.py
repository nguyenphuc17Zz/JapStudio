"""Integration tests for Survival API endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import create_app

app = create_app()


@pytest.mark.asyncio
async def test_get_survival_topics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/survival/topics")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 5
        assert any(t["id"] == "kitchen" for t in data)


@pytest.mark.asyncio
async def test_get_survival_task():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Circumlocution task
        resp = await client.get("/api/v1/survival/task?mode=circumlocution")
        assert resp.status_code == 200
        data = resp.json()
        assert "target_word" in data
        assert "forbidden_words" in data

        # 2. Scenarios task
        resp2 = await client.get("/api/v1/survival/task?mode=scenarios")
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert "npc_utterance_ja" in data2
        assert "recommended_strategy" in data2


@pytest.mark.asyncio
async def test_evaluate_circumlocution_attempt():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "mode": "circumlocution",
            "task_id": "circ_microwave",
            "spoken_text": "ご飯をチンして温める機械です。",
            "ttfw_ms": 1800,
            "hint_tier_used": 0,
        }
        resp = await client.post("/api/v1/survival/evaluate", json=payload)
        assert resp.status_code == 200
        res = resp.json()
        assert res["is_successful"] is True
        assert res["overall_score"] >= 80
        assert res["taboo_violated"] is False


@pytest.mark.asyncio
async def test_sos_hint_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "last_ai_message": "昨日のイベント、どうだった？",
            "relationship": "casual",
        }
        resp = await client.post("/api/v1/survival/sos-hint", json=payload)
        assert resp.status_code == 200
        res = resp.json()
        assert "suggestions" in res
        assert len(res["suggestions"]) >= 3
