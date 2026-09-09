"""Deterministic consistency checks: score/classification contradictions."""

import pytest
from app.schemas.evaluation_ai import (
    GrammarVocabularyEvaluation,
    NaturalnessRegisterEvaluation,
    SemanticEvaluation,
    WritingEvaluation,
)
from app.services.evaluation_consistency import (
    EvaluationConsistencyError,
    EvaluationConsistencyValidator,
)

validator = EvaluationConsistencyValidator()


def _semantic(**overrides) -> SemanticEvaluation:
    base = dict(
        classification="fully_equivalent",
        score=90,
        omissions=[],
        additions=[],
        meaning_changes=[],
        confidence="high",
    )
    base.update(overrides)
    return SemanticEvaluation(**base)


def _grammar_vocab(**overrides) -> GrammarVocabularyEvaluation:
    base = dict(grammar_score=90, vocabulary_score=90, issues=[], confidence="high")
    base.update(overrides)
    return GrammarVocabularyEvaluation(**base)


def _naturalness_register(**overrides) -> NaturalnessRegisterEvaluation:
    base = dict(
        naturalness_classification="natural",
        naturalness_score=90,
        context_fit_score=90,
        register_fit_score=90,
        issues=[],
        register_notes=None,
        confidence="high",
    )
    base.update(overrides)
    return NaturalnessRegisterEvaluation(**base)


def _issue(category: str, severity: str) -> dict:
    return {
        "category": category,
        "severity": severity,
        "original_text": "x",
        "explanation": "y",
        "suggested_fix": "z",
    }


class TestSemanticConsistency:
    def test_fully_equivalent_accepts_high_score(self) -> None:
        validator.check_semantic(_semantic())

    @pytest.mark.parametrize(
        ("classification", "score"),
        [
            ("meaning_changed", 95),
            ("meaning_changed", 60),
            ("partially_equivalent", 95),
            ("fully_equivalent", 40),
        ],
    )
    def test_classification_score_contradiction_rejected(
        self, classification: str, score: int
    ) -> None:
        with pytest.raises(EvaluationConsistencyError):
            validator.check_semantic(_semantic(classification=classification, score=score))

    def test_meaning_changed_must_not_score_high(self) -> None:
        with pytest.raises(EvaluationConsistencyError):
            validator.check_semantic(_semantic(classification="meaning_changed", score=51))

    def test_fully_equivalent_with_meaning_changes_rejected(self) -> None:
        with pytest.raises(EvaluationConsistencyError):
            validator.check_semantic(
                _semantic(classification="fully_equivalent", meaning_changes=["lost 会社"])
            )

    def test_meaning_changed_with_low_score_accepted(self) -> None:
        validator.check_semantic(_semantic(classification="meaning_changed", score=20))


class TestGrammarConsistency:
    def test_grammar_100_with_minor_issue_rejected(self) -> None:
        result = _grammar_vocab(grammar_score=100, issues=[_issue("grammar", "minor")])
        with pytest.raises(EvaluationConsistencyError):
            validator.check_grammar_vocabulary(result)

    def test_grammar_90_with_major_issue_rejected(self) -> None:
        result = _grammar_vocab(grammar_score=90, issues=[_issue("grammar", "major")])
        with pytest.raises(EvaluationConsistencyError):
            validator.check_grammar_vocabulary(result)

    def test_grammar_90_with_info_issue_accepted(self) -> None:
        result = _grammar_vocab(grammar_score=90, issues=[_issue("grammar", "info")])
        validator.check_grammar_vocabulary(result)

    def test_naturalness_issue_does_not_affect_grammar_check(self) -> None:
        result = _grammar_vocab(grammar_score=100, issues=[_issue("naturalness", "minor")])
        validator.check_grammar_vocabulary(result)


