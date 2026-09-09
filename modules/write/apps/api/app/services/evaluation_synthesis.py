"""Deterministic score synthesis for writing evaluations.

The overall score is a weighted combination of the six dimensions with
documented, configurable weights. Naturalness is intentionally the largest
weight because it is the product differentiator. The weights are normalized
so their sum does not need to equal 100 exactly.
"""

from app.core.config import Settings, get_settings
from app.schemas.evaluation_ai import EvaluationScores

DEFAULT_WEIGHTS: dict[str, int] = {
    "semantic": 25,
    "grammar": 20,
    "vocabulary": 10,
    "naturalness": 30,
    "context_fit": 10,
    "register_fit": 5,
}


class EvaluationSynthesisService:
    """Computes the weighted overall score from the six dimension scores."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def weights(self) -> dict[str, int]:
        return {
            "semantic": self._settings.ai_evaluation_weight_semantic,
            "grammar": self._settings.ai_evaluation_weight_grammar,
            "vocabulary": self._settings.ai_evaluation_weight_vocabulary,
            "naturalness": self._settings.ai_evaluation_weight_naturalness,
            "context_fit": self._settings.ai_evaluation_weight_context_fit,
            "register_fit": self._settings.ai_evaluation_weight_register_fit,
        }

    def synthesize(
        self,
        *,
        semantic_score: int,
        grammar_score: int,
        vocabulary_score: int,
        naturalness_score: int,
        context_fit_score: int,
        register_fit_score: int,
    ) -> EvaluationScores:
        """Combine the six dimension scores into a validated result."""
        weights = self.weights()
        dimensions = (
            ("semantic", semantic_score),
            ("grammar", grammar_score),
            ("vocabulary", vocabulary_score),
            ("naturalness", naturalness_score),
            ("context_fit", context_fit_score),
            ("register_fit", register_fit_score),
        )
        total_weight = sum(weights.values()) or 1
        overall = round(sum(score * weights[key] for key, score in dimensions) / total_weight)
        return EvaluationScores(
            overall_score=overall,
            semantic_score=semantic_score,
            grammar_score=grammar_score,
            vocabulary_score=vocabulary_score,
            naturalness_score=naturalness_score,
            context_fit_score=context_fit_score,
            register_fit_score=register_fit_score,
        )
