"""Unit tests for deterministic objective mastery computation (Phase 13)."""

import pytest
from app.core.config import Settings
from app.services.objective_mastery import (
    compute_mastery_state,
    is_objective_completed,
    state_label_vi,
    update_modes_used,
    update_skill_evidence,
)


@pytest.fixture
def settings() -> Settings:
    return Settings(
        ai_curriculum_default_threshold=80,
        ai_curriculum_mastery_attempts=5,
        ai_curriculum_min_evidence_confident=3,
    )


class TestUpdateSkillEvidence:
    def test_folds_scores_into_running_average(self, settings: Settings) -> None:
        evidence = update_skill_evidence({}, {"grammar": 80}, "sentence_translation", settings)
        assert evidence["grammar"] == {"score": 80, "count": 1}
        evidence = update_skill_evidence(
            evidence, {"grammar": 60}, "sentence_translation", settings
        )
        assert evidence["grammar"] == {"score": 70, "count": 2}

    def test_clamps_to_0_100(self, settings: Settings) -> None:
        evidence = update_skill_evidence({}, {"grammar": 120}, "sentence_translation", settings)
        assert evidence["grammar"]["score"] == 100
        evidence = update_skill_evidence(
            evidence, {"grammar": 120}, "sentence_translation", settings
        )
        assert evidence["grammar"]["score"] == 100

    def test_stores_multiple_skills(self, settings: Settings) -> None:
        evidence = update_skill_evidence(
            {}, {"grammar": 90, "vocabulary": 80}, "sentence_translation", settings
        )
        assert evidence["grammar"] == {"score": 90, "count": 1}
        assert evidence["vocabulary"] == {"score": 80, "count": 1}


class TestUpdateModesUsed:
    def test_counts_modes(self) -> None:
        modes = update_modes_used({}, "sentence_translation")
        modes = update_modes_used(modes, "sentence_translation")
        modes = update_modes_used(modes, "rewrite")
        assert modes == {"sentence_translation": 2, "rewrite": 1}


class TestComputeMasteryState:
    def test_not_started_without_attempts(self, settings: Settings) -> None:
        progress = {
            "exercises_completed": 0,
            "average_score": 0,
            "skill_evidence": {},
            "modes_used": {},
        }
        assert compute_mastery_state(progress, settings) == "not_started"

    def test_introduced_low_score(self, settings: Settings) -> None:
        progress = {
            "exercises_completed": 1,
            "average_score": 40,
            "skill_evidence": {"grammar": {"score": 40, "count": 1}},
            "modes_used": {"sentence_translation": 1},
        }
        assert compute_mastery_state(progress, settings) == "introduced"

    def test_practicing_high_score_low_confidence(self, settings: Settings) -> None:
        progress = {
            "exercises_completed": 2,
            "average_score": 90,
            "skill_evidence": {"grammar": {"score": 90, "count": 2}},
            "modes_used": {"sentence_translation": 2},
        }
        assert compute_mastery_state(progress, settings) == "practicing"

    def test_proficient_high_score_confident(self, settings: Settings) -> None:
        progress = {
            "exercises_completed": 3,
            "average_score": 90,
            "skill_evidence": {"grammar": {"score": 90, "count": 3}},
            "modes_used": {"sentence_translation": 3},
        }
        assert compute_mastery_state(progress, settings) == "proficient"

    def test_mastered_full_evidence(self, settings: Settings) -> None:
        progress = {
            "exercises_completed": 6,
            "average_score": 90,
            "skill_evidence": {
                "grammar": {"score": 90, "count": 6},
                "vocabulary": {"score": 85, "count": 4},
            },
            "modes_used": {"sentence_translation": 4, "rewrite": 2},
        }
        assert compute_mastery_state(progress, settings) == "mastered"

    def test_developing_mid_score(self, settings: Settings) -> None:
        progress = {
            "exercises_completed": 3,
            "average_score": 65,
            "skill_evidence": {"grammar": {"score": 65, "count": 3}},
            "modes_used": {"sentence_translation": 3},
        }
        assert compute_mastery_state(progress, settings) == "developing"

    def test_mastery_state_label_vi(self, settings: Settings) -> None:
        assert state_label_vi("mastered") == "Đã thành thạo"
        assert state_label_vi("not_started") == "Chưa bắt đầu"
        assert state_label_vi("unknown_state") == "unknown_state"


class TestIsObjectiveCompleted:
    def test_completed_when_all_criteria_met(self, settings: Settings) -> None:
        objective = {"success_criteria": {"threshold": 80, "modes_required": 2, "min_attempts": 5}}
        progress = {
            "exercises_completed": 5,
            "average_score": 82,
            "modes_used": {"sentence_translation": 3, "rewrite": 2},
        }
        completed, reasons = is_objective_completed(objective, progress, settings)
        assert completed is True
        assert reasons == []

    def test_not_completed_missing_attempts(self, settings: Settings) -> None:
        objective = {"success_criteria": {"threshold": 80, "modes_required": 2, "min_attempts": 5}}
        progress = {
            "exercises_completed": 4,
            "average_score": 90,
            "modes_used": {"sentence_translation": 2, "rewrite": 2},
        }
        completed, reasons = is_objective_completed(objective, progress, settings)
        assert completed is False
        assert any("more completed exercise" in reason for reason in reasons)

    def test_not_completed_below_threshold(self, settings: Settings) -> None:
        objective = {"success_criteria": {"threshold": 80, "modes_required": 2, "min_attempts": 5}}
        progress = {
            "exercises_completed": 5,
            "average_score": 79,
            "modes_used": {"sentence_translation": 3, "rewrite": 2},
        }
        completed, reasons = is_objective_completed(objective, progress, settings)
        assert completed is False
        assert any("below threshold" in reason for reason in reasons)

    def test_not_completed_missing_modes(self, settings: Settings) -> None:
        objective = {"success_criteria": {"threshold": 80, "modes_required": 2, "min_attempts": 5}}
        progress = {
            "exercises_completed": 5,
            "average_score": 90,
            "modes_used": {"sentence_translation": 5},
        }
        completed, reasons = is_objective_completed(objective, progress, settings)
        assert completed is False
        assert any("distinct exercise mode" in reason for reason in reasons)

    def test_defaults_from_settings_when_criteria_empty(self, settings: Settings) -> None:
        objective = {"success_criteria": {}}
        progress = {
            "exercises_completed": 5,
            "average_score": 90,
            "modes_used": {"sentence_translation": 3, "rewrite": 2},
        }
        completed, _ = is_objective_completed(objective, progress, settings)
        assert completed is True
