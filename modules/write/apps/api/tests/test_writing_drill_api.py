"""API integration tests for Writing Drill endpoints (Phase 18)."""

import pytest
from app.models.writing_intelligence import WritingWeakness
from app.repositories.writing_intelligence import WritingWeaknessRepository
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_writing_drill_endpoints_full_lifecycle(client: AsyncClient, session):
    # 1. Seed a weakness
    repo = WritingWeaknessRepository(session)
    weakness = await repo.add(
        WritingWeakness(
            user_id=None,
            category="grammar",
            subtype="particles",
            description="Dùng nhầm trợ từ に và で",
            examples=["カフェに勉強する"],
            mastery_score=0.25,
            status="recurring",
        )
    )

    # 2. Check due drills
    due_res = await client.get("/api/v1/writing/drills/due")
    assert due_res.status_code == 200
    due_data = due_res.json()
    assert due_data["total"] >= 1
    assert any(d["weakness_id"] == weakness.id for d in due_data["items"])

    # 3. Generate drill session
    gen_res = await client.post(
        "/api/v1/writing/drills/generate",
        json={"weakness_id": weakness.id, "jlpt_level": "N3"},
    )
    assert gen_res.status_code == 201
    drill_data = gen_res.json()
    drill_id = drill_data["id"]
    assert drill_data["status"] == "active"
    assert drill_data["total_items"] >= 3
    assert len(drill_data["items"]) >= 3

    # 4. Get drill session
    get_res = await client.get(f"/api/v1/writing/drills/{drill_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == drill_id

    # 5. Request hint
    hint_res = await client.post(f"/api/v1/writing/drills/{drill_id}/hint")
    assert hint_res.status_code == 200
    hint_json = hint_res.json()
    assert hint_json["hints_revealed_count"] == 1

    # 6. Reveal answer
    reveal_res = await client.post(f"/api/v1/writing/drills/{drill_id}/reveal")
    assert reveal_res.status_code == 200
    reveal_json = reveal_res.json()
    assert "target_answer" in reveal_json

    # 7. Submit attempt
    item_0 = drill_data["items"][0]
    target_ans = item_0.get("target_answer") or "で"
    att_res = await client.post(
        f"/api/v1/writing/drills/{drill_id}/attempt",
        json={"answer_text": target_ans, "item_index": 0},
    )
    assert att_res.status_code == 200
    att_data = att_res.json()
    assert att_data["is_correct"] is True
    assert att_data["score"] >= 70

    # 8. List drill sessions
    list_res = await client.get("/api/v1/writing/drills")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
