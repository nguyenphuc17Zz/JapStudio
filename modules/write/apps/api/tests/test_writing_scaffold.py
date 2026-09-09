import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_writing_scaffold_endpoint(client: AsyncClient):
    payload = {
        "prompt_vi": "Viết email xin nghỉ phép gửi cấp trên vì lý do gia đình.",
        "context_vi": "Bạn là nhân viên công ty Nhật Bản.",
        "jlpt_level": "N3",
        "register": "business",
        "genre": "email",
        "keywords": ["有給休暇", "体調不良"],
    }
    response = await client.post("/api/v1/writing/scaffold", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "outline_steps" in data
    assert len(data["outline_steps"]) >= 1
    assert "idea_angles" in data
    assert len(data["idea_angles"]) >= 1
    assert "golden_phrases" in data
    assert len(data["golden_phrases"]) >= 1
    assert "starter" in data["idea_angles"][0]
    assert "japanese" in data["golden_phrases"][0]
