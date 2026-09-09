"""Feature effectiveness: ExerciseUsefulness and per-feature aggregates (Phase 14).

ExerciseUsefulness (0..100) = 25·completion + 25·improvement + 25·engagement
- 25·failure - 25·skip, aggregated per feature dimension:

- scenario (per genre)
- simulation (per simulation_type)
- curriculum (per objective)
- difficulty (per jlpt_level + difficulty)
- vocabulary (usage/mastery rates)
- memory (context usage / activation rates)
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.exercise import Exercise, ExerciseAttempt, WritingFeedback
from app.models.memory import LearnerMemory
from app.models.simulation import SimulationEvaluation, SimulationSession, SimulationTurn
from app.models.vocabulary import UserVocabulary, VocabularyDiscovery
from app.models.writing import WritingScenario
from app.services.analytics.common import (
    enum_value,
    exercise_usefulness,
    feature_metric_id,
    resolve_window,
    round2,
)

_LOW_SCORE = 40


class FeatureEffectivenessService:
    """Computes deterministic feature effectiveness metrics for a window."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()

    async def compute(self, window: str) -> dict:
        resolved = resolve_window(window)
        min_evidence = self._settings.analytics_min_evidence
        exercises = await self._exercise_usefulness_rows(resolved.start, resolved.end)
        return {
            "window": window,
            "scenario_effectiveness": self._scenario(exercises, min_evidence, window),
            "simulation_effectiveness": await self._simulation(
                resolved.start, resolved.end, min_evidence, window
            ),
            "curriculum_effectiveness": self._curriculum(exercises, min_evidence, window),
            "recommendation_effectiveness": await self._recommendations(
                resolved.start, resolved.end, min_evidence, window
            ),
            "difficulty_effectiveness": self._difficulty(exercises, min_evidence, window),
            "vocabulary_effectiveness": await self._vocabulary(
                resolved.start, resolved.end, min_evidence, window
            ),
            "memory_effectiveness": await self._memory(
                resolved.start, resolved.end, min_evidence, window
            ),
        }

    async def _exercise_usefulness_rows(self, start, end) -> list[dict]:
        result = await self._session.execute(
            select(ExerciseAttempt, WritingFeedback, Exercise, WritingScenario)
            .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .join(Exercise, Exercise.id == ExerciseAttempt.exercise_id)
            .outerjoin(WritingScenario, WritingScenario.id == Exercise.scenario_id)
            .where(
                ExerciseAttempt.created_at >= start,
                ExerciseAttempt.created_at <= end,
            )
            .order_by(ExerciseAttempt.exercise_id, ExerciseAttempt.attempt_number.asc())
        )
        per_exercise: dict[str, dict] = {}
        for attempt, feedback, exercise, scenario in result.all():
            bucket = per_exercise.setdefault(
                exercise.id,
                {
                    "exercise": exercise,
                    "genre": scenario.genre if scenario else "none",
                    "scores": [],
                    "attempts": 0,
                    "evaluated": 0,
                    "hints": 0,
                    "failures": 0,
                },
            )
            bucket["attempts"] += 1
            bucket["evaluated"] += 1
            bucket["hints"] += attempt.hints_revealed_count
            bucket["scores"].append(feedback.overall_score)
            if feedback.overall_score < _LOW_SCORE:
                bucket["failures"] += 1

        rows = []
        for bucket in per_exercise.values():
            exercise = bucket["exercise"]
            total = bucket["attempts"]
            scores = bucket["scores"]
            completion = bucket["evaluated"] / total
            improvement = (scores[-1] - scores[0]) / 100.0 if scores else 0.0
            engagement = min(1.0, bucket["hints"] / (3.0 * total))
            failure = bucket["failures"] / total
            skip = 0.0
            rows.append(
                {
                    "exercise": exercise,
                    "genre": bucket["genre"],
                    "usefulness": exercise_usefulness(
                        completion=completion,
                        improvement=improvement,
                        engagement=engagement,
                        failure=failure,
                        skip=skip,
                    ),
                    "improvement": round2((scores[-1] - scores[0]) if scores else None),
                    "completion_rate": round2(completion),
                    "avg_score": round2(sum(scores) / len(scores)) if scores else None,
                }
            )
        return rows

    @staticmethod
    def _entry(metric_key: str, label: str, value, sample_count: int, min_evidence: int):
        return {
            "metric_key": metric_key,
            "label": label,
            "value": round2(value),
            "sample_count": sample_count,
            "trend": None,
            "insufficient_evidence": sample_count < min_evidence,
        }

    def _group_by(
        self,
        rows: list[dict],
        keyer,
        labeler,
        prefix: str,
        metric: str,
        min_evidence: int,
        window: str,
    ) -> list[dict]:
        groups: dict[str, list[dict]] = {}
        for row in rows:
            groups.setdefault(keyer(row), []).append(row)
        entries = []
        for key, group in sorted(groups.items()):
            values = [row["usefulness"] for row in group if row["usefulness"] is not None]
            entries.append(
                self._entry(
                    feature_metric_id(prefix, key, metric),
                    labeler(key),
                    sum(values) / len(values) if values else None,
                    len(group),
                    min_evidence,
                )
            )
        return entries

    def _scenario(self, rows: list[dict], min_evidence: int, window: str) -> list[dict]:
        def keyer(row):
            return row["genre"]

        def labeler(key):
            return f"Kịch bản {key}"

        return self._group_by(rows, keyer, labeler, "scenario", "usefulness", min_evidence, window)

    def _curriculum(self, rows: list[dict], min_evidence: int, window: str) -> list[dict]:
        def keyer(row):
            objective = row["exercise"].objective_id
            return objective or "none"

        def labeler(key):
            return f"Mục tiêu {key}"

        return self._group_by(
            rows, keyer, labeler, "curriculum", "usefulness", min_evidence, window
        )

    def _difficulty(self, rows: list[dict], min_evidence: int, window: str) -> list[dict]:
        groups: dict[tuple[str, int], list[dict]] = {}
        for row in rows:
            exercise = row["exercise"]
            groups.setdefault((enum_value(exercise.jlpt_level), exercise.difficulty), []).append(
                row
            )
        entries = []
        for (level, difficulty), group in sorted(groups.items()):
            scores = [row["avg_score"] for row in group if row["avg_score"] is not None]
            completions = [
                row["completion_rate"] for row in group if row["completion_rate"] is not None
            ]
            entries.append(
                self._entry(
                    feature_metric_id("difficulty", f"{level}.{difficulty}", "avg_score"),
                    f"{level} - độ khó {difficulty}",
                    sum(scores) / len(scores) if scores else None,
                    len(group),
                    min_evidence,
                )
            )
            entries.append(
                self._entry(
                    feature_metric_id("difficulty", f"{level}.{difficulty}", "completion_rate"),
                    f"{level} - độ khó {difficulty} (hoàn thành)",
                    sum(completions) / len(completions) if completions else None,
                    len(group),
                    min_evidence,
                )
            )
        return entries

    async def _simulation(self, start, end, min_evidence: int, window: str) -> list[dict]:
        result = await self._session.execute(
            select(SimulationSession).where(
                SimulationSession.created_at >= start,
                SimulationSession.created_at <= end,
            )
        )
        sessions = list(result.scalars().all())
        # Batch fetch communication scores to avoid N+1
        session_ids = [s.id for s in sessions]
        score_map: dict[str, float | None] = {}
        if session_ids:
            batch = await self._session.execute(
                select(SimulationTurn.session_id, SimulationEvaluation.scores)
                .join(SimulationEvaluation, SimulationEvaluation.turn_id == SimulationTurn.id)
                .where(SimulationTurn.session_id.in_(session_ids))
            )
            from collections import defaultdict

            grouped: dict[str, list[float]] = defaultdict(list)
            for sid, scores in batch.all():
                v = (scores or {}).get("communication_effectiveness")
                if v is not None:
                    grouped[sid].append(float(v))
            for sid in session_ids:
                vals = grouped.get(sid)
                score_map[sid] = sum(vals) / len(vals) if vals else None
        groups: dict[str, list[dict]] = {}
        for session in sessions:
            groups.setdefault(session.simulation_type, []).append(
                {"completed": session.status in ("completed", "ended"), "score": score_map.get(session.id)}
            )
        entries = []
        for simulation_type, group in sorted(groups.items()):
            completed = sum(1 for g in group if g["completed"])
            scores = [g["score"] for g in group if g["score"] is not None]
            completion = completed / len(group)
            effectiveness = sum(scores) / len(scores) if scores else None
            value = (
                round2(60.0 * completion + 40.0 * effectiveness / 100.0)
                if effectiveness is not None
                else round2(60.0 * completion / 100.0)
            )
            entries.append(
                self._entry(
                    feature_metric_id("simulation", simulation_type, "effectiveness"),
                    f"Mô phỏng {simulation_type}",
                    value * 100.0 if value is not None else None,
                    len(group),
                    min_evidence,
                )
            )
        return entries

    async def _session_communication(self, session_id: str) -> float | None:
        result = await self._session.execute(
            select(SimulationEvaluation.scores)
            .join(SimulationTurn, SimulationTurn.id == SimulationEvaluation.turn_id)
            .where(SimulationTurn.session_id == session_id)
        )
        values = [
            (scores or {}).get("communication_effectiveness")
            for (scores,) in result.all()
            if (scores or {}).get("communication_effectiveness") is not None
        ]
        return sum(values) / len(values) if values else None

    async def _recommendations(self, start, end, min_evidence: int, window: str) -> list[dict]:
        from app.models.learner_profile import LearningRecommendation

        result = await self._session.execute(
            select(LearningRecommendation).where(
                LearningRecommendation.created_at >= start,
                LearningRecommendation.created_at <= end,
            )
        )
        recommendations = list(result.scalars().all())
        completed = sum(1 for r in recommendations if r.status == "completed")
        deltas = []
        for r in recommendations:
            before = (r.skill_before or {}).get("skills", {})
            after = (r.skill_after or {}).get("skills", {})
            if before and after:
                shared = set(before) & set(after)
                if shared:
                    deltas.append(sum(after[s] - before[s] for s in shared) / len(shared))
        sample_count = len(recommendations)
        return self._entry(
            feature_metric_id("recommendation", "overall", "completion_rate"),
            "Hoàn thành gợi ý học",
            completed / sample_count if sample_count else None,
            sample_count,
            min_evidence,
        )

    async def _vocabulary(self, start, end, min_evidence: int, window: str) -> list[dict]:
        discovered = (
            await self._session.scalar(
                select(func.count())
                .select_from(VocabularyDiscovery)
                .where(
                    VocabularyDiscovery.created_at >= start,
                    VocabularyDiscovery.created_at <= end,
                )
            )
            or 0
        )
        used = (
            await self._session.scalar(
                select(func.count())
                .select_from(UserVocabulary)
                .where(
                    UserVocabulary.user_id.is_(None),
                    UserVocabulary.first_used_at.is_not(None),
                )
            )
            or 0
        )
        mastered = (
            await self._session.scalar(
                select(func.count())
                .select_from(UserVocabulary)
                .where(
                    UserVocabulary.user_id.is_(None),
                    UserVocabulary.correct_usage_count > 0,
                )
            )
            or 0
        )
        sample_count = max(discovered, 1)
        return [
            self._entry(
                feature_metric_id("vocabulary", "overall", "used_rate"),
                "Từ vựng đã dùng",
                used / sample_count,
                discovered,
                min_evidence,
            ),
            self._entry(
                feature_metric_id("vocabulary", "overall", "mastery_rate"),
                "Từ vựng thành thạo",
                mastered / sample_count,
                discovered,
                min_evidence,
            ),
        ]

    async def _memory(self, start, end, min_evidence: int, window: str) -> list[dict]:
        generated = await self._session.execute(
            select(Exercise.generation_metadata).where(
                Exercise.created_at >= start,
                Exercise.created_at <= end,
            )
        )
        rows = [row[0] for row in generated.all() if row[0]]
        used_context = sum(
            1 for meta in rows if isinstance(meta, dict) and meta.get("memory_context_used")
        )
        total_memories = (
            await self._session.scalar(select(func.count()).select_from(LearnerMemory)) or 0
        )
        active_memories = (
            await self._session.scalar(
                select(func.count())
                .select_from(LearnerMemory)
                .where(LearnerMemory.occurrence_count >= 2)
            )
            or 0
        )
        return [
            self._entry(
                feature_metric_id("memory", "context", "usage_rate"),
                "Bài tập dùng bối cảnh ghi nhớ",
                used_context / len(rows) if rows else None,
                len(rows),
                min_evidence,
            ),
            self._entry(
                feature_metric_id("memory", "bank", "activation_rate"),
                "Ghi nhớ kích hoạt",
                active_memories / total_memories if total_memories else None,
                total_memories,
                min_evidence,
            ),
        ]
