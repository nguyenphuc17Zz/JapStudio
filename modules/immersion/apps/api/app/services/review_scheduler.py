import math
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any


class ReviewScheduler:
    """Modern FSRS-inspired Spaced Repetition Scheduling Engine for authentic language acquisition.
    
    Models human memory via:
    - Stability (S): Duration (in days) until retrieval probability drops to 90%.
    - Difficulty (D): Inherent complexity of the word or grammatical pattern (1.0 to 10.0).
    """

    RATING_AGAIN = 1
    RATING_HARD = 2
    RATING_GOOD = 3
    RATING_EASY = 4

    RATING_LABELS = {
        1: "AGAIN",
        2: "HARD",
        3: "GOOD",
        4: "EASY",
    }

    @classmethod
    def calculate_next_schedule(
        cls,
        rating: int,
        current_stability: float = 1.0,
        current_difficulty: float = 5.0,
        reps: int = 0,
        lapses: int = 0,
    ) -> Tuple[float, float, int, datetime, int, int]:
        """Calculates updated (new_stability, new_difficulty, interval_days, next_review_at, new_reps, new_lapses)."""
        now = datetime.utcnow()

        # 1. Initial Review (first time rated)
        if reps == 0:
            if rating == cls.RATING_AGAIN:
                init_d = 8.2
                init_s = 0.4
                interval = 1
                new_lapses = lapses + 1
            elif rating == cls.RATING_HARD:
                init_d = 6.5
                init_s = 1.2
                interval = 1
                new_lapses = lapses
            elif rating == cls.RATING_EASY:
                init_d = 3.0
                init_s = 7.5
                interval = 7
                new_lapses = lapses
            else:  # GOOD
                init_d = 4.8
                init_s = 3.2
                interval = 3
                new_lapses = lapses

            next_review = now + timedelta(days=interval)
            new_reps = 0 if rating == cls.RATING_AGAIN else reps + 1
            return init_s, init_d, interval, next_review, new_reps, new_lapses

        # 2. Subsequent Reviews (FSRS Transition)
        # Update difficulty
        # If rating is easy/good, difficulty drops; if hard/again, difficulty rises
        difficulty_delta = (3 - rating) * 0.7
        new_d = min(max(current_difficulty + difficulty_delta, 1.0), 10.0)

        if rating == cls.RATING_AGAIN:
            # Memory lapse occurred: resets repetition count and dampens stability
            new_s = max(current_stability * 0.25, 0.4)
            interval = 1
            new_lapses = lapses + 1
            new_reps = 0
        else:
            # Successful retention
            multipliers = {
                cls.RATING_HARD: 1.25,
                cls.RATING_GOOD: 2.35,
                cls.RATING_EASY: 3.85,
            }
            mult = multipliers.get(rating, 2.35)
            # Higher difficulty dampens stability growth
            diff_factor = (11.0 - new_d) / 10.0
            new_s = current_stability * (1.0 + mult * diff_factor)
            interval = max(1, int(round(new_s)))
            new_lapses = lapses
            new_reps = reps + 1

        next_review = now + timedelta(days=interval)
        return round(new_s, 2), round(new_d, 2), interval, next_review, new_reps, new_lapses

    @classmethod
    def calculate_initial_schedule(
        cls, rating: int
    ) -> Tuple[float, float, int, datetime, int, int]:
        """Convenience method for calculating initial card stability on first encounter/rating."""
        return cls.calculate_next_schedule(rating=rating, reps=0, lapses=0)
