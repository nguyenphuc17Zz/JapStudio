import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_explore_page_and_trending_topics(client: AsyncClient):
    """Verifies /explore endpoint returns Trending Today, Categories, and Rabbit Hole starters."""
    resp = await client.get("/api/v1/immersion/explore")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "trending_today" in data
    assert len(data["trending_today"]) >= 1
    assert "gaining_attention" in data
    assert "categories" in data
    assert len(data["categories"]) >= 3
    assert "rabbit_hole_starters" in data

    # Verify Trending endpoint
    t_resp = await client.get("/api/v1/immersion/trending?limit=5")
    assert t_resp.status_code == 200
    t_data = t_resp.json()
    assert len(t_data["items"]) >= 1
    top_trend = t_data["items"][0]
    assert "trend_score" in top_trend
    assert "fire_count" in top_trend
    assert top_trend["fire_count"] >= 1


@pytest.mark.asyncio
async def test_topic_detail_and_multi_source_lens(client: AsyncClient):
    """Verifies multi-source topic view, timeline, and register lens comparison."""
    # 1. Fetch explore to get an existing slug
    resp = await client.get("/api/v1/immersion/explore")
    assert resp.status_code == 200
    topics = resp.json()["trending_today"]
    assert len(topics) > 0
    slug = topics[0]["slug"]
    topic_id = topics[0]["topic_id"]

    # 2. Get Topic Detail
    detail_resp = await client.get(f"/api/v1/immersion/topics/{slug}")
    assert detail_resp.status_code == 200, detail_resp.text
    detail = detail_resp.json()
    assert detail["topic"]["slug"] == slug
    assert "register_comparison" in detail
    assert len(detail["register_comparison"]) >= 3
    # Check that FORMAL, CASUAL, and INTERNET registers are present
    reg_types = [rc["register"] for rc in detail["register_comparison"]]
    assert "FORMAL" in reg_types
    assert "CASUAL" in reg_types
    assert "INTERNET" in reg_types

    # 3. Get Topic Timeline
    time_resp = await client.get(f"/api/v1/immersion/topics/{slug}/timeline")
    assert time_resp.status_code == 200
    time_data = time_resp.json()
    assert time_data["slug"] == slug
    assert "events" in time_data

    # 4. Get Topic Comparison
    comp_resp = await client.get(f"/api/v1/immersion/topics/{slug}/compare")
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert "news_lens" in comp_data
    assert "social_lens" in comp_data
    assert "blog_lens" in comp_data
    assert "divergence_summary" in comp_data

    # 5. Get Rabbit Hole Exploration
    rh_resp = await client.get(f"/api/v1/immersion/rabbit-hole/TOPIC/{topic_id}")
    assert rh_resp.status_code == 200
    rh_data = rh_resp.json()
    assert "current_node" in rh_data
    assert "related_nodes" in rh_data
    assert len(rh_data["related_nodes"]) >= 1


@pytest.mark.asyncio
async def test_admin_trends_and_moderation(client: AsyncClient):
    """Verifies admin trends dashboard and topic moderation status updates."""
    # List trends
    resp = await client.get("/api/v1/immersion/admin/trends")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    first_topic = data["trends"][0]
    topic_id = first_topic["topic_id"]

    # Moderate topic to HIDDEN
    mod_resp = await client.post(
        f"/api/v1/immersion/admin/topics/{topic_id}/moderate",
        json={"moderation_status": "HIDDEN"},
    )
    assert mod_resp.status_code == 200
    assert mod_resp.json()["new_status"] == "HIDDEN"

    # Verify topic is now hidden from explore page
    exp_resp = await client.get("/api/v1/immersion/explore")
    assert exp_resp.status_code == 200
    exp_data = exp_resp.json()
    assert not any(t["topic_id"] == topic_id for t in exp_data["trending_today"])

    # Restore to VISIBLE
    await client.post(
        f"/api/v1/immersion/admin/topics/{topic_id}/moderate",
        json={"moderation_status": "VISIBLE"},
    )
