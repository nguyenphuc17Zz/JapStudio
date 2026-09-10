from datetime import datetime
from typing import Optional, Tuple

from app.services import fsrs


class ReviewScheduler:
    """Spaced-repetition façade over the FSRS-4.5 engine (app.services.fsrs).

    State scales are unchanged (stability in days, difficulty 1..10), so
    existing ReviewState rows carry over without migration. Unlike the old
    hand-tuned constants, Again no longer resets reps — lapses drive leech
    detection instead.
    """

    RATING_AGAIN = fsrs.AGAIN
    RATING_HARD = fsrs.HARD
    RATING_GOOD = fsrs.GOOD
    RATING_EASY = fsrs.EASY

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
        elapsed_days: Optional[float] = None,
        request_retention: float = fsrs.DEFAULT_RETENTION,
        max_interval: int = fsrs.DEFAULT_MAX_INTERVAL,
        seed: Optional[str] = None,
        now: Optional[datetime] = None,
    ) -> Tuple[float, float, int, datetime, int, int]:
        """Calculates updated (new_stability, new_difficulty, interval_days, next_review_at, new_reps, new_lapses)."""
        rng = fsrs.seeded_rng(seed) if seed is not None else None
        if reps == 0:
            res = fsrs.init_schedule(
                rating,
                retention=request_retention,
                max_interval=max_interval,
                rng=rng,
                now=now,
            )
            new_lapses = lapses + 1 if rating == cls.RATING_AGAIN else lapses
            return res["new_s"], res["new_d"], res["interval_days"], res["next_review_at"], 1, new_lapses

        res = fsrs.schedule(
            current_stability,
            current_difficulty,
            rating,
            elapsed_days=elapsed_days,
            retention=request_retention,
            max_interval=max_interval,
            rng=rng,
            now=now,
        )
        new_lapses = lapses + 1 if rating == cls.RATING_AGAIN else lapses
        return res["new_s"], res["new_d"], res["interval_days"], res["next_review_at"], reps + 1, new_lapses

    @classmethod
    def calculate_initial_schedule(
        cls, rating: int
    ) -> Tuple[float, float, int, datetime, int, int]:
        """Convenience method for calculating initial card stability on first encounter/rating."""
        return cls.calculate_next_schedule(rating=rating, reps=0, lapses=0)

    @classmethod
    def predicted_retrievability(cls, elapsed_days: float, stability: float) -> float:
        return fsrs.forgetting_curve(elapsed_days, stability)
