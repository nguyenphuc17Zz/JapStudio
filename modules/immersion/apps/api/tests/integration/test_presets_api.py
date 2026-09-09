import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_presets_list_and_install(client: AsyncClient):
    # 1. List presets
    resp = await client.get("/api/v1/presets")
    assert resp.status_code == 200
    groups = resp.json()
    assert len(groups) >= 4  # News, Tech, Social, Culture
    categories = [g["category"] for g in groups]
    assert "news" in categories
    assert "tech" in categories
    assert "social" in categories
    assert "culture" in categories

    # 2. Install specific presets
    install_payload = {
        "preset_keys": ["nhk-general-news", "qiita-trending"]
    }
    install_resp = await client.post("/api/v1/presets/install", json=install_payload)
    assert install_resp.status_code == 200
    assert install_resp.json()["installed_count"] == 2

    # 3. Verify in sources list
    sources_resp = await client.get("/api/v1/sources")
    assert sources_resp.status_code == 200
    sources = sources_resp.json()
    slugs = [s["slug"] for s in sources]
    assert "nhk-general-news" in slugs
    assert "qiita-trending" in slugs

    # 4. Idempotency test (installing again skips duplicates)
    reinstall_resp = await client.post("/api/v1/presets/install", json=install_payload)
    assert reinstall_resp.status_code == 200
    assert reinstall_resp.json()["installed_count"] == 0
    assert reinstall_resp.json()["skipped_count"] == 2
