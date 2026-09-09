"""Memory API tests (Phase 12): CRUD, archive, refresh, profile toggle."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestMemoryApi:
    async def test_list_empty(self, client: AsyncClient):
        response = await client.get("/api/v1/learning/memory")
        assert response.status_code == 200
        body = response.json()
        assert body["items"] == []
        assert body["total"] == 0

    async def test_create_explicit(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/learning/memory",
            json={
                "category": "preference",
                "type": "preference",
                "content": "Thích viết email công việc hơn tin nhắn thân mật.",
                "importance": 8,
            },
        )
        assert response.status_code == 201
        body = response.json()
        assert body["source_type"] == "user_explicit"
        assert body["status"] == "active"
        assert body["confidence"] == "high"

        listed = await client.get("/api/v1/learning/memory")
        assert listed.json()["total"] == 1

    async def test_get_by_id(self, client: AsyncClient):
        created = await client.post(
            "/api/v1/learning/memory",
            json={
                "category": "goal_memory",
                "type": "semantic",
                "content": "Mục tiêu JLPT N3.",
                "importance": 9,
            },
        )
        memory_id = created.json()["id"]
        response = await client.get(f"/api/v1/learning/memory/{memory_id}")
        assert response.status_code == 200
        assert response.json()["category"] == "goal_memory"
        assert response.json()["memory_class"] == "temporary"

    async def test_get_missing_returns_404(self, client: AsyncClient):
        response = await client.get("/api/v1/learning/memory/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    async def test_forget_deletes(self, client: AsyncClient):
        created = await client.post(
            "/api/v1/learning/memory",
            json={
                "category": "preference",
                "type": "preference",
                "content": "Ghi nhớ tạm.",
                "importance": 5,
            },
        )
        memory_id = created.json()["id"]
        response = await client.delete(f"/api/v1/learning/memory/{memory_id}")
        assert response.status_code == 204
        assert (await client.get(f"/api/v1/learning/memory/{memory_id}")).status_code == 404

    async def test_archive(self, client: AsyncClient):
        created = await client.post(
            "/api/v1/learning/memory",
            json={
                "category": "preference",
                "type": "preference",
                "content": "Ghi nhớ tạm.",
                "importance": 5,
            },
        )
        memory_id = created.json()["id"]
        response = await client.post(f"/api/v1/learning/memory/{memory_id}/archive")
        assert response.status_code == 200
        assert response.json()["status"] == "archived"

    async def test_refresh(self, client: AsyncClient):
        response = await client.post("/api/v1/learning/memory/refresh")
        assert response.status_code == 200
        body = response.json()
        assert "processed_events" in body
        assert "expired" in body

    async def test_filters(self, client: AsyncClient):
        await client.post(
            "/api/v1/learning/memory",
            json={
                "category": "goal_memory",
                "type": "semantic",
                "content": "Mục tiêu N4.",
                "importance": 8,
            },
        )
        response = await client.get("/api/v1/learning/memory", params={"category": "preference"})
        assert response.json()["total"] == 0
        response = await client.get("/api/v1/learning/memory", params={"category": "goal_memory"})
        assert response.json()["total"] == 1


@pytest.mark.asyncio
class TestMemoryToggle:
    async def test_profile_exposes_memory_enabled(self, client: AsyncClient):
        response = await client.get("/api/v1/learning/profile")
        assert response.status_code == 200
        assert response.json()["memory_enabled"] is True

    async def test_profile_disables_memory(self, client: AsyncClient):
        response = await client.put("/api/v1/learning/profile", json={"memory_enabled": False})
        assert response.status_code == 200
        assert response.json()["memory_enabled"] is False

        created = await client.post(
            "/api/v1/learning/memory",
            json={
                "category": "preference",
                "type": "preference",
                "content": "Ghi nhớ tạm.",
                "importance": 5,
            },
        )
        assert created.status_code == 201  # explicit creation still allowed
