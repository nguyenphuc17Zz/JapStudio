"""API integration tests for Real-World Writing Mission endpoints (Phase 20)."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_mission_taxonomy_api(client: AsyncClient):
    """Test GET /api/v1/scenarios/mission-taxonomy returns all categories, actions, modes, and dimensions."""
    resp = await client.get("/api/v1/scenarios/mission-taxonomy")
    assert resp.status_code == 200
    data = resp.json()

    assert "categories" in data
    assert "actions" in data
    assert "prompt_modes" in data
    assert "evaluation_dimensions" in data

    assert len(data["categories"]) == 4
    assert len(data["actions"]) == 23
    assert len(data["prompt_modes"]) == 3
    assert len(data["evaluation_dimensions"]) == 10

    cat_ids = [c["id"] for c in data["categories"]]
    assert "daily_life" in cat_ids
    assert "work" in cat_ids
    assert "services" in cat_ids
    assert "social" in cat_ids


@pytest.mark.asyncio
async def test_generate_and_evaluate_mission_api_flow(client: AsyncClient):
    """Test end-to-end API lifecycle: generate mission -> evaluate response -> transition to simulation."""
    # 1. Generate real-world writing mission
    gen_resp = await client.post(
        "/api/v1/scenarios/mission/generate",
        json={
            "category": "work",
            "action_type": "progress_update",
            "prompt_mode": "vietnamese_scenario",
            "jlpt_level": "N3",
            "difficulty": 6,
        },
    )
    assert gen_resp.status_code == 201
    mission = gen_resp.json()
    scenario_id = mission["id"]

    assert mission["category"] == "work"
    assert mission["action_type"] == "progress_update"
    assert len(mission["role"]) > 0
    assert len(mission["recipient"]) > 0
    assert len(mission["required_points"]) >= 1
    assert len(mission["optional_vocabulary"]) >= 1

    # 2. Evaluate learner response
    eval_resp = await client.post(
        "/api/v1/scenarios/mission/evaluate",
        json={
            "scenario_id": scenario_id,
            "text": "佐藤部長、お疲れ様です。進捗状況をご報告いたします。開発は順調に進んでおり、明日完了予定です。",
        },
    )
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()

    assert "overall_score" in eval_data
    assert "passed" in eval_data
    assert "dimensions" in eval_data
    assert "task_completion" in eval_data["dimensions"]
    assert "factual_completeness" in eval_data["dimensions"]
    assert "naturalness" in eval_data["dimensions"]
    assert "grammar" in eval_data["dimensions"]
    assert "vocabulary" in eval_data["dimensions"]
    assert "register" in eval_data["dimensions"]
    assert "politeness" in eval_data["dimensions"]
    assert "tone" in eval_data["dimensions"]
    assert "clarity" in eval_data["dimensions"]
    assert "discourse" in eval_data["dimensions"]
    assert "native_model_rewrite" in eval_data
    assert len(eval_data["required_points"]) >= 1

    # 3. Transition to interactive simulation
    trans_resp = await client.post(
        f"/api/v1/scenarios/{scenario_id}/transition-simulation",
        json={
            "scenario_id": scenario_id,
            "initial_user_text": "佐藤部長、お疲れ様です。進捗のご報告です。",
        },
    )
    assert trans_resp.status_code == 200
    trans_data = trans_resp.json()

    assert "session_id" in trans_data
    assert trans_data["scenario_id"] == scenario_id
    assert trans_data["status"] == "active"
    assert len(trans_data["turns"]) == 2
    assert trans_data["turns"][0]["actor"] == "user"
    assert trans_data["turns"][1]["actor"] == "ai"
