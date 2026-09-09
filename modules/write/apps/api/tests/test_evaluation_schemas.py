import pytest
from app.schemas.evaluation_ai import (
    CorrectionResult,
    Corrections,
    EvaluationIssue,
    EvaluationScores,
    GrammarVocabularyEvaluation,
    HintResult,
    NaturalnessRegisterEvaluation,
    SemanticEvaluation,
    WritingEvaluation,
)
from pydantic import ValidationError


def _issue(**overrides) -> dict:
    base = {
        "category": "grammar",
        "severity": "minor",
        "original_text": "会社に行く",
        "explanation": "Trợ từ chưa phù hợp.",
        "suggested_fix": "会社へ行く",
    }
    base.update(overrides)
    return base


def _semantic(**overrides) -> dict:
    base = {
        "classification": "mostly_equivalent",
        "score": 80,
        "omissions": [],
        "additions": [],
        "meaning_changes": [],
        "confidence": "high",
    }
    base.update(overrides)
    return base


def _grammar_vocab(**overrides) -> dict:
    base = {
        "grammar_score": 88,
        "vocabulary_score": 85,
        "issues": [],
        "confidence": "medium",
    }
    base.update(overrides)
    return base


def _naturalness_register(**overrides) -> dict:
    base = {
        "naturalness_classification": "acceptable",
        "naturalness_score": 80,
        "context_fit_score": 90,
        "register_fit_score": 85,
        "issues": [],
        "register_notes": None,
        "confidence": "medium",
    }
    base.update(overrides)
    return base


def _corrections() -> dict:
    return {
        "correct_version": "今日は仕事が多いです。",
        "natural_version": "今日は仕事が立て込んでいます。",
        "native_version": "今日は仕事が立て込んでいて、帰りが遅くなりそうです。",
        "casual_version": None,
        "polite_version": "今日は仕事が多くて、帰りが遅くなりそうです。",
        "business_version": "本日は業務が立て込んでおります。",
    }


def _hints() -> dict:
    return {
        "hints": [
            "Hãy kiểm tra trợ từ.",
            "Xem lại cách nối câu.",
            "Thử diễn đạt tự nhiên hơn.",
        ]
    }


def _evaluation() -> dict:
    scores = {
        "overall_score": 82,
        "semantic_score": 90,
        "grammar_score": 88,
        "vocabulary_score": 85,
        "naturalness_score": 75,
        "context_fit_score": 90,
        "register_fit_score": 85,
    }
    return {
        "scores": scores,
        "semantic_classification": "fully_equivalent",
        "semantic_omissions": [],
        "semantic_additions": [],
        "semantic_meaning_changes": [],
        "semantic_confidence": "high",
        "grammar_confidence": "medium",
        "vocabulary_confidence": "medium",
        "naturalness_confidence": "medium",
        "naturalness_classification": "acceptable",
        "register_notes": None,
        "issues": [],
        "corrections": _corrections(),
        "hints": _hints()["hints"],
        "summary": "Câu trả lời truyền đạt đúng ý nghĩa.",
    }


class TestScores:
    def test_scores_accept_valid_bounds(self) -> None:
        scores = EvaluationScores(
            overall_score=0,
            semantic_score=0,
            grammar_score=100,
            vocabulary_score=50,
            naturalness_score=100,
            context_fit_score=0,
            register_fit_score=100,
        )
        assert scores.overall_score == 0

    @pytest.mark.parametrize("field", ["overall_score", "semantic_score"])
    def test_scores_reject_out_of_range(self, field: str) -> None:
        values = {
            "overall_score": 80,
            "semantic_score": 90,
            "grammar_score": 88,
            "vocabulary_score": 85,
            "naturalness_score": 75,
            "context_fit_score": 90,
            "register_fit_score": 85,
        }
        values[field] = -1
        with pytest.raises(ValidationError):
            EvaluationScores(**values)


class TestIssues:
    def test_issue_rejects_unknown_category(self) -> None:
        with pytest.raises(ValidationError):
            EvaluationIssue(**_issue(category="style"))

    def test_issue_rejects_unknown_severity(self) -> None:
        with pytest.raises(ValidationError):
            EvaluationIssue(**_issue(severity="severe"))

    def test_issue_accepts_valid_values(self) -> None:
        issue = EvaluationIssue(**_issue(category="naturalness", severity="info"))
        assert issue.category == "naturalness"
        assert issue.reason is None

    def test_issue_rejects_empty_explanation(self) -> None:
        with pytest.raises(ValidationError):
            EvaluationIssue(**_issue(explanation=""))


class TestStageSchemas:
    def test_semantic_rejects_bad_classification(self) -> None:
        with pytest.raises(ValidationError):
            SemanticEvaluation(**_semantic(classification="equivalent"))

    def test_semantic_rejects_score_out_of_range(self) -> None:
        with pytest.raises(ValidationError):
            SemanticEvaluation(**_semantic(score=101))

    def test_semantic_rejects_bad_confidence(self) -> None:
        with pytest.raises(ValidationError):
            SemanticEvaluation(**_semantic(confidence="certain"))

    def test_grammar_vocab_rejects_too_many_issues(self) -> None:
        with pytest.raises(ValidationError):
            GrammarVocabularyEvaluation(**_grammar_vocab(issues=[_issue() for _ in range(16)]))

    def test_naturalness_register_rejects_bad_classification(self) -> None:
        with pytest.raises(ValidationError):
            NaturalnessRegisterEvaluation(
                **_naturalness_register(naturalness_classification="weird")
            )

    def test_corrections_require_core_versions(self) -> None:
        with pytest.raises(ValidationError):
            CorrectionResult(
                correct_version="",
                natural_version="x",
                native_version="y",
            )

    def test_corrections_allow_null_variants(self) -> None:
        corrections = CorrectionResult(**_corrections())
        assert corrections.business_version
        assert corrections.casual_version is None

    def test_hints_require_at_least_one(self) -> None:
        with pytest.raises(ValidationError):
            HintResult(hints=[])

    def test_hints_reject_more_than_six(self) -> None:
        with pytest.raises(ValidationError):
            HintResult(hints=[f"hint {i}" for i in range(7)])


class TestWritingEvaluation:
    def test_evaluation_round_trip(self) -> None:
        evaluation = WritingEvaluation.model_validate(_evaluation())
        assert evaluation.scores.overall_score == 82
        assert evaluation.corrections.native_version
        assert len(evaluation.hints) == 3

    def test_evaluation_rejects_empty_summary(self) -> None:
        with pytest.raises(ValidationError):
            WritingEvaluation.model_validate({**_evaluation(), "summary": ""})

    def test_evaluation_rejects_too_many_issues(self) -> None:
        with pytest.raises(ValidationError):
            WritingEvaluation.model_validate(
                {**_evaluation(), "issues": [_issue() for _ in range(16)]}
            )

    def test_corrections_is_independent_schema(self) -> None:
        corrections = Corrections(correct_version="a", natural_version="b", native_version="c")
        assert corrections.polite_version is None
