import pytest
from datetime import datetime, timedelta
from app.services.discovery_service import DiscoveryService


def test_trend_metrics_multi_source_diversity():
    """Verifies that multi-source topics receive high diversity and high trend scores."""
    now = datetime.utcnow()
    # 4 distinct source types: NEWS, SOCIAL, BLOG, FORUM
    score, mom, div, fresh, conf, status, flames = DiscoveryService.calculate_trend_metrics(
        article_count=6,
        source_types=["NEWS", "SOCIAL", "BLOG", "FORUM"],
        recent_24h_count=5,
        prior_24h_count=2,
        last_activity_at=now,
    )
    assert div == 100.0  # Max diversity
    assert score >= 70.0
    assert conf >= 90.0
    assert flames >= 4
    assert status in ["RISING", "PEAK"]


def test_trend_metrics_single_source_penalty():
    """Verifies that single-source spam topics are heavily penalized to prevent false trends."""
    now = datetime.utcnow()
    # 10 articles, but ALL from a single BLOG source
    score, mom, div, fresh, conf, status, flames = DiscoveryService.calculate_trend_metrics(
        article_count=10,
        source_types=["BLOG", "BLOG", "BLOG", "BLOG", "BLOG"],
        recent_24h_count=8,
        prior_24h_count=2,
        last_activity_at=now,
    )
    assert div == 25.0  # Heavy penalty
    assert score <= 55.0  # Capped at 55 to prevent false hot trend
    assert flames <= 3


def test_trend_lifecycle_cooling():
    """Verifies that inactive or negative momentum topics transition to COOLING."""
    two_days_ago = datetime.utcnow() - timedelta(days=3)
    score, mom, div, fresh, conf, status, flames = DiscoveryService.calculate_trend_metrics(
        article_count=3,
        source_types=["NEWS", "SOCIAL"],
        recent_24h_count=0,
        prior_24h_count=4,
        last_activity_at=two_days_ago,
    )
    assert mom < 0.0
    assert fresh < 50.0
    assert status == "COOLING"


def test_slugify_japanese_and_latin():
    """Verifies safe URL slug generation."""
    assert DiscoveryService.slugify("Japan AI Regulation") == "japan-ai-regulation"
    assert DiscoveryService.slugify("  Tokyo 2026 Tech Trend  ") == "tokyo-2026-tech-trend"
