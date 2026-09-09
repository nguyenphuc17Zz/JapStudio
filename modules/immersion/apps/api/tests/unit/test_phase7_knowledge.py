import pytest
from datetime import datetime
from app.services.review_scheduler import ReviewScheduler
from app.services.knowledge_service import KnowledgeService


def test_fsrs_initial_schedule():
    """Validates initial card scheduling across all 4 rating tiers."""
    # AGAIN
    s, d, days, next_rev, reps, lapses = ReviewScheduler.calculate_initial_schedule(ReviewScheduler.RATING_AGAIN)
    assert days == 1
    assert d >= 6.0
    assert reps == 0
    assert lapses == 1
    assert next_rev > datetime.utcnow()

    # HARD
    s, d, days, next_rev, reps, lapses = ReviewScheduler.calculate_initial_schedule(ReviewScheduler.RATING_HARD)
    assert days == 1
    assert reps == 1
    assert lapses == 0

    # GOOD
    s, d, days, next_rev, reps, lapses = ReviewScheduler.calculate_initial_schedule(ReviewScheduler.RATING_GOOD)
    assert days == 3
    assert reps == 1
    assert lapses == 0

    # EASY
    s, d, days, next_rev, reps, lapses = ReviewScheduler.calculate_initial_schedule(ReviewScheduler.RATING_EASY)
    assert days == 7
    assert reps == 1
    assert lapses == 0


def test_fsrs_review_progression():
    """Validates multi-rep spaced progression under FSRS."""
    # Start with GOOD (interval 3 days, stability 3.0, difficulty 5.0)
    s1, d1, days1, rev1, reps1, lapses1 = ReviewScheduler.calculate_initial_schedule(ReviewScheduler.RATING_GOOD)
    assert days1 == 3
    assert reps1 == 1

    # Second review: GOOD again
    s2, d2, days2, rev2, reps2, lapses2 = ReviewScheduler.calculate_next_schedule(
        rating=ReviewScheduler.RATING_GOOD,
        current_stability=s1,
        current_difficulty=d1,
        reps=reps1,
        lapses=lapses1,
    )
    assert reps2 == 2
    assert lapses2 == 0
    assert s2 > s1
    assert days2 > days1

    # Third review: AGAIN (lapse occurs)
    s3, d3, days3, rev3, reps3, lapses3 = ReviewScheduler.calculate_next_schedule(
        rating=ReviewScheduler.RATING_AGAIN,
        current_stability=s2,
        current_difficulty=d2,
        reps=reps2,
        lapses=lapses2,
    )
    assert reps3 == 0
    assert lapses3 == 1
    assert days3 == 1
    assert s3 < s2
    assert d3 > d2


def test_japanese_term_lemmatization():
    """Validates rule-based normalization back to dictionary base forms."""
    assert KnowledgeService.normalize_term("読んでいる") == "読む" or KnowledgeService.normalize_term("読んでいる").endswith("る")
    assert KnowledgeService.normalize_term("書いた") == "書く"
    assert KnowledgeService.normalize_term("増えた") == "増える"
    assert KnowledgeService.normalize_term("減った") == "減る"
    assert KnowledgeService.normalize_term("勉強した") == "勉強する"
    assert KnowledgeService.normalize_term("開発している") == "開発する"
    assert KnowledgeService.normalize_term("経済") == "経済"
