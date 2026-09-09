"""AI quality + benchmark API tests (Phase 11)."""

from app.api.v1 import quality as quality_api
from app.core.config import Settings
from app.quality.telemetry import telemetry


def _production_settings() -> Settings:
    settings = Settings(
        app_env="production",
        ai_quality_diagnostics_enabled=False,
    )
    return settings


async def test_quality_status(client) -> None:
    response = await client.get("/api/v1/ai/quality/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is True
    assert "writing_evaluation" in payload["tasks"]
    assert payload["criticality"]["writing_evaluation"] == "high"
    assert payload["thresholds"]["max_retries"] >= 1


async def test_quality_telemetry(client) -> None:
    response = await client.get("/api/v1/ai/quality/telemetry")
    assert response.status_code == 200
    payload = response.json()
    assert "total_events" in payload
    assert "tasks" in payload


async def test_quality_prompts(client) -> None:
    response = await client.get("/api/v1/ai/quality/prompts")
    assert response.status_code == 200
    payload = response.json()
    assert payload
    assert set(payload[0]) == {
        "task",
        "version",
        "description",
        "criticality",
        "cost_profile",
        "output_schema",
    }


async def test_benchmark_run_persists(client) -> None:
    response = await client.post(
        "/api/v1/ai/benchmark/run",
        json={"categories": ["semantic"], "limit": 2},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["aggregate"]["cases"] == 2
    assert payload["aggregate"]["schema_pass_rate"] == 1.0

    run_id = payload["id"]
    detail = await client.get(f"/api/v1/ai/benchmark/{run_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == run_id

    results = await client.get(f"/api/v1/ai/benchmark/{run_id}/results")
    assert results.status_code == 200
    assert len(results.json()) == 2


async def test_benchmark_run_no_cases(client) -> None:
    response = await client.post(
        "/api/v1/ai/benchmark/run",
        json={"categories": ["no_such_category"]},
    )
    assert response.status_code == 404


async def test_benchmark_missing_run_404(client) -> None:
    response = await client.get("/api/v1/ai/benchmark/missing-run-id")
    assert response.status_code == 404
    results = await client.get("/api/v1/ai/benchmark/missing-run-id/results")
    assert results.status_code == 404


async def test_diagnostics_gated_in_production(client, monkeypatch) -> None:
    monkeypatch.setattr(quality_api, "get_settings", lambda: _production_settings())
    for path in (
        "/api/v1/ai/quality/status",
        "/api/v1/ai/quality/telemetry",
        "/api/v1/ai/quality/prompts",
    ):
        response = await client.get(path)
        assert response.status_code == 404, path
    response = await client.post("/api/v1/ai/benchmark/run", json={})
    assert response.status_code == 404


async def test_telemetry_snapshot_matches_in_memory_store(client) -> None:
    snapshot = telemetry.snapshot()
    response = await client.get("/api/v1/ai/quality/telemetry")
    assert response.status_code == 200
    assert response.json()["total_events"] == snapshot["total_events"]
