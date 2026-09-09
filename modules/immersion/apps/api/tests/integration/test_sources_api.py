import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_source(client: AsyncClient):
    payload = {
        "name": "NHK Easy News Test",
        "source_type": "rss",
        "category": "news",
        "feed_url": "https://www3.nhk.or.jp/news/easy/news-list.json",
        "base_url": "https://www3.nhk.or.jp/news/easy/",
        "description": "Simplified Japanese news for learners",
        "sync_interval_minutes": 60,
        "config_json": {"level": "easy"},
        "headers_json": {"User-Agent": "CustomTestBot/1.0"},
        "credential": {
            "auth_type": "api_key",
            "secret": "super_secret_key_12345",
            "key_name": "X-API-KEY"
        }
    }
    # 1. Create
    resp = await client.post("/api/v1/sources", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    source_id = data["id"]
    assert data["name"] == "NHK Easy News Test"
    assert data["status"] == "active"
    assert data["health_status"] == "unknown"
    # Verify credential secret is NOT exposed in plaintext
    assert data["credential"] is not None
    assert data["credential"]["masked_secret"] != "super_secret_key_12345"
    assert "super" not in data["credential"]["masked_secret"]

    # 2. Get by ID
    get_resp = await client.get(f"/api/v1/sources/{source_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == source_id

    # 3. List
    list_resp = await client.get("/api/v1/sources?category=news")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 4. Update
    update_payload = {
        "name": "NHK Easy News Updated",
        "status": "paused",
        "sync_interval_minutes": 120
    }
    put_resp = await client.put(f"/api/v1/sources/{source_id}", json=update_payload)
    assert put_resp.status_code == 200
    assert put_resp.json()["name"] == "NHK Easy News Updated"
    assert put_resp.json()["status"] == "paused"
    assert put_resp.json()["sync_interval_minutes"] == 120

    # 5. Stats
    stats_resp = await client.get("/api/v1/sources/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_sources"] >= 1
    assert stats["paused_sources"] >= 1

    # 6. Bulk Action
    bulk_payload = {
        "source_ids": [source_id],
        "action": "activate"
    }
    bulk_resp = await client.post("/api/v1/sources/bulk", json=bulk_payload)
    assert bulk_resp.status_code == 200
    assert bulk_resp.json()["affected_count"] == 1

    # 7. Activity Logs
    logs_resp = await client.get(f"/api/v1/sources/{source_id}/logs")
    assert logs_resp.status_code == 200
    logs = logs_resp.json()
    assert len(logs) >= 1
    assert any(log["action"] in ("create", "config_update") for log in logs)

    # 8. Export & Import
    export_resp = await client.get("/api/v1/sources/export")
    assert export_resp.status_code == 200
    exported_data = export_resp.json()
    assert "sources" in exported_data

    import_resp = await client.post("/api/v1/sources/import", json=exported_data)
    assert import_resp.status_code == 200
    assert import_resp.json()["imported_count"] >= 1

    # 9. Delete
    del_resp = await client.delete(f"/api/v1/sources/{source_id}")
    assert del_resp.status_code == 204
    # Ensure gone
    get_gone = await client.get(f"/api/v1/sources/{source_id}")
    assert get_gone.status_code == 404
