"""Deterministic consistency validation of AI evaluation output.

These checks run after the AI stages and before anything is persisted. A
result that violates them is rejected and regenerated per the evaluation
retry policy (see EvaluationService).
"""

from app.schemas.evaluation_ai import (
    GrammarVocabularyEvaluation,
    NaturalnessRegisterEvaluation,
    SemanticEvaluation,
    WritingEvaluation,
)

SEMANTIC_SCORE_BANDS: dict[str, tuple[int, int]] = {
    "fully_equivalent": (85, 100),
    "mostly_equivalent": (70, 90),
    "partially_equivalent": (40, 75),
    "meaning_changed": (0, 50),
}

NATURALNESS_SCORE_BANDS: dict[str, tuple[int, int]] = {
    "natural": (85, 100),
    "acceptable": (70, 90),
    "slightly_unnatural": (50, 80),
    "unnatural": (25, 60),
    "very_unnatural": (0, 40),
}

SEVERITY_ORDER = {"info": 0, "minor": 1, "major": 2, "critical": 3}
REGISTER_LOW_FIT = 40
REGISTER_EXERCISE_VALUES = {"casual", "polite", "business", "mixed"}


class EvaluationConsistencyError(Exception):
    """Raised when a stage output contradicts itself or the exercise."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class EvaluationConsistencyValidator:
    """Raises EvaluationConsistencyError on the first violation found."""

    def check_semantic(self, result: SemanticEvaluation) -> None:
        low, high = SEMANTIC_SCORE_BANDS[result.classification]
        if not low <= result.score <= high:
            raise EvaluationConsistencyError(
                f"semantic score {result.score} contradicts classification "
                f"'{result.classification}' (expected {low}-{high})"
            )
        if result.classification == "fully_equivalent" and result.meaning_changes:
            raise EvaluationConsistencyError(
                "fully_equivalent classification must not list meaning_changes"
            )
        if result.classification == "meaning_changed" and result.score > 50:
            raise EvaluationConsistencyError("meaning_changed classification must score at most 50")

    def check_grammar_vocabulary(self, result: GrammarVocabularyEvaluation) -> None:
        worst = 0
        for issue in result.issues:
            if issue.category == "grammar":
                worst = max(worst, SEVERITY_ORDER[issue.severity])
        if result.grammar_score == 100 and worst >= SEVERITY_ORDER["minor"]:
            raise EvaluationConsistencyError(
                "grammar_score 100 must not come with minor+ grammar issues"
            )
        if result.grammar_score >= 90 and worst >= SEVERITY_ORDER["major"]:
            raise EvaluationConsistencyError(
                "grammar_score >= 90 must not come with major+ grammar issues"
            )

    def check_naturalness_register(
        self,
        result: NaturalnessRegisterEvaluation,
        exercise_register: str,
    ) -> None:
        low, high = NATURALNESS_SCORE_BANDS[result.naturalness_classification]
        if not low <= result.naturalness_score <= high:
            raise EvaluationConsistencyError(
                f"naturalness score {result.naturalness_score} contradicts "
                f"classification '{result.naturalness_classification}' "
                f"(expected {low}-{high})"
            )
        has_register_issue = any(issue.category == "register" for issue in result.issues)
        if (
            exercise_register in REGISTER_EXERCISE_VALUES
            and result.register_fit_score <= REGISTER_LOW_FIT
            and not has_register_issue
        ):
            raise EvaluationConsistencyError(
                "low register_fit_score must be explained by a register issue"
            )

    def check_whole(
        self,
        evaluation: WritingEvaluation,
        *,
        exercise_register: str,
    ) -> None:
        """Cross-stage sanity checks on the synthesized evaluation."""
        scores = evaluation.scores
        if scores.overall_score < 0 or scores.overall_score > 100:
            raise EvaluationConsistencyError("overall_score out of 0-100 range")

        if evaluation.semantic_classification == "meaning_changed" and (scores.semantic_score > 50):
            raise EvaluationConsistencyError(
                "meaning_changed evaluation must not have semantic_score above 50"
            )
        if evaluation.naturalness_classification == "very_unnatural" and (
            scores.naturalness_score > 40
        ):
            raise EvaluationConsistencyError(
                "very_unnatural evaluation must not have naturalness_score above 40"
            )

        worst_grammar = 0
        for issue in evaluation.issues:
            if issue.category == "grammar":
                worst_grammar = max(worst_grammar, SEVERITY_ORDER[issue.severity])
        if scores.grammar_score == 100 and worst_grammar >= SEVERITY_ORDER["minor"]:
            raise EvaluationConsistencyError(
                "overall result: grammar_score 100 with minor+ grammar issues"
            )

        has_register_issue = any(issue.category == "register" for issue in evaluation.issues)
        if (
            exercise_register in REGISTER_EXERCISE_VALUES
            and scores.register_fit_score <= REGISTER_LOW_FIT
            and not has_register_issue
        ):
            raise EvaluationConsistencyError(
                "overall result: low register_fit_score without a register issue"
            )

        if not evaluation.hints:
            raise EvaluationConsistencyError("evaluation must include at least one hint")
