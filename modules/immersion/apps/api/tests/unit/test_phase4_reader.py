from datetime import datetime, timedelta
from app.services.feed_ranking import FeedRankingService


def test_calculate_reading_time():
    assert FeedRankingService.calculate_reading_time("") == 1
    assert FeedRankingService.calculate_reading_time("短いテキスト") == 1

    # 700 chars should be ~2 minutes (350 chars/min)
    text_700 = "あ" * 700
    assert FeedRankingService.calculate_reading_time(text_700) == 2

    # 1050 chars should be ~3 minutes
    text_1050 = "あ" * 1050
    assert FeedRankingService.calculate_reading_time(text_1050) == 3


def test_calculate_freshness_score():
    now = datetime.utcnow()
    # Published 2 hours ago -> 100
    assert FeedRankingService.calculate_freshness_score(now - timedelta(hours=2)) == 100
    # Published 18 hours ago -> 90
    assert FeedRankingService.calculate_freshness_score(now - timedelta(hours=18)) == 90
    # Published 48 hours ago -> 75
    assert FeedRankingService.calculate_freshness_score(now - timedelta(hours=48)) == 75
    # Published 5 days ago -> 60
    assert FeedRankingService.calculate_freshness_score(now - timedelta(days=5)) == 60
    # Published 20 days ago -> 40
    assert FeedRankingService.calculate_freshness_score(now - timedelta(days=20)) == 40
    # Published 40 days ago -> 20
    assert FeedRankingService.calculate_freshness_score(now - timedelta(days=40)) == 20


def test_calculate_rank_score():
    now = datetime.utcnow()
    score_normal = FeedRankingService.calculate_rank_score(
        published_at=now,
        quality_score=80,
        readiness_score=80,
        source_priority=8
    )
    assert score_normal > 80.0

    # With target JLPT boost
    score_boosted = FeedRankingService.calculate_rank_score(
        published_at=now,
        quality_score=80,
        readiness_score=80,
        source_priority=8,
        target_jlpt="N2",
        estimated_jlpt="N2"
    )
    assert score_boosted == score_normal + 15.0


def test_source_diversity_rules():
    # 5 items from Source 1, 2 items from Source 2
    items = [
        {"content_id": 1, "source_id": 1, "primary_topic": "Tech"},
        {"content_id": 2, "source_id": 1, "primary_topic": "Tech"},
        {"content_id": 3, "source_id": 1, "primary_topic": "Tech"},
        {"content_id": 4, "source_id": 2, "primary_topic": "Anime"},
        {"content_id": 5, "source_id": 1, "primary_topic": "Tech"},
        {"content_id": 6, "source_id": 2, "primary_topic": "Culture"},
    ]

    diversified = FeedRankingService.apply_diversity_rules(items, max_source=2)

    # Verify no 3 consecutive items share the exact same source_id
    for i in range(len(diversified) - 2):
        s1 = diversified[i]["source_id"]
        s2 = diversified[i + 1]["source_id"]
        s3 = diversified[i + 2]["source_id"]
        assert not (s1 == s2 == s3), f"Diversity rule violated at index {i}: {s1}, {s2}, {s3}"
