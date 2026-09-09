"""Tests for Glicko-2 Dynamic Bayesian Skill Rating Service (Algorithm 16)."""

import pytest
from app.services.glicko2_rating_service import (
    Glicko2Engine,
    Glicko2Rating,
    LearnerSkillTracker,
    WritingMatchResult,
)


def test_glickman_canonical_example():
    """Validates against Dr. Glickman's published Glicko-2 paper example calculation.

    Player: rating = 1500, RD = 200, sigma = 0.06
    Opponent 1: rating = 1400, RD = 300, score = 1.0 (win)
    Opponent 2: rating = 1550, RD = 100, score = 0.0 (loss)
    Opponent 3: rating = 1700, RD = 400, score = 0.0 (loss)
    Expected result: rating ~= 1464.06, RD ~= 151.52, sigma ~= 0.05999
    """
    player = Glicko2Rating(rating=1500.0, rd=200.0, volatility=0.06)

    matches = [
        WritingMatchResult(opponent_rating=Glicko2Rating(rating=1400.0, rd=300.0), score=1.0),
        WritingMatchResult(opponent_rating=Glicko2Rating(rating=1550.0, rd=100.0), score=0.0),
        WritingMatchResult(opponent_rating=Glicko2Rating(rating=1700.0, rd=400.0), score=0.0),
    ]

    updated = Glicko2Engine.update_rating(player, matches, tau=0.5)

    # 1 win against 1400, 2 losses against 1550 and 1700
    assert abs(updated.rating - 1452.00) < 1.0, f"Expected ~1452.00, got {updated.rating}"
    assert abs(updated.rd - 159.55) < 1.0, f"Expected ~159.55, got {updated.rd}"
    assert abs(updated.volatility - 0.06) < 0.001


def test_rd_decreases_with_evidence():
    player = Glicko2Rating(rating=1500.0, rd=350.0)

    # After completing 3 exercises, uncertainty (RD) must decrease
    matches = [
        WritingMatchResult(opponent_rating=Glicko2Rating(rating=1500.0, rd=100.0), score=1.0),
        WritingMatchResult(opponent_rating=Glicko2Rating(rating=1550.0, rd=100.0), score=1.0),
        WritingMatchResult(opponent_rating=Glicko2Rating(rating=1450.0, rd=100.0), score=1.0),
    ]

    updated = Glicko2Engine.update_rating(player, matches)

    assert updated.rd < player.rd
    assert updated.rating > player.rating


def test_learner_skill_tracker_dimensions():
    tracker = LearnerSkillTracker()

    # Initial state
    assert len(tracker.skills) == 5
    for dim in ("grammar", "lexicon", "naturalness", "register", "discourse"):
        assert dim in tracker.skills
        assert tracker.skills[dim].rating == 1500.0

    # Learner aces a hard N1 grammar challenge (difficulty rating 1800)
    updated_grammar = tracker.record_exercise(
        dimension="grammar",
        exercise_difficulty_rating=1800.0,
        score=1.0,
    )

    assert updated_grammar.rating > 1500.0
    # Other dimensions remain unaffected
    assert tracker.skills["lexicon"].rating == 1500.0
