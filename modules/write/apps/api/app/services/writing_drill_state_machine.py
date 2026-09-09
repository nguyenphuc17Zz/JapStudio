"""Deterministic state machine for Writing Drill Sessions (Phase 18).

Pure, side-effect-free state transitions, progression tracking,
progressive hint reveals, and mastery delta computations.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.schemas.writing_drill_ai import DrillDebriefResult, DrillEvaluationResult


class WritingDrillStateMachine:
    """Pure domain state machine for managing a drill session's lifecycle."""

    @staticmethod
    def get_current_item(items: list[dict[str, Any]], current_index: int) -> dict[str, Any] | None:
        if 0 <= current_index < len(items):
            return items[current_index]
        return None

    @staticmethod
    def get_hints_revealed_count(attempts: list[dict[str, Any]], item_id: str) -> int:
        """Returns highest hints revealed count for a given item."""
        count = 0
        for att in attempts:
            if att.get("item_id") == item_id:
                count = max(count, att.get("hints_revealed_count", 0))
        return count

    @staticmethod
    def is_item_revealed(attempts: list[dict[str, Any]], item_id: str) -> bool:
        """Returns whether answer has been revealed for this item."""
        for att in attempts:
            if att.get("item_id") == item_id and att.get("revealed", False):
                return True
        return False

    @staticmethod
    def next_hint(item: dict[str, Any], current_hints_revealed: int) -> tuple[str | None, int, int]:
        """Progressive hint reveal logic: returns (hint_text, new_revealed_count, total_hints)."""
        hints = item.get("hints", []) or []
        total = len(hints)
        if current_hints_revealed >= total or not hints:
            return None, current_hints_revealed, total

        hint_text = hints[current_hints_revealed]
        return hint_text, current_hints_revealed + 1, total

    @staticmethod
    def record_attempt(
        item: dict[str, Any],
        item_index: int,
        user_answer: str,
        eval_result: DrillEvaluationResult,
        hints_revealed_count: int,
        revealed: bool,
    ) -> dict[str, Any]:
        """Builds an immutable attempt record."""
        return {
            "item_id": item.get("id", str(item_index)),
            "item_index": item_index,
            "user_answer": user_answer,
            "is_correct": eval_result.is_correct,
            "score": eval_result.score,
            "feedback_vi": eval_result.feedback_vi,
            "nuance_contrast": eval_result.nuance_contrast,
            "corrected_text": eval_result.corrected_text,
            "hints_revealed_count": hints_revealed_count,
            "revealed": revealed,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def should_advance(
        item_attempts: list[dict[str, Any]],
        last_eval: DrillEvaluationResult,
        max_attempts_per_item: int = 3,
    ) -> bool:
        """Determines if the session should advance to the next item."""
        if last_eval.is_correct or last_eval.score >= 70:
            return True
        if len(item_attempts) >= max_attempts_per_item:
            return True
        return False

    @staticmethod
    def compute_mastery_delta(
        total_items: int, passed_items: int, average_score: float, current_mastery: float = 0.0
    ) -> float:
        """Computes deterministic mastery delta based on performance across the 4 stages."""
        if total_items <= 0:
            return 0.0

        pass_rate = passed_items / total_items

        if average_score >= 85 and pass_rate >= 0.75:
            delta = 0.10 + 0.05 * (average_score - 85) / 15.0
        elif average_score >= 70 and pass_rate >= 0.5:
            delta = 0.05 + 0.03 * (average_score - 70) / 15.0
        elif average_score >= 50:
            delta = 0.02
        else:
            # Minor negative delta if performed poorly
            delta = -0.03

        # Bound resulting mastery between 0.0 and 1.0
        new_mastery = max(0.0, min(1.0, current_mastery + delta))
        return round(new_mastery - current_mastery, 4)

    @staticmethod
    def compute_outcome(
        items: list[dict[str, Any]],
        attempts: list[dict[str, Any]],
        current_mastery: float = 0.0,
        debrief: DrillDebriefResult | None = None,
    ) -> dict[str, Any]:
        """Calculates total completion outcome for the drill session."""
        total_items = len(items)
        if total_items == 0:
            return {
                "total_items": 0,
                "passed_items": 0,
                "average_score": 0.0,
                "completion_rate": 0.0,
                "mastery_delta": 0.0,
                "debrief_vi": None,
                "next_step_vi": None,
            }

        # Find best score / status per item
        item_scores: dict[str, int] = {}
        item_passed: dict[str, bool] = {}

        for att in attempts:
            item_id = str(att.get("item_id"))
            score = int(att.get("score", 0))
            is_cor = bool(att.get("is_correct", False))

            item_scores[item_id] = max(item_scores.get(item_id, 0), score)
            item_passed[item_id] = item_passed.get(item_id, False) or is_cor or score >= 70

        passed_count = sum(1 for v in item_passed.values() if v)
        scores_list = list(item_scores.values()) or [0]
        avg_score = round(sum(scores_list) / max(1, len(scores_list)), 2)
        completion_rate = round(len(item_scores) / total_items, 2)
        mastery_delta = WritingDrillStateMachine.compute_mastery_delta(
            total_items, passed_count, avg_score, current_mastery
        )

        return {
            "total_items": total_items,
            "passed_items": passed_count,
            "average_score": avg_score,
            "completion_rate": completion_rate,
            "mastery_delta": mastery_delta,
            "debrief_vi": debrief.debrief_vi if debrief else None,
            "next_step_vi": debrief.next_step_vi if debrief else None,
        }
