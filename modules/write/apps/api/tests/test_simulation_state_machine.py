"""State machine tests (Phase 10): pure functions, no database."""

import pytest
from app.services.simulation_state_machine import (
    SimulationConsistencyError,
    SimulationConsistencyValidator,
    adjust_difficulty,
    advance_stage,
    apply_state_update,
    decide_next_turn_type,
    difficulty_bounds,
    initial_state,
    is_last_stage,
    progress_payload,
    resolution,
    should_summarize_context,
)

STAGES = [
    {"name": "open", "goal": "Chào hỏi."},
    {"name": "negotiate", "goal": "Đàm phán."},
    {"name": "close", "goal": "Chốt thỏa thuận."},
]


def _state(**overrides: object) -> dict:
    state = {
        "objective": "Đạt thỏa thuận.",
        "current_stage": "open",
        "stage_index": 0,
        "unresolved_items": ["Yêu cầu A"],
        "completed_items": [],
        "participant_positions": {"ai": {"stance": "x"}, "learner": {"stance": ""}},
        "facts": ["Sự kiện 1"],
        "decisions": [],
        "constraints": ["Không dùng kính ngữ"],
        "emotional_context": "neutral",
        "next_goal": "Chào hỏi.",
    }
    state.update(overrides)
    return state


class TestInitialState:
    def test_builds_full_state(self) -> None:
        scenario = {"required_points": [{"description": "Yêu cầu 1"}], "situation_vi": "Tình huống"}
        state = initial_state(scenario, "Mục tiêu", STAGES, {"role": "đối tác"})
        assert state["objective"] == "Mục tiêu"
        assert state["current_stage"] == "open"
        assert state["stage_index"] == 0
        assert state["unresolved_items"] == ["Yêu cầu 1"]
        assert state["completed_items"] == []
        assert state["participant_positions"]["ai"]["stance"] == "đối tác"
        assert state["emotional_context"] == "neutral"

    def test_scenario_without_points_starts_empty(self) -> None:
        state = initial_state({}, "Mục tiêu", STAGES, {})
        assert state["unresolved_items"] == []


class TestAdvanceStage:
    def test_advances_when_nothing_unresolved(self) -> None:
        state = advance_stage(_state(unresolved_items=[]), STAGES)
        assert state["stage_index"] == 1
        assert state["current_stage"] == "negotiate"
        assert state["next_goal"] == "Đàm phán."

    def test_stays_when_unresolved_remain(self) -> None:
        state = advance_stage(_state(), STAGES)
        assert state["stage_index"] == 0
        assert state["current_stage"] == "open"

    def test_does_not_advance_past_last_stage(self) -> None:
        state = advance_stage(_state(stage_index=2, unresolved_items=[]), STAGES)
        assert state["stage_index"] == 2


class TestTurnTypeDecision:
    def test_opening_question_by_default(self) -> None:
        turn_type = decide_next_turn_type(_state(), STAGES, "opening", {"goal_progress": 50})
        assert turn_type == "question"

    def test_confirmation_when_nothing_unresolved(self) -> None:
        turn_type = decide_next_turn_type(
            _state(unresolved_items=[]), STAGES, "question", {"goal_progress": 80}
        )
        assert turn_type == "confirmation"

    def test_closing_on_last_stage(self) -> None:
        turn_type = decide_next_turn_type(
            _state(stage_index=2, unresolved_items=[]), STAGES, "confirmation", {}
        )
        assert turn_type == "closing"

    def test_clarification_when_learner_stalls(self) -> None:
        turn_type = decide_next_turn_type(_state(), STAGES, "question", {"goal_progress": 20})
        assert turn_type == "clarification"

    def test_negotiation_in_negotiate_stage(self) -> None:
        turn_type = decide_next_turn_type(
            _state(current_stage="negotiate"), STAGES, "objection", {"goal_progress": 60}
        )
        assert turn_type == "negotiation"

    def test_objection_on_first_negotiate_turn(self) -> None:
        turn_type = decide_next_turn_type(
            _state(current_stage="negotiate"), STAGES, "question", {"goal_progress": 60}
        )
        assert turn_type == "objection"


