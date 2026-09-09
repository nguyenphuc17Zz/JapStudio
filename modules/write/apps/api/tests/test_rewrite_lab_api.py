"""API integration tests for Rewrite Lab & Self-Correction endpoints (Phase 19)."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_rewrite_lab_api_flow(client: AsyncClient):
    """Test full API lifecycle of a Rewrite Lab session."""
    # 1. Create session (Step 1 & 2)
    create_resp = await client.post(
        "/api/v1/rewrite-lab/sessions",
        json={
            "text": "私は日本語を勉強することが楽しいです。",
            "context_vi": "Tôi thích học tiếng Nhật.",
        },
    )
    assert create_resp.status_code == 201
    session_data = create_resp.json()
    session_id = session_data["id"]
    assert session_data["has_issue"] is True
    assert session_data["current_step"] == 2
    assert session_data["status"] == "active"

    # 2. Get session
    get_resp = await client.get(f"/api/v1/rewrite-lab/sessions/{session_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == session_id

    # 3. Submit attempt (Step 3)
    attempt_resp = await client.post(
        f"/api/v1/rewrite-lab/sessions/{session_id}/attempt",
        json={"attempt_text": "日本語を勉強するのが楽しいです。"},
    )
    assert attempt_resp.status_code == 200
    attempt_data = attempt_resp.json()
    assert "is_correct" in attempt_data
    assert "feedback_vi" in attempt_data

    # 4. Reveal rewrites (Step 6)
    reveal_resp = await client.post(
        f"/api/v1/rewrite-lab/sessions/{session_id}/reveal"
    )
    assert reveal_resp.status_code == 200
    reveal_data = reveal_resp.json()
    assert "minimal_correction" in reveal_data
    assert "natural_japanese" in reveal_data

    # 5. Generate transfer task
    transfer_resp = await client.post(
        f"/api/v1/rewrite-lab/sessions/{session_id}/transfer"
    )
    assert transfer_resp.status_code == 200
    transfer_task = transfer_resp.json()
    assert "scenario_prompt_vi" in transfer_task

    # 6. Submit transfer attempt
    transfer_eval_resp = await client.post(
        f"/api/v1/rewrite-lab/sessions/{session_id}/transfer/attempt",
        json={"transfer_text": "週末に料理を作るのがとても楽しいです。"},
    )
    assert transfer_eval_resp.status_code == 200
    transfer_eval_data = transfer_eval_resp.json()
    assert "transferred_successfully" in transfer_eval_data
    assert "score" in transfer_eval_data

    # 7. Transform single mode
    transform_resp = await client.post(
        "/api/v1/rewrite-lab/transform",
        json={
            "text": "私は日本語を勉強することが楽しいです。",
            "mode": "natural",
        },
    )
    assert transform_resp.status_code == 200
    assert "mode" in transform_resp.json()
    assert "rewritten_text" in transform_resp.json()

    # 8. Linguistic Diff
    diff_resp = await client.post(
        "/api/v1/rewrite-lab/diff",
        json={
            "before": "私は日本語を勉強することが楽しいです。",
            "after": "日本語を勉強するのが楽しいです。",
        },
    )
    assert diff_resp.status_code == 200
    assert "chunks" in diff_resp.json()

    # 9. Socratic Coach
    coach_resp = await client.post(
        "/api/v1/rewrite-lab/coach",
        json={
            "question": "Tại sao dùng の lại tự nhiên hơn こと?",
            "session_id": session_id,
        },
    )
    assert coach_resp.status_code == 200
    assert "answer" in coach_resp.json()

    # 10. Recent Snippets
    snippets_resp = await client.get("/api/v1/rewrite-lab/recent-snippets?limit=10")
    assert snippets_resp.status_code == 200
    snippets_data = snippets_resp.json()
    assert "snippets" in snippets_data
    assert "total" in snippets_data

