"""Advisory AI product analysis (Phase 14)."""

from app.models.writing import WritingScenario
from app.providers.ai.base import AIGenerationResult
from app.providers.ai.fake import FakeAIProvider
from app.schemas.analytics_ai import ProductAnalysisResult
from app.services.ai_service import AIService
from app.services.analytics.analysis import AnalyticsAnalysisService
from tests.analytics_helpers import days_ago, make_attempt, make_exercise, make_quality_event

WINDOW = "30d"


def _ai_service(provider: FakeAIProvider) -> AIService:
    from app.providers.ai.router import AIRouter

    router = AIRouter(providers={"fake": lambda: provider}, default_provider="fake")
    return AIService(ai_router=router)


async def _seed_evidence(session) -> None:
    exercise = await make_exercise(session)
    await make_attempt(session, exercise, score=70, when=days_ago(20))
    await make_attempt(session, exercise, score=90, attempt_number=2, when=days_ago(2))
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
    await make_quality_event(session, task="writing_evaluation", created_at=days_ago(1))
    await session.commit()


async def test_product_analysis_persists_recommendations(session) -> None:
    await _seed_evidence(session)
    service = AnalyticsAnalysisService(session, _ai_service(FakeAIProvider()))
    result = await service.product_analysis(WINDOW)
    assert len(result["recommendations"]) == 2
    recommendation = result["recommendations"][0]
    assert recommendation.status == "pending"
    assert recommendation.source == "ai_product_analysis"
    assert recommendation.area == "scenario_generation"
    assert recommendation.inference_type in ("observation", "comparison")
    assert set(recommendation.evidence) <= {
        "feature.scenario.business_email.usefulness",
        "outcome.register_fit.30d.delta",
        "provider.writing_evaluation.30d.quality_pass_rate",
    }


async def test_product_analysis_rejects_fabricated_evidence(session) -> None:
    await _seed_evidence(session)

    class FabricatingProvider(FakeAIProvider):
        async def generate_structured(self, prompt, response_model, **kwargs):
            if response_model is ProductAnalysisResult:
                return (
                    ProductAnalysisResult(
                        insights=[
                            {
                                "area": "scenario_generation",
                                "priority": "high",
                                "finding": "Fabricated finding.",
                                "recommended_action": "increase scenario exposure.",
                                "evidence": ["metric.does.not.exist"],
                                "confidence": "high",
                                "inference_type": "observation",
                            }
                        ]
                    ),
                    AIGenerationResult(
                        text=prompt,
                        provider=self.name,
                        model=self._model,
                        usage=self._usage(prompt, prompt),
                    ),
                )
            return await super().generate_structured(prompt, response_model, **kwargs)

    service = AnalyticsAnalysisService(session, _ai_service(FabricatingProvider()))
    result = await service.product_analysis(WINDOW)
    assert result["recommendations"] == []
    assert result["rejected"]


async def test_product_analysis_rejects_causal_language(session) -> None:
    await _seed_evidence(session)

    class CausalProvider(FakeAIProvider):
        async def generate_structured(self, prompt, response_model, **kwargs):
            if response_model is ProductAnalysisResult:
                return (
                    ProductAnalysisResult(
                        insights=[
                            {
                                "area": "scenario_generation",
                                "priority": "medium",
                                "finding": "Users improved because of this feature.",
                                "recommended_action": "keep scenario exposure.",
                                "evidence": ["outcome.register_fit.30d.delta"],
                                "confidence": "medium",
                                "inference_type": "observation",
                            }
                        ]
                    ),
                    AIGenerationResult(
                        text=prompt,
                        provider=self.name,
                        model=self._model,
                        usage=self._usage(prompt, prompt),
                    ),
                )
            return await super().generate_structured(prompt, response_model, **kwargs)

    service = AnalyticsAnalysisService(session, _ai_service(CausalProvider()))
    result = await service.product_analysis(WINDOW)
    assert result["recommendations"] == []
    assert any("causal" in message or "because" in message for message in result["rejected"])


async def test_draft_recommendation_persists(session) -> None:
    exercise = await make_exercise(session, difficulty=9)
    await make_attempt(session, exercise, score=55, when=days_ago(20))
    await make_attempt(session, exercise, score=60, attempt_number=2, when=days_ago(2))
    await session.commit()
    service = AnalyticsAnalysisService(session, _ai_service(FakeAIProvider()))
    result = await service.draft_recommendation(area="exercise_difficulty", finding="Test finding.")
    assert result["draft"] is not None
    assert result["draft"].source == "ai_draft"
    assert result["draft"].status == "pending"


async def test_collect_metrics_produces_valid_ids(session) -> None:
    await _seed_evidence(session)
    service = AnalyticsAnalysisService(session, _ai_service(FakeAIProvider()))
    points, metric_ids = await service.collect_metrics(WINDOW)
    assert metric_ids
    assert "outcome.register_fit.30d.delta" in metric_ids
    assert "difficulty.N3.5.avg_score" in metric_ids
    assert "feature.scenario.business_email.usefulness" in metric_ids
    assert "provider.writing_evaluation.30d.quality_pass_rate" in metric_ids
    assert all(
        point["value"] is not None
        for point in points
        if not point["metric_id"].startswith(
            (
                "feature.vocabulary.",
                "feature.memory.",
                "feature.recommendation.",
                "outcome.coherence.",
                "outcome.cohesion.",
                "outcome.organization.",
                "outcome.flow.",
                "outcome.scenario_fit.",
                "outcome.communication_effectiveness.",
            )
        )
    )
