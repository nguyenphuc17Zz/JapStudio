"""Schema validation tests for Phase 5 vocabulary models and payloads."""

import pytest
from app.models import VocabularyType
from app.schemas.vocabulary import VocabularyExtractResponse, VocabularyListItem
from app.schemas.vocabulary_ai import (
    VocabularyCandidate,
    VocabularyExplanationResult,
    VocabularyExtractionResult,
    VocabularyValidationResult,
)
from pydantic import ValidationError


def _candidate(**overrides) -> dict:
    base = {
        "expression": "立て込む",
        "reading": "たてこむ",
        "type": "word",
        "meaning_vi": "quá bận rộn",
        "part_of_speech": "動詞",
        "estimated_jlpt_level": "N2",
        "difficulty": 7,
        "register": "business",
        "usage_context": "work",
        "example_sentence": "今日は仕事が立て込んでいます。",
        "natural_alternatives": ["仕事が詰まっている"],
        "learning_reason": "Tự nhiên hơn とても忙しい trong công việc.",
        "importance": 7,
        "confidence": "high",
        "source_type": "ai_natural",
        "user_expression": "とても忙しい",
    }
    base.update(overrides)
    return base


class TestVocabularyCandidate:
    def test_valid(self) -> None:
        candidate = VocabularyCandidate.model_validate(_candidate())
        assert candidate.type == VocabularyType.WORD
        assert candidate.confidence == "high"

    def test_importance_range(self) -> None:
        with pytest.raises(ValidationError):
            VocabularyCandidate.model_validate(_candidate(importance=0))
        with pytest.raises(ValidationError):
            VocabularyCandidate.model_validate(_candidate(importance=11))

    def test_difficulty_range(self) -> None:
        with pytest.raises(ValidationError):
            VocabularyCandidate.model_validate(_candidate(difficulty=0))

    def test_invalid_type(self) -> None:
        with pytest.raises(ValidationError):
            VocabularyCandidate.model_validate(_candidate(type="phrase"))

    def test_invalid_confidence(self) -> None:
        with pytest.raises(ValidationError):
            VocabularyCandidate.model_validate(_candidate(confidence="certain"))

    def test_unknown_source_type_falls_back(self) -> None:
        """Real models invent source-type labels; unknown values coerce to ai_natural."""
        candidate = VocabularyCandidate.model_validate(_candidate(source_type="issue_correction"))
        assert candidate.source_type == "ai_natural"

    def test_jlpt_level_enum(self) -> None:
        with pytest.raises(ValidationError):
            VocabularyCandidate.model_validate(_candidate(estimated_jlpt_level="N9"))


class TestVocabularyExtractionResult:
    def test_empty_candidates_allowed(self) -> None:
        assert VocabularyExtractionResult(candidates=[]).candidates == []

    def test_max_candidates(self) -> None:
        with pytest.raises(ValidationError):
            VocabularyExtractionResult(
                candidates=[VocabularyCandidate.model_validate(_candidate()) for _ in range(11)]
            )


class TestVocabularyValidationResult:
    def test_valid_approval(self) -> None:
        result = VocabularyValidationResult.model_validate(
            {
                "approved": True,
                "duplicate_of": None,
                "rejected_reason": None,
                "corrected_expression": None,
                "corrected_reading": None,
                "corrected_meaning_vi": None,
                "corrected_jlpt_level": None,
                "corrected_difficulty": None,
                "corrected_register": None,
                "confidence": "high",
            }
        )
        assert result.approved is True

    def test_rejection_requires_reason(self) -> None:
        with pytest.raises(ValidationError):
            VocabularyValidationResult.model_validate(
                {
                    "approved": False,
                    "duplicate_of": None,
                    "rejected_reason": None,
                    "corrected_expression": None,
                    "corrected_reading": None,
                    "corrected_meaning_vi": None,
                    "corrected_jlpt_level": None,
                    "corrected_difficulty": None,
                    "corrected_register": None,
                    "confidence": "high",
                }
            )

    def test_duplicate_of_with_approval_rejected(self) -> None:
        with pytest.raises(ValidationError):
            VocabularyValidationResult.model_validate(
                {
                    "approved": True,
                    "duplicate_of": "立て込む",
                    "rejected_reason": None,
                    "corrected_expression": None,
                    "corrected_reading": None,
                    "corrected_meaning_vi": None,
                    "corrected_jlpt_level": None,
                    "corrected_difficulty": None,
                    "corrected_register": None,
                    "confidence": "high",
                }
            )


class TestVocabularyExplanationResult:
    def test_explanation_matches_candidate(self) -> None:
        result = VocabularyExplanationResult(
            explanations=[
                {
                    "expression": "立て込む",
                    "learning_reason": "Tự nhiên hơn.",
                    "notes": "Dùng với 仕事が.",
                    "example_sentence": "今日は仕事が立て込んでいます。",
                    "natural_alternatives": ["仕事が詰まっている"],
                }
            ]
        )
        assert result.explanations[0].expression == "立て込む"


class TestApiSchemas:
    def test_extract_response_counts(self) -> None:
        response = VocabularyExtractResponse(
            attempt_id="a", created=1, merged=2, rejected=0, skipped=1, total=4
        )
        assert response.total == 4

    def test_list_item(self) -> None:
        item = VocabularyListItem(
            id="v1",
            expression="立て込む",
            reading="たてこむ",
            type="word",
            meaning_vi="quá bận rộn",
            part_of_speech="動詞",
            estimated_jlpt_level="N2",
            difficulty=7,
            register="business",
            usage_context="work",
            example_sentence="例文。",
            natural_alternatives=[],
            notes=None,
            importance=7,
            confidence="high",
            familiarity="new",
            discovered_count=1,
            seen_count=1,
            used_count=0,
            incorrect_count=0,
            correct_usage_count=0,
            last_seen=None,
            created_at="2026-08-18T00:00:00Z",
        )
        assert item.type == "word"
