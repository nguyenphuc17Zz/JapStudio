"""Simulation API tests (Phase 10): the seven endpoints over HTTP."""

from app.models import WritingScenario
from app.repositories import WritingScenarioRepository

from simulation_helpers import scenario_factory


async def _seed_scenario(session) -> WritingScenario:
    scenario = scenario_factory()
    await WritingScenarioRepository(session).add(scenario)
    return scenario


class TestCreateSession:
    async def test_create_session(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        response = await client.post(
            "/api/v1/simulations",
            json={"scenario_id": scenario.id, "mode": "guided"},
        )
        assert response.status_code == 201
        body = response.json()
        assert body["id"]
        assert body["status"] == "active"
        assert body["current_turn"] == 1
        assert len(body["turns"]) == 1
        assert body["turns"][0]["actor"] == "ai"
        assert body["turns"][0]["turn_type"] == "opening"
        assert body["state"]["objective"]

    async def test_create_session_immersive_mode(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        response = await client.post(
            "/api/v1/simulations",
            json={"scenario_id": scenario.id, "mode": "immersive"},
        )
        assert response.status_code == 201
        assert response.json()["mode"] == "immersive"

    async def test_create_session_invalid_mode(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        response = await client.post(
            "/api/v1/simulations",
            json={"scenario_id": scenario.id, "mode": "nope"},
        )
        assert response.status_code == 422

    async def test_create_session_missing_scenario(self, client) -> None:
        response = await client.post(
            "/api/v1/simulations",
            json={"scenario_id": "missing", "mode": "guided"},
        )
        assert response.status_code == 404


class TestSessionFlow:
    async def test_full_turn_flow(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        created = (
            await client.post(
                "/api/v1/simulations", json={"scenario_id": scenario.id, "mode": "guided"}
            )
        ).json()

        response = await client.post(
            f"/api/v1/simulations/{created['id']}/turns",
            json={"text": "今日は仕事が多くて、帰りが遅くなりました。"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["current_turn"] == 3
        turns = body["turns"]
        assert turns[1]["actor"] == "user"
        assert turns[1]["evaluation"]["overall_score"] > 0
        assert turns[2]["actor"] == "ai"

        detail = (await client.get(f"/api/v1/simulations/{created['id']}")).json()
        assert detail["id"] == created["id"]
        assert len(detail["turns"]) == 3

    async def test_turn_validation_error(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        created = (
            await client.post(
                "/api/v1/simulations", json={"scenario_id": scenario.id, "mode": "guided"}
            )
        ).json()
        response = await client.post(
            f"/api/v1/simulations/{created['id']}/turns",
            json={"text": ""},
        )
        assert response.status_code == 422

    async def test_turn_on_missing_session(self, client) -> None:
        response = await client.post(
            "/api/v1/simulations/missing/turns",
            json={"text": "こんにちは"},
        )
        assert response.status_code == 404

    async def test_end_early(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        created = (
            await client.post(
                "/api/v1/simulations", json={"scenario_id": scenario.id, "mode": "guided"}
            )
        ).json()
        response = await client.post(
            f"/api/v1/simulations/{created['id']}/turns",
            json={"text": "Dừng lại.", "end_early": True},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ended"
        assert body["resolution"] == "user_ended"


class TestListAndSummary:
    async def test_list_sessions(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        await client.post(
            "/api/v1/simulations", json={"scenario_id": scenario.id, "mode": "guided"}
        )
        response = await client.get("/api/v1/simulations")
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["simulation_type"]

    async def test_summary_endpoint(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        created = (
            await client.post(
                "/api/v1/simulations", json={"scenario_id": scenario.id, "mode": "guided"}
            )
        ).json()
        await client.post(
            f"/api/v1/simulations/{created['id']}/turns",
            json={"text": "今日は仕事が多くて、帰りが遅くなりました。"},
        )
        response = await client.get(f"/api/v1/simulations/{created['id']}/summary")
        assert response.status_code == 200
        body = response.json()
        assert body["summary_vi"]
        assert body["dimensions"]["overall"] > 0
        assert body["ai_generated"] is True

    async def test_summary_missing_session(self, client) -> None:
        response = await client.get("/api/v1/simulations/missing/summary")
        assert response.status_code == 404


class TestCoachAndExplain:
    async def test_coach(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        created = (
            await client.post(
                "/api/v1/simulations", json={"scenario_id": scenario.id, "mode": "guided"}
            )
        ).json()
        response = await client.post(
            f"/api/v1/simulations/{created['id']}/coach",
            json={"question": "Làm sao để nói tự nhiên hơn?"},
        )
        assert response.status_code == 200
        assert response.json()["answer"]

    async def test_explain_turn(self, client, session) -> None:
        scenario = await _seed_scenario(session)
        created = (
            await client.post(
                "/api/v1/simulations", json={"scenario_id": scenario.id, "mode": "guided"}
            )
        ).json()
        await client.post(
            f"/api/v1/simulations/{created['id']}/turns",
            json={"text": "今日は仕事が多くて、帰りが遅くなりました。"},
        )
        detail = (await client.get(f"/api/v1/simulations/{created['id']}")).json()
        user_turn = detail["turns"][1]
        response = await client.post(
            f"/api/v1/simulations/{created['id']}/turns/{user_turn['id']}/explain"
        )
        assert response.status_code == 200
        body = response.json()
        assert body["turn_id"] == user_turn["id"]
        assert body["corrections"]["minimal_fix"]


class TestFeatureGate:
    async def test_disabled_feature_returns_400(self, client, session, monkeypatch) -> None:
        from app.core.config import Settings
        from app.services.ai_config_service import AIConfigService

        scenario = await _seed_scenario(session)
        settings = Settings(ai_simulation_enabled=False)

        async def _effective(self, s):
            return settings

        monkeypatch.setattr(AIConfigService, "get_effective_settings", _effective)

        response = await client.post(
            "/api/v1/simulations",
            json={"scenario_id": scenario.id, "mode": "guided"},
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "feature_disabled"
