"""Weighted overall-score synthesis tests."""

from app.core.config import Settings
from app.services.evaluation_synthesis import EvaluationSynthesisService


def _settings(**overrides) -> Settings:
    return Settings(**overrides)


def test_default_weights_apply() -> None:
    service = EvaluationSynthesisService(_settings())
    result = service.synthesize(
        semantic_score=100,
        grammar_score=100,
        vocabulary_score=100,
        naturalness_score=100,
        context_fit_score=100,
        register_fit_score=100,
    )
    assert result.overall_score == 100


def test_naturalness_weights_more_than_grammar() -> None:
    service = EvaluationSynthesisService(_settings())
    low_naturalness = service.synthesize(
        semantic_score=90,
        grammar_score=90,
        vocabulary_score=90,
        naturalness_score=40,
        context_fit_score=90,
        register_fit_score=90,
    )
    low_grammar = service.synthesize(
        semantic_score=90,
        grammar_score=40,
        vocabulary_score=90,
        naturalness_score=90,
        context_fit_score=90,
        register_fit_score=90,
    )
    assert low_naturalness.overall_score < low_grammar.overall_score


def test_overall_is_weighted_average_not_blind_average() -> None:
    service = EvaluationSynthesisService(_settings())
    result = service.synthesize(
        semantic_score=0,
        grammar_score=100,
        vocabulary_score=100,
        naturalness_score=100,
        context_fit_score=100,
        register_fit_score=100,
    )
    # semantic is 25%, everything else 75% -> weighted = 75
    assert result.overall_score == 75


def test_custom_weights_change_the_result() -> None:
    service = EvaluationSynthesisService(
        _settings(
            ai_evaluation_weight_semantic=100,
            ai_evaluation_weight_grammar=0,
            ai_evaluation_weight_vocabulary=0,
            ai_evaluation_weight_naturalness=0,
            ai_evaluation_weight_context_fit=0,
            ai_evaluation_weight_register_fit=0,
        )
    )
    result = service.synthesize(
        semantic_score=50,
        grammar_score=100,
        vocabulary_score=100,
        naturalness_score=100,
        context_fit_score=100,
        register_fit_score=100,
    )
    assert result.overall_score == 50


def test_weights_do_not_need_to_sum_to_100() -> None:
    service = EvaluationSynthesisService(
        _settings(
            ai_evaluation_weight_semantic=1,
            ai_evaluation_weight_grammar=1,
            ai_evaluation_weight_vocabulary=1,
            ai_evaluation_weight_naturalness=1,
            ai_evaluation_weight_context_fit=1,
            ai_evaluation_weight_register_fit=1,
        )
    )
    result = service.synthesize(
        semantic_score=60,
        grammar_score=40,
        vocabulary_score=100,
        naturalness_score=80,
        context_fit_score=0,
        register_fit_score=100,
    )
    # plain average of (60+40+100+80+0+100)/6 = 63.33 -> 63
    assert result.overall_score == 63


def test_scores_are_preserved() -> None:
    service = EvaluationSynthesisService(_settings())
    result = service.synthesize(
        semantic_score=1,
        grammar_score=2,
        vocabulary_score=3,
        naturalness_score=4,
        context_fit_score=5,
        register_fit_score=6,
    )
    assert result.semantic_score == 1
    assert result.register_fit_score == 6
