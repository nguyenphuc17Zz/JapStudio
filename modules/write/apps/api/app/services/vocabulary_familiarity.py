"""Simple deterministic familiarity derivation (Phase 5, §25).

Derived from usage patterns, never from review scheduling. The thresholds
are deliberately simple: strong -> familiar -> learning -> new.
"""

from app.models.vocabulary import VocabularyFamiliarity


def derive_familiarity(
    *,
    discovered_count: int,
    seen_count: int,
    used_count: int,
    incorrect_count: int,
    correct_usage_count: int,
) -> VocabularyFamiliarity:
    if min(discovered_count, seen_count, used_count, incorrect_count, correct_usage_count) < 0:
        raise ValueError("vocabulary counters must be non-negative")
    if used_count >= 6 and correct_usage_count >= 4 and incorrect_count <= 1:
        return VocabularyFamiliarity.STRONG
    if used_count >= 3 and correct_usage_count >= 2:
        return VocabularyFamiliarity.FAMILIAR
    if seen_count >= 2 or discovered_count >= 2 or incorrect_count >= 1:
        return VocabularyFamiliarity.LEARNING
    return VocabularyFamiliarity.NEW
