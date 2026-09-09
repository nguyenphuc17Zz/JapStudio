"""AI product analysis (advisory-only) and recommendation drafts (Phase 14).

The AI never changes behavior: outputs are validated deterministically and
persisted as ``pending`` recommendations for human review.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.analytics import OptimizationRecommendation
from app.prompts.experiment_analysis import (
    build_experiment_analysis_prompt,
    experiment_analysis_prompt_version,
)
from app.prompts.optimization_recommendation import (
    build_optimization_recommendation_prompt,
    optimization_recommendation_prompt_version,
)
from app.prompts.product_analysis import (
    build_product_analysis_prompt,
    product_analysis_prompt_version,
)
from app.providers.ai.errors import AIError
from app.quality.service import create_quality_service
from app.repositories.analytics import OptimizationRecommendationRepository
from app.schemas.analytics_ai import (
    ExperimentAnalysisResult,
    OptimizationRecommendationResult,
    ProductAnalysisResult,
)
from app.services.ai_service import AIService
from app.services.analytics.calibration import DifficultyCalibrationService
from app.services.analytics.effectiveness import FeatureEffectivenessService
from app.services.analytics.funnel import FunnelService
from app.services.analytics.outcomes import LearningOutcomesService
from app.services.analytics.provider_cost import ProviderCostService

logger = logging.getLogger("app.analytics.analysis")


class AnalyticsAnalysisService:
    """Gathers metrics, runs advisory AI analysis, persists recommendations."""

    def __init__(
        self,
        session: AsyncSession,
        ai_service: AIService,
        settings: Settings | None = None,
    ) -> None:
        self._session = session
        self._ai = ai_service
        self._settings = settings or get_settings()
        self._quality = create_quality_service(settings=self._settings)
        self._recommendations = OptimizationRecommendationRepository(session)

    def _task_provider(self) -> tuple[str | None, str | None]:
        settings = self._settings
        provider = (
            settings.ai_product_analytics_provider
            or settings.ai_learning_provider
            or settings.ai_exercise_evaluation_provider
            or settings.ai_exercise_generation_provider
            or settings.ai_default_provider
            or None
        )
        model = (
            settings.ai_product_analytics_model
            or settings.ai_learning_model
            or settings.ai_exercise_evaluation_model
            or settings.ai_exercise_generation_model
            or settings.ai_default_model
            or None
        )
        return provider, model

    async def collect_metrics(self, window: str) -> tuple[list[dict], list[str]]:
        """Aggregated metric points + the metric ids available in the window."""
        outcomes = await LearningOutcomesService(self._session, self._settings).compute(window)
        features = await FeatureEffectivenessService(self._session, self._settings).compute(window)
        calibration = await DifficultyCalibrationService(self._session, self._settings).compute(
            window
        )
        ai = await ProviderCostService(self._session, self._settings).compute(window)
        funnel = await FunnelService(self._session, self._settings).compute(window)

        points: list[dict] = []
        for skill in outcomes:
            points.append(
                {
                    "metric_id": f"outcome.{skill['skill']}.{window}.current",
                    "value": skill["current"],
                    "note": "descriptive within-window value",
                }
            )
            points.append(
                {
                    "metric_id": f"outcome.{skill['skill']}.{window}.delta",
                    "value": skill["delta"],
                    "note": "current minus baseline (first half of window)",
                }
            )
        for group_name in (
            "scenario_effectiveness",
            "simulation_effectiveness",
            "curriculum_effectiveness",
            "difficulty_effectiveness",
            "vocabulary_effectiveness",
            "memory_effectiveness",
        ):
            for entry in features[group_name]:
                points.append(
                    {
                        "metric_id": entry["metric_key"],
                        "value": entry["value"],
                        "note": group_name,
                    }
                )
        recommendation = features.get("recommendation_effectiveness")
        if recommendation is not None:
            points.append(
                {
                    "metric_id": recommendation["metric_key"],
                    "value": recommendation["value"],
                    "note": "recommendation_effectiveness",
                }
            )
        for entry in calibration:
            for suffix in ("avg_score", "completion_rate"):
                key = f"difficulty.{entry['level']}.{entry['difficulty']}.{suffix}"
                value = entry["avg_score"] if suffix == "avg_score" else entry["completion_rate"]
                points.append({"metric_id": key, "value": value, "note": "difficulty_calibration"})
        for row in ai["overview"]:
            points.append(
                {"metric_id": row["metric_key"], "value": row["value"], "note": "ai_cost"}
            )
        for row in ai["by_task"]:
            points.append(
                {
                    "metric_id": f"provider.{row['task']}.{window}.quality_pass_rate",
                    "value": row["quality_pass_rate"],
                    "note": "ai_quality",
                }
            )
        for stage in funnel["stages"]:
            points.append(
                {
                    "metric_id": f"funnel.{stage['stage']}.{window}.count",
                    "value": stage["value"],
                    "note": "funnel",
                }
            )
        metric_ids = [point["metric_id"] for point in points if point["value"] is not None]
        return points, metric_ids

    @staticmethod
    def _format_metrics(points: list[dict]) -> str:
        lines = []
        for point in points:
            value = point["value"]
            if value is None:
                continue
            lines.append(f"- {point['metric_id']} = {value}")
        return "\n".join(lines) if lines else "- (no metrics yet)"

    async def product_analysis(
        self,
        window: str,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict:
        """Run the advisory product analysis and persist its insights."""
        points, metric_ids = await self.collect_metrics(window)
        prompt = build_product_analysis_prompt(self._format_metrics(points))
        task_provider, task_model = self._task_provider()
        chosen_provider = provider or task_provider
        chosen_model = model or task_model
        try:
            result, _ = await self._ai.generate_structured(
                prompt,
                ProductAnalysisResult,
                system=prompt,
                provider=chosen_provider,
                model=chosen_model,
                max_tokens=self._settings.ai_exercise_generation_max_tokens,
            )
            assert isinstance(result, ProductAnalysisResult)
        except AIError as exc:
            logger.warning("product_analysis provider_failed error=%s", type(exc).__name__)
            return {
                "recommendations": [],
                "insights": [],
                "rejected": [f"Lỗi kết nối AI: {str(exc)}"],
                "error": str(exc),
            }
        outcome = self._quality.validate(
            "product_analysis",
            result,
            context={"metric_ids": metric_ids},
            provider=chosen_provider,
            model=chosen_model,
            prompt_version=product_analysis_prompt_version(),
        )
        if not outcome.passed:
            logger.info("product_analysis rejected: %s", outcome.violations)
            return {"recommendations": [], "insights": [], "rejected": outcome.violations}

        recommendations = []
        now = datetime.now(timezone.utc)
        for insight in result.insights:
            recommendation = OptimizationRecommendation(
                area=insight.area,
                priority=insight.priority,
                finding=insight.finding,
                recommended_action=insight.recommended_action,
                evidence=list(insight.evidence),
                confidence=insight.confidence,
                inference_type=insight.inference_type,
                source="ai_product_analysis",
                status="pending",
                metric_snapshot_id=window,
                provider=chosen_provider,
                model=chosen_model,
                prompt_version=product_analysis_prompt_version(),
            )
            saved = await self._recommendations.add(recommendation)
            recommendations.append(saved)
        return {
            "recommendations": recommendations,
            "insights": [i.model_dump() for i in result.insights],
            "window": window,
            "generated_at": now.isoformat(),
        }

    async def draft_recommendation(self, *, area: str, finding: str) -> dict:
        """Draft a single recommendation for a human-provided finding."""
        points, metric_ids = await self.collect_metrics("30d")
        prompt = build_optimization_recommendation_prompt(
            area=area,
            finding=finding,
            metrics_block=self._format_metrics(points),
        )
        provider, model = self._task_provider()
        result, _ = await self._ai.generate_structured(
            prompt,
            OptimizationRecommendationResult,
            system=prompt,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_exercise_generation_max_tokens,
        )
        assert isinstance(result, OptimizationRecommendationResult)
        outcome = self._quality.validate(
            "optimization_recommendation",
            result,
            context={"metric_ids": metric_ids},
            provider=provider,
            model=model,
            prompt_version=optimization_recommendation_prompt_version(),
        )
        if not outcome.passed:
            logger.info("optimization_recommendation rejected: %s", outcome.violations)
            return {"rejected": outcome.violations, "draft": None}

        recommendation = OptimizationRecommendation(
            area=result.area,
            priority=result.priority,
            finding=result.finding,
            recommended_action=result.recommended_action,
            evidence=list(result.evidence),
            confidence=result.confidence,
            inference_type=result.inference_type,
            source="ai_draft",
            status="pending",
            metric_snapshot_id="30d",
            provider=provider,
            model=model,
            prompt_version=optimization_recommendation_prompt_version(),
        )
        saved = await self._recommendations.add(recommendation)
        return {"draft": saved, "rejected": None}

    async def analyze_experiment(self, experiment: object, comparisons: list[dict]) -> dict:
        """Advisory control-vs-variant analysis for one experiment."""
        metric_ids = [
            f"experiment.{experiment.name}.{comparison['metric']}" for comparison in comparisons
        ]
        block_lines = [
            f"- experiment.{experiment.name}.{comparison['metric']}: "
            f"control={comparison['control_value']}, "
            f"variant={comparison['variant_value']}, "
            f"delta={comparison['delta']}"
            for comparison in comparisons
        ]
        experiment_block = f"name: {experiment.name}\ntarget: {experiment.target}\n" + "\n".join(
            block_lines
        )
        prompt = build_experiment_analysis_prompt(
            experiment_block, "\n".join(f"- {mid}" for mid in metric_ids)
        )
        provider, model = self._task_provider()
        result, _ = await self._ai.generate_structured(
            prompt,
            ExperimentAnalysisResult,
            system=prompt,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_exercise_generation_max_tokens,
        )
        assert isinstance(result, ExperimentAnalysisResult)
        outcome = self._quality.validate(
            "experiment_analysis",
            result,
            context={"metric_ids": metric_ids},
            provider=provider,
            model=model,
            prompt_version=experiment_analysis_prompt_version(),
        )
        if not outcome.passed:
            logger.info("experiment_analysis rejected: %s", outcome.violations)
            return {"rejected": outcome.violations, "analysis": None}
        return {"analysis": result.model_dump(), "rejected": None}