class TestApplyStateUpdate:
    def test_merges_proposed_lists(self) -> None:
        proposed = {
            "unresolved_items": ["Yêu cầu A", "Yêu cầu B"],
            "completed_items": ["Chào hỏi"],
            "facts": ["Sự kiện mới"],
            "emotional_context": "căng thẳng",
        }
        state = apply_state_update(_state(), proposed, SimulationConsistencyValidator())
        assert state["unresolved_items"] == ["Yêu cầu A", "Yêu cầu B"]
        assert "Chào hỏi" in state["completed_items"]
        assert "Sự kiện mới" in state["facts"]
        assert state["emotional_context"] == "căng thẳng"
        assert state["objective"] == "Đạt thỏa thuận."

    def test_completed_items_are_removed_from_unresolved(self) -> None:
        proposed = {"unresolved_items": ["Yêu cầu A"], "completed_items": ["Yêu cầu A"]}
        state = apply_state_update(_state(), proposed, SimulationConsistencyValidator())
        assert state["unresolved_items"] == []
        assert state["completed_items"] == ["Yêu cầu A"]

    def test_dedupes_repeated_items(self) -> None:
        proposed = {"unresolved_items": ["A", "A", "B"]}
        state = apply_state_update(_state(), proposed, SimulationConsistencyValidator())
        assert state["unresolved_items"] == ["A", "B"]

    def test_rejects_unknown_key(self) -> None:
        with pytest.raises(SimulationConsistencyError, match="unknown key"):
            apply_state_update(_state(), {"evil": 1}, SimulationConsistencyValidator())

    def test_rejects_oversized_list(self) -> None:
        with pytest.raises(SimulationConsistencyError, match="bounded list"):
            apply_state_update(_state(), {"facts": ["x"] * 31}, SimulationConsistencyValidator())

    def test_rejects_non_string_emotional_context(self) -> None:
        with pytest.raises(SimulationConsistencyError, match="must be a string"):
            apply_state_update(_state(), {"emotional_context": 7}, SimulationConsistencyValidator())


class TestResolution:
    def test_success_on_last_stage_without_unresolved(self) -> None:
        assert resolution(_state(stage_index=2, unresolved_items=[]), STAGES, "closing") == (
            "natural_completion"
        )

    def test_no_resolution_early(self) -> None:
        assert resolution(_state(), STAGES, "question") is None

    def test_success_when_objective_done(self) -> None:
        assert resolution(_state(stage_index=2, unresolved_items=[]), STAGES, "closing") in (
            "success",
            "natural_completion",
        )


class TestDifficulty:
    def test_raises_when_strong(self) -> None:
        adjusted = adjust_difficulty(
            {"language_complexity": 5, "context_complexity": 5},
            difficulty_bounds({"language_complexity": 5, "context_complexity": 5}, 2),
            {"overall": 85, "goal_progress": 75},
        )
        assert adjusted["language_complexity"] == 6

    def test_lowers_when_weak(self) -> None:
        adjusted = adjust_difficulty(
            {"language_complexity": 5},
            difficulty_bounds({"language_complexity": 5}, 2),
            {"overall": 50, "goal_progress": 30},
        )
        assert adjusted["language_complexity"] == 4

    def test_stays_within_bounds(self) -> None:
        adjusted = adjust_difficulty(
            {"language_complexity": 10},
            difficulty_bounds({"language_complexity": 10}, 2),
            {"overall": 85, "goal_progress": 75},
        )
        assert adjusted["language_complexity"] == 10

    def test_bounds_clamped_to_1_10(self) -> None:
        bounds = difficulty_bounds({"language_complexity": 1}, 2)
        assert bounds["language_complexity"] == (1, 3)
        bounds = difficulty_bounds({"language_complexity": 10}, 2)
        assert bounds["language_complexity"] == (8, 10)


class TestHelpers:
    def test_progress_payload(self) -> None:
        payload = progress_payload(_state(), 3)
        assert payload["current_stage"] == "open"
        assert payload["total_stages"] == 3
        assert payload["unresolved_items"] == ["Yêu cầu A"]

    def test_should_summarize_context(self) -> None:
        assert should_summarize_context(11, 10)
        assert not should_summarize_context(10, 10)
        assert not should_summarize_context(5, 0)

    def test_is_last_stage(self) -> None:
        assert is_last_stage(_state(stage_index=2), STAGES)
        assert not is_last_stage(_state(stage_index=0), STAGES)
