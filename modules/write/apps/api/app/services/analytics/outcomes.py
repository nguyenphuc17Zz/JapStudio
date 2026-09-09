"""Learning outcome skills: baseline vs current within a window (Phase 14).

Skills and their deterministic sources:

- grammar, vocabulary, semantic, naturalness, context_fit, register_fit
  <- WritingFeedback score columns
- coherence, cohesion, organization, flow, scenario_fit
  <- DiscourseEvaluation.scores
- communication_effectiveness <- SimulationEvaluation.scores

A skill's baseline is its average over the first half of the window, its
current value over the second half; the delta is purely descriptive.
"""

from datetime import timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.exercise import ExerciseAttempt, WritingFeedback
from app.models.simulation import SimulationEvaluation, SimulationSession, SimulationTurn
from app.models.writing import DiscourseEvaluation, WritingRevision, WritingSubmission
from app.services.analytics.common import (
    MetricWindow,
    outcome_metric_id,
    resolve_window,
    round2,
    trend_from_delta,
)

WRITING_SKILLS = {
    "grammar": WritingFeedback.grammar_score,
    "vocabulary": WritingFeedback.vocabulary_score,
    "semantic": WritingFeedback.semantic_score,
    "naturalness": WritingFeedback.naturalness_score,
    "context_fit": WritingFeedback.context_fit_score,
    "register_fit": WritingFeedback.register_fit_score,
}
DISCOURSE_SKILLS = ["coherence", "cohesion", "organization", "flow", "scenario_fit"]
SIMULATION_SKILLS = ["communication_effectiveness"]

ALL_SKILLS = list(WRITING_SKILLS.keys()) + DISCOURSE_SKILLS + SIMULATION_SKILLS


class LearningOutcomesService:
    """Computes descriptive skill outcomes for a window."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()

    @staticmethod
    def _aware(value: object) -> object:
        if getattr(value, "tzinfo", None) is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    async def compute(self, window: str, *, min_evidence: int | None = None) -> list[dict]:
        resolved = resolve_window(window)
        min_evidence = (
            min_evidence if min_evidence is not None else self._settings.analytics_min_evidence
        )
        rows: list[tuple[str, float, object]] = []

        for skill, column in WRITING_SKILLS.items():
            result = await self._session.execute(
                select(column, ExerciseAttempt.created_at)
                .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
                .where(
                    ExerciseAttempt.created_at >= resolved.start,
                    ExerciseAttempt.created_at <= resolved.end,
                )
            )
            rows.extend((skill, float(score), ts) for score, ts in result.all())

        discourse_result = await self._session.execute(
            select(DiscourseEvaluation.scores, DiscourseEvaluation.created_at)
            .join(WritingRevision, WritingRevision.id == DiscourseEvaluation.revision_id)
            .join(WritingSubmission, WritingSubmission.id == WritingRevision.submission_id)
            .where(
                DiscourseEvaluation.created_at >= resolved.start,
                DiscourseEvaluation.created_at <= resolved.end,
            )
        )
        for scores, ts in discourse_result.all():
            for skill in DISCOURSE_SKILLS:
                value = (scores or {}).get(skill)
                if value is not None:
                    rows.append((skill, float(value), ts))

        simulation_result = await self._session.execute(
            select(SimulationEvaluation.scores, SimulationEvaluation.created_at)
            .join(SimulationTurn, SimulationTurn.id == SimulationEvaluation.turn_id)
            .join(SimulationSession, SimulationSession.id == SimulationTurn.session_id)
            .where(
                SimulationEvaluation.created_at >= resolved.start,
                SimulationEvaluation.created_at <= resolved.end,
            )
        )
        for scores, ts in simulation_result.all():
            for skill in SIMULATION_SKILLS:
                value = (scores or {}).get(skill)
                if value is not None:
                    rows.append((skill, float(value), ts))

        return self._bucket_skills(rows, resolved, min_evidence, window)

    def _bucket_skills(
        self,
        rows: list[tuple[str, float, object]],
        resolved: MetricWindow,
        min_evidence: int,
        window: str,
    ) -> list[dict]:
        baseline_map: dict[str, list[float]] = {}
        current_map: dict[str, list[float]] = {}
        for skill, score, ts in rows:
            bucket = baseline_map if self._aware(ts) < resolved.mid else current_map
            bucket.setdefault(skill, []).append(score)

        skills: list[dict] = []
        for skill in ALL_SKILLS:
            base = baseline_map.get(skill, [])
            current = current_map.get(skill, [])
            base_avg = sum(base) / len(base) if base else None
            current_avg = sum(current) / len(current) if current else None
            delta = (
                round2(current_avg - base_avg)
                if current_avg is not None and base_avg is not None
                else None
            )
            insufficient = len(base) < min_evidence or len(current) < min_evidence
            skills.append(
                {
                    "skill": skill,
                    "current": round2(current_avg),
                    "baseline": round2(base_avg),
                    "delta": delta,
                    "trend": trend_from_delta(delta),
                    "evidence_count": len(current),
                    "insufficient_evidence": insufficient,
                    "metric_ids": [
                        outcome_metric_id(skill, window, "current"),
                        outcome_metric_id(skill, window, "baseline"),
                        outcome_metric_id(skill, window, "delta"),
                    ],
                }
            )
        return skills
