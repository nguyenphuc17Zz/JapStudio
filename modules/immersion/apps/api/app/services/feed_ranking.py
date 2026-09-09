import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional


class FeedRankingService:
    """Calculates deterministic feed ranking, reading time, and enforces source diversity rules."""

    MAX_CONSECUTIVE_SAME_SOURCE = 2
    MAX_CONSECUTIVE_SAME_TOPIC = 3
    JAPANESE_LEARNER_CHARS_PER_MINUTE = 350

    @classmethod
    def calculate_reading_time(cls, text: Optional[str]) -> int:
        """Calculates estimated reading time in minutes for Japanese text."""
        if not text:
            return 1
        char_count = len(text.strip())
        if char_count < 100:
            return 1
        minutes = math.ceil(char_count / cls.JAPANESE_LEARNER_CHARS_PER_MINUTE)
        return max(minutes, 1)

    @classmethod
    def calculate_freshness_score(cls, dt: Optional[datetime]) -> int:
        """Calculates decay score from 0-100 based on age."""
        if not dt:
            return 50

        # Handle naive vs aware
        now = datetime.utcnow()
        if dt.tzinfo is not None:
            now = datetime.now(timezone.utc)
            diff_hours = (now - dt).total_seconds() / 3600.0
        else:
            diff_hours = (now - dt).total_seconds() / 3600.0

        if diff_hours < 0:
            diff_hours = 0

        if diff_hours <= 12:
            return 100
        elif diff_hours <= 24:
            return 90
        elif diff_hours <= 72:
            return 75
        elif diff_hours <= 168:  # 7 days
            return 60
        elif diff_hours <= 720:  # 30 days
            return 40
        else:
            return 20

    @classmethod
    def calculate_rank_score(
        cls,
        published_at: Optional[datetime],
        quality_score: int = 70,
        readiness_score: int = 60,
        source_priority: int = 5,
        target_jlpt: Optional[str] = None,
        estimated_jlpt: Optional[str] = None
    ) -> float:
        """Computes deterministic relevance ranking score for a feed item."""
        freshness = cls.calculate_freshness_score(published_at)

        # Level compatibility boost
        difficulty_boost = 0.0
        if target_jlpt and estimated_jlpt:
            if target_jlpt == estimated_jlpt:
                difficulty_boost = 15.0

        score = (
            (freshness * 0.35) +
            (quality_score * 0.30) +
            (readiness_score * 0.20) +
            (source_priority * 1.5) +
            difficulty_boost
        )
        return round(score, 2)

    @classmethod
    def apply_diversity_rules(
        cls,
        items: List[Dict[str, Any]],
        max_source: int = MAX_CONSECUTIVE_SAME_SOURCE,
        max_topic: int = MAX_CONSECUTIVE_SAME_TOPIC
    ) -> List[Dict[str, Any]]:
        """Re-orders items to avoid clustering of identical sources or topics consecutively."""
        if len(items) <= 2:
            return items

        result: List[Dict[str, Any]] = []
        pending = list(items)

        while pending:
            selected_idx = -1

            for idx, candidate in enumerate(pending):
                source_id = candidate.get("source_id")
                topic = candidate.get("primary_topic")

                # Check last N items in result
                recent_sources = [r.get("source_id") for r in result[-max_source:]]
                recent_topics = [r.get("primary_topic") for r in result[-max_topic:]]

                source_streak = len(recent_sources) == max_source and all(s == source_id for s in recent_sources)
                topic_streak = len(recent_topics) == max_topic and all(t == topic for t in recent_topics)

                if not source_streak and not topic_streak:
                    selected_idx = idx
                    break

            if selected_idx == -1:
                # If all remaining items conflict, take the first one
                selected_idx = 0

            result.append(pending.pop(selected_idx))

        return result
