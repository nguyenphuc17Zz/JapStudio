"""Analytics API: learner summary, recommendations, experiments, gating (Phase 14)."""

from app.models.analytics import OptimizationRecommendation
from tests.analytics_helpers import days_ago, make_attempt, make_exercise, make_quality_event


async def _seed_learner(session) -> None:
    exercise = await make_exercise(session)
    await make_attempt(session, exercise, score=70, when=days_ago(20))
    await make_attempt(session, exercise, score=90, attempt_number=2, when=days_ago(2))
    hard_exercise = await make_exercise(session, difficulty=9)
    await make_attempt(session, hard_exercise, score=55, when=days_ago(20))
    await make_attempt(session, hard_exercise, score=60, attempt_number=2, when=days_ago(2))
    from app.models.writing import WritingScenario

    scenario = WritingScenario(
        user_id=None,
        genre="business_email",
        medium="email",
        audience="colleague",
        relationship="colleague",
        purpose="request",
        register="polite",
        tone="formal",
        target_length="long_writing",
        jlpt_level="N3",
        topic="Work",
        situation_vi="Tình huống.",
        context_vi="Bối cảnh.",
        required_points=[],
        optional_points=[],
        forbidden_patterns=[],
        difficulty_metadata={},
        difficulty=5,
        status="generated",
    )
    session.add(scenario)
    await session.flush()
    scenario_exercise = await make_exercise(session, scenario_id=scenario.id)
    await make_attempt(session, scenario_exercise, score=85, when=days_ago(2))
    await session.commit()


async def test_learner_summary_un_gated(client, session) -> None:
    await _seed_learner(session)
    response = await client.get("/api/v1/analytics/learner-summary")
    assert response.status_code == 200
    body = response.json()
    assert body["window"] == "30d"
    assert len(body["skills"]) == 12
    assert "generated_at" in body


async def test_summary_endpoint(client, session) -> None:
    await _seed_learner(session)
    response = await client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["total_attempts"] == 5
    assert body["active_days"] >= 2
    assert body["evaluation_attempts"] == 5
    assert body["window"] == "30d"


async def test_recommendations_list_and_decision(client, session) -> None:
    await _seed_learner(session)

    list_response = await client.get("/api/v1/analytics/recommendations")
    assert list_response.status_code == 200
    assert list_response.json()["items"] == []

    draft = await client.post(
        "/api/v1/analytics/recommendations/draft",
        json={"area": "exercise_difficulty", "finding": "Thá»­ nghiá»‡m Ä‘á»™ khÃ³."},
    )
    assert draft.status_code == 200
    recommendation = draft.json()
    assert recommendation["status"] == "pending"
    assert recommendation["source"] == "ai_draft"

    decision = await client.post(
        f"/api/v1/analytics/recommendations/{recommendation['id']}/decision",
        json={"decision": "accept", "note": "Đồng ý"},
    )
    assert decision.status_code == 200
    assert decision.json()["status"] == "accepted"

    list_response = await client.get("/api/v1/analytics/recommendations")
    assert len(list_response.json()["items"]) == 1
    assert list_response.json()["total"] == 1


async def test_recommendation_decision_rejects_non_pending(client, session) -> None:
    recommendation = OptimizationRecommendation(
        area="exercise_difficulty",
        priority="medium",
        finding="Finding.",
        recommended_action="reduce difficulty of N3 exercises.",
        evidence=["difficulty.N3.5.avg_score"],
        confidence="medium",
        inference_type="observation",
        source="ai_draft",
        status="implemented",
        metric_snapshot_id="30d",
    )
    session.add(recommendation)
    await session.commit()

    response = await client.post(
        f"/api/v1/analytics/recommendations/{recommendation.id}/decision",
        json={"decision": "accept"},
    )
    assert response.status_code == 409


async def test_experiment_lifecycle_api(client, session) -> None:
    await _seed_learner(session)

    created = await client.post(
        "/api/v1/analytics/experiments",
        json={
            "name": "challenge_wording",
            "description": "Thá»­ nghiá»‡m cÃ¡ch diá»…n Ä‘áº¡t thá»­ thÃ¡ch.",
            "target": "challenge",
            "control": {"wording": "control"},
            "variant": {"wording": "variant"},
            "allocation": 50,
            "metrics": ["completion_rate", "avg_score"],
        },
    )
    assert created.status_code == 201
    experiment_id = created.json()["id"]
    assert created.json()["status"] == "draft"

    listed = await client.get("/api/v1/analytics/experiments")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    assigned = await client.post(
        f"/api/v1/analytics/experiments/{experiment_id}/assign",
        json={"user_id": None},
    )
    assert assigned.status_code == 200
    assert assigned.json()["arm"] in ("control", "variant")

    metrics = await client.get(f"/api/v1/analytics/experiments/{experiment_id}/metrics")
    assert metrics.status_code == 200
    assert metrics.json()["comparisons"][0]["metric"] == "completion_rate"

    analyzed = await client.post(f"/api/v1/analytics/experiments/{experiment_id}/analyze")
    assert analyzed.status_code == 200
    assert analyzed.json()["winner"] == "variant"


async def test_product_analysis_api(client, session) -> None:
    await _seed_learner(session)
    await make_quality_event(session, created_at=days_ago(1))
    await session.commit()

    response = await client.post(
        "/api/v1/analytics/analyze",
        json={"window": "30d"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["recommendations"]) == 2
    assert all(item["status"] == "pending" for item in body["recommendations"])
    assert len(body["insights"]) == 2


async def test_production_gating_returns_404(client, monkeypatch) -> None:
    from app.api.v1 import analytics as analytics_module
    from app.core.config import Settings

    monkeypatch.setattr(
        analytics_module,
        "get_settings",
        lambda: Settings(app_env="production", ai_analytics_enabled=True),
    )

    response = await client.get("/api/v1/analytics/summary")
    assert response.status_code == 404

    response = await client.get("/api/v1/analytics/learner-summary")
    assert response.status_code == 200


async def test_outcomes_and_daily_metrics_endpoints(client, session) -> None:
    await _seed_learner(session)

    outcomes = await client.get("/api/v1/analytics/learning-outcomes?window=30d")
    assert outcomes.status_code == 200
    assert len(outcomes.json()["skills"]) == 12

    daily = await client.get("/api/v1/analytics/daily-metrics")
    assert daily.status_code == 200
    assert daily.json()["items"] == []