class TestNaturalnessRegisterConsistency:
    def test_very_unnatural_with_high_score_rejected(self) -> None:
        result = _naturalness_register(
            naturalness_classification="very_unnatural", naturalness_score=90
        )
        with pytest.raises(EvaluationConsistencyError):
            validator.check_naturalness_register(result, "casual")

    def test_natural_with_high_score_accepted(self) -> None:
        validator.check_naturalness_register(_naturalness_register(), "casual")

    def test_low_register_fit_without_issue_rejected(self) -> None:
        result = _naturalness_register(register_fit_score=35)
        with pytest.raises(EvaluationConsistencyError):
            validator.check_naturalness_register(result, "business")

    def test_low_register_fit_with_issue_accepted(self) -> None:
        result = _naturalness_register(register_fit_score=35, issues=[_issue("register", "major")])
        validator.check_naturalness_register(result, "business")


def _evaluation(**overrides) -> WritingEvaluation:
    base = dict(
        scores={
            "overall_score": 80,
            "semantic_score": 90,
            "grammar_score": 90,
            "vocabulary_score": 90,
            "naturalness_score": 90,
            "context_fit_score": 90,
            "register_fit_score": 90,
        },
        semantic_classification="fully_equivalent",
        semantic_omissions=[],
        semantic_additions=[],
        semantic_meaning_changes=[],
        semantic_confidence="high",
        grammar_confidence="high",
        vocabulary_confidence="high",
        naturalness_confidence="high",
        naturalness_classification="natural",
        register_notes=None,
        issues=[],
        corrections={
            "correct_version": "a",
            "natural_version": "b",
            "native_version": "c",
        },
        hints=["gợi ý 1"],
        summary="tốt",
    )
    base.update(overrides)
    return WritingEvaluation.model_validate(base)


class TestWholeConsistency:
    def test_consistent_evaluation_accepted(self) -> None:
        validator.check_whole(_evaluation(), exercise_register="casual")

    def test_meaning_changed_but_semantic_95_rejected(self) -> None:
        with pytest.raises(EvaluationConsistencyError):
            validator.check_whole(
                _evaluation(
                    semantic_classification="meaning_changed",
                    scores={
                        "overall_score": 60,
                        "semantic_score": 95,
                        "grammar_score": 90,
                        "vocabulary_score": 90,
                        "naturalness_score": 90,
                        "context_fit_score": 90,
                        "register_fit_score": 90,
                    },
                ),
                exercise_register="casual",
            )

    def test_very_unnatural_but_naturalness_95_rejected(self) -> None:
        with pytest.raises(EvaluationConsistencyError):
            validator.check_whole(
                _evaluation(
                    naturalness_classification="very_unnatural",
                    scores={
                        "overall_score": 60,
                        "semantic_score": 90,
                        "grammar_score": 90,
                        "vocabulary_score": 90,
                        "naturalness_score": 95,
                        "context_fit_score": 90,
                        "register_fit_score": 90,
                    },
                ),
                exercise_register="casual",
            )

    def test_grammar_100_with_grammar_issue_rejected(self) -> None:
        with pytest.raises(EvaluationConsistencyError):
            validator.check_whole(
                _evaluation(
                    scores={
                        "overall_score": 80,
                        "semantic_score": 90,
                        "grammar_score": 100,
                        "vocabulary_score": 90,
                        "naturalness_score": 90,
                        "context_fit_score": 90,
                        "register_fit_score": 90,
                    },
                    issues=[_issue("grammar", "minor")],
                ),
                exercise_register="casual",
            )

    def test_low_register_fit_without_issue_rejected(self) -> None:
        with pytest.raises(EvaluationConsistencyError):
            validator.check_whole(
                _evaluation(
                    scores={
                        "overall_score": 70,
                        "semantic_score": 90,
                        "grammar_score": 90,
                        "vocabulary_score": 90,
                        "naturalness_score": 90,
                        "context_fit_score": 90,
                        "register_fit_score": 30,
                    }
                ),
                exercise_register="business",
            )
