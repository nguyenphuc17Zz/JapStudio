"""Unit tests for familiarity derivation thresholds (Phase 5)."""

import pytest
from app.models import VocabularyFamiliarity
from app.services.vocabulary_familiarity import derive_familiarity


class TestDeriveFamiliarity:
    def test_new_when_never_seen(self) -> None:
        assert (
            derive_familiarity(
                discovered_count=1,
                seen_count=1,
                used_count=0,
                incorrect_count=0,
                correct_usage_count=0,
            )
            == VocabularyFamiliarity.NEW
        )

    def test_learning_when_seen_twice(self) -> None:
        assert (
            derive_familiarity(
                discovered_count=2,
                seen_count=2,
                used_count=0,
                incorrect_count=0,
                correct_usage_count=0,
            )
            == VocabularyFamiliarity.LEARNING
        )

    def test_learning_when_incorrect(self) -> None:
        assert (
            derive_familiarity(
                discovered_count=1,
                seen_count=1,
                used_count=1,
                incorrect_count=1,
                correct_usage_count=0,
            )
            == VocabularyFamiliarity.LEARNING
        )

    def test_familiar_when_used_three_times(self) -> None:
        assert (
            derive_familiarity(
                discovered_count=1,
                seen_count=3,
                used_count=3,
                incorrect_count=0,
                correct_usage_count=3,
            )
            == VocabularyFamiliarity.FAMILIAR
        )

    def test_strong_when_mastered(self) -> None:
        assert (
            derive_familiarity(
                discovered_count=1,
                seen_count=6,
                used_count=6,
                incorrect_count=0,
                correct_usage_count=6,
            )
            == VocabularyFamiliarity.STRONG
        )

    def test_strong_requires_low_incorrect(self) -> None:
        assert (
            derive_familiarity(
                discovered_count=1,
                seen_count=8,
                used_count=8,
                incorrect_count=2,
                correct_usage_count=6,
            )
            != VocabularyFamiliarity.STRONG
        )

    def test_zero_counts(self) -> None:
        assert (
            derive_familiarity(
                discovered_count=0,
                seen_count=0,
                used_count=0,
                incorrect_count=0,
                correct_usage_count=0,
            )
            == VocabularyFamiliarity.NEW
        )

    def test_rejects_negative_counts(self) -> None:
        with pytest.raises(ValueError):
            derive_familiarity(
                discovered_count=-1,
                seen_count=1,
                used_count=0,
                incorrect_count=0,
                correct_usage_count=0,
            )
