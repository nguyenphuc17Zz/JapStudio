"""Experiment management, deterministic assignment and metrics (Phase 14).

Allocation is deterministic: ``hash(f"{experiment_id}:{user_id}") % 100 <
allocation`` -> variant, else control. Assignments are idempotent.
"""

import hashlib

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.analytics import Experiment, ExperimentAssignment
from app.models.exercise import ExerciseAttempt, WritingFeedback
from app.repositories.analytics import (
    ExperimentAssignmentRepository,
    ExperimentRepository,
)
from app.services.analytics.common import round2

_METRIC_COMPUTERS = ("completion_rate", "avg_score", "improvement", "attempts")


class ExperimentService:
    """CRUD, assignment and deterministic metrics for A/B experiments."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()
        self._experiments = ExperimentRepository(session)
        self._assignments = ExperimentAssignmentRepository(session)

    @staticmethod
    def _arm_for(experiment_id: str, user_id: str | None, allocation: int) -> str:
        digest = hashlib.sha256(f"{experiment_id}:{user_id}".encode()).hexdigest()
        value = int(digest[:8], 16) % 100
        return "variant" if value < allocation else "control"

    async def assign(self, experiment: Experiment, user_id: str | None) -> ExperimentAssignment:
        existing = await self._assignments.get_for_user(experiment.id, user_id)
        if existing is not None:
            return existing
        assignment = ExperimentAssignment(
            experiment_id=experiment.id,
            user_id=user_id,
            arm=self._arm_for(experiment.id, user_id, experiment.allocation),
        )
        return await self._assignments.add(assignment)

    async def metrics(self, experiment: Experiment, window: str = "all_time") -> list[dict]:
        from app.services.analytics.common import resolve_window

        await self._session.refresh(experiment)
        resolved = resolve_window(window)
        assignments = await self._assignments.list_for_experiment(experiment.id)
        arms: dict[str, list[str | None]] = {"control": [], "variant": []}
        for assignment in assignments:
            arms.setdefault(assignment.arm, []).append(assignment.user_id)

        result = await self._session.execute(
            select(ExerciseAttempt, WritingFeedback, ExerciseAttempt.user_id)
            .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .where(
                ExerciseAttempt.created_at >= experiment.created_at,
                ExerciseAttempt.created_at >= resolved.start,
                ExerciseAttempt.created_at <= resolved.end,
            )
        )
        per_arm: dict[str, dict[str, float | int]] = {
            "control": {"attempts": 0, "evaluated": 0, "scores": [], "first": {}, "last": {}},
            "variant": {"attempts": 0, "evaluated": 0, "scores": [], "first": {}, "last": {}},
        }
        arm_by_user: dict[str, str] = {}
        for arm, users in arms.items():
            for user in users:
                arm_by_user[str(user)] = arm

        for attempt, feedback, user_id in result.all():
            arm = arm_by_user.get(str(user_id))
            if arm is None:
                continue
            bucket = per_arm[arm]
            bucket["attempts"] += 1
            bucket["evaluated"] += 1
            bucket["scores"].append(feedback.overall_score)
            bucket["first"].setdefault(attempt.exercise_id, feedback.overall_score)
            bucket["last"][attempt.exercise_id] = feedback.overall_score

        comparisons = []
        for metric in experiment.metrics or ["completion_rate", "avg_score"]:
            if metric not in _METRIC_COMPUTERS:
                continue
            control = self._value(per_arm["control"], metric)
            variant = self._value(per_arm["variant"], metric)
            delta = (
                round2(variant - control) if control is not None and variant is not None else None
            )
            comparisons.append(
                {
                    "metric": metric,
                    "control_value": control,
                    "variant_value": variant,
                    "delta": delta,
                    "sample_count": per_arm["variant"]["attempts"] + per_arm["control"]["attempts"],
                    "insufficient_evidence": per_arm["control"]["attempts"] < 2
                    or per_arm["variant"]["attempts"] < 2,
                }
            )
        return comparisons

    @staticmethod
    def _value(bucket: dict, metric: str) -> float | None:
        attempts = bucket["attempts"]
        if metric == "attempts":
            return float(attempts)
        if attempts == 0:
            return None
        if metric == "completion_rate":
            return round2(bucket["evaluated"] / attempts)
        if metric == "avg_score":
            return round2(sum(bucket["scores"]) / len(bucket["scores"]))
        if metric == "improvement":
            deltas = [
                bucket["last"][key] - value
                for key, value in bucket["first"].items()
                if key in bucket["last"]
            ]
            return round2(sum(deltas) / len(deltas)) if deltas else None
        return None
