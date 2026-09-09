from collections.abc import Sequence

from sqlalchemy import exists, func, select

from app.models import (
    Challenge,
    ChallengeAttempt,
    DailyGoal,
    DailyMission,
    DiscourseEvaluation,
    DiscourseIssue,
    Exercise,
    ExerciseAttempt,
    ExerciseType,
    JlptLevel,
    LearnerProfile,
    LearningRecommendation,
    LearningSession,
    Milestone,
    MistakePattern,
    Register,
    SimulationEvaluation,
    SimulationSession,
    SimulationTurn,
    User,
    UserStreak,
    UserVocabulary,
    VocabularyDiscovery,
    VocabularyEntry,
    VocabularySourceType,
    VocabularyType,
    WritingFeedback,
    WritingRevision,
    WritingScenario,
    WritingSubmission,
    WritingWeakness as WritingWeakness,
    XPEvent,
)
from app.repositories.writing_intelligence import (
    WritingWeaknessRepository as WritingWeaknessRepository,
)
from app.repositories.writing_drill import (
    WritingDrillSessionRepository as WritingDrillSessionRepository,
)
from app.repositories.rewrite_lab import (
    RewriteLabRepository as RewriteLabRepository,
)
from app.repositories.expression_intelligence import (
    ExpressionRecordRepository as ExpressionRecordRepository,
)
from app.repositories.writing_mastery import (
    BossWritingSubmissionRepository as BossWritingSubmissionRepository,
    BossWritingTaskRepository as BossWritingTaskRepository,
)
from app.repositories.analytics import (
    AnalyticsDailyMetricRepository as AnalyticsDailyMetricRepository,
)
from app.repositories.analytics import (
    AnalyticsEventRepository as AnalyticsEventRepository,
)
from app.repositories.analytics import (
    ExperimentAssignmentRepository as ExperimentAssignmentRepository,
)
from app.repositories.analytics import (
    ExperimentRepository as ExperimentRepository,
)
from app.repositories.analytics import (
    OptimizationRecommendationRepository as OptimizationRecommendationRepository,
)
from app.repositories.base import BaseRepository
from app.repositories.curriculum import (  # noqa: E402 - after local classes
    CurriculumPlanRepository as CurriculumPlanRepository,
)
from app.repositories.curriculum import (
    CurriculumReplanningEventRepository as CurriculumReplanningEventRepository,
)
from app.repositories.curriculum import (
    CurriculumRepository as CurriculumRepository,
)
from app.repositories.curriculum import (
    LearningJourneyRepository as LearningJourneyRepository,
)
from app.repositories.curriculum import (
    LearningMilestoneRepository as LearningMilestoneRepository,
)
from app.repositories.curriculum import (
    LearningObjectiveRepository as LearningObjectiveRepository,
)
from app.repositories.curriculum import (
    ObjectiveProgressRepository as ObjectiveProgressRepository,
)
from app.repositories.memory import LearnerMemoryRepository as LearnerMemoryRepository


class UserRepository(BaseRepository[User]):
    model = User


class ExerciseRepository(BaseRepository[Exercise]):
    model = Exercise

    async def list_with_filters(
        self,
        *,
        exercise_type: ExerciseType | None = None,
        topic: str | None = None,
        register: Register | None = None,
        jlpt_level: JlptLevel | None = None,
        difficulty: int | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Exercise], int]:
        """List exercises matching the given filters, newest first."""
        conditions = []
        if exercise_type is not None:
            conditions.append(Exercise.exercise_type == exercise_type)
        if topic:
            conditions.append(func.lower(Exercise.topic) == topic.strip().lower())
        if register is not None:
            conditions.append(Exercise.register == register)
        if jlpt_level is not None:
            conditions.append(Exercise.jlpt_level == jlpt_level)
        if difficulty is not None:
            conditions.append(Exercise.difficulty == difficulty)

        count = (
            await self._session.scalar(
                select(func.count()).select_from(Exercise).where(*conditions)
            )
        ) or 0
        result = await self._session.scalars(
            select(Exercise)
            .where(*conditions)
            .order_by(Exercise.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), count

    async def find_recent(self, limit: int) -> Sequence[Exercise]:
        """Newest exercises, used by deduplication and topic-variation logic."""
        result = await self._session.scalars(
            select(Exercise).order_by(Exercise.created_at.desc()).limit(limit)
        )
        return result.all()

    async def find_by_prompt_hash(self, prompt_hash: str) -> Exercise | None:
        return await self._session.scalar(
            select(Exercise).where(Exercise.prompt_vi_hash == prompt_hash).limit(1)
        )

    async def delete_by_id(self, exercise_id: str) -> bool:
        """Delete a single exercise by ID. Cascades to attempts and related items."""
        exercise = await self.get(exercise_id)
        if exercise is None:
            return False
        await self.delete(exercise)
        return True

    async def delete_all(self) -> int:
        """Delete all exercises in single statement. Returns count."""
        from sqlalchemy import delete

        result = await self._session.execute(delete(Exercise))
        await self._session.flush()
        return result.rowcount or 0


class ExerciseAttemptRepository(BaseRepository[ExerciseAttempt]):
    model = ExerciseAttempt

    async def next_attempt_number(self, exercise_id: str) -> int:
        """Next attempt number for an exercise (1-based, immutable sequence)."""
        current = await self._session.scalar(
            select(func.max(ExerciseAttempt.attempt_number)).where(
                ExerciseAttempt.exercise_id == exercise_id
            )
        )
        return (current or 0) + 1

    async def get_for_exercise(self, exercise_id: str, attempt_id: str) -> ExerciseAttempt | None:
        return await self._session.scalar(
            select(ExerciseAttempt).where(
                ExerciseAttempt.id == attempt_id,
                ExerciseAttempt.exercise_id == exercise_id,
            )
        )

    async def previous_best(
        self, user_id: str | None, exercise_id: str, exclude_attempt_id: str
    ) -> int | None:
        """Best overall score of earlier attempts on the exercise (gamification)."""
        conditions = [
            ExerciseAttempt.exercise_id == exercise_id,
            ExerciseAttempt.id != exclude_attempt_id,
            ExerciseAttempt.user_id.is_(None)
            if user_id is None
            else ExerciseAttempt.user_id == user_id,
        ]
        best = await self._session.scalar(
            select(func.max(WritingFeedback.overall_score))
            .select_from(ExerciseAttempt)
            .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .where(*conditions)
        )
        return best if best is not None else None

    async def list_with_feedback(
        self,
        exercise_id: str,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[tuple[ExerciseAttempt, WritingFeedback | None]], int]:
        """Attempts for an exercise with their feedback, newest first."""
        conditions = [ExerciseAttempt.exercise_id == exercise_id]
        total = (
            await self._session.scalar(
                select(func.count()).select_from(ExerciseAttempt).where(*conditions)
            )
        ) or 0
        result = await self._session.execute(
            select(ExerciseAttempt, WritingFeedback)
            .outerjoin(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .where(*conditions)
            .order_by(ExerciseAttempt.attempt_number.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), total

    async def list_recent_with_feedback_and_exercise(
        self, user_id: str | None, limit: int
    ) -> list[tuple[ExerciseAttempt, WritingFeedback, Exercise]]:
        """Recent evaluated attempts (with their exercise) for a learner.

        ``user_id`` NULL selects the anonymous learner's evidence.
        """
        conditions = [
            ExerciseAttempt.user_id.is_(None)
            if user_id is None
            else ExerciseAttempt.user_id == user_id
        ]
        result = await self._session.execute(
            select(ExerciseAttempt, WritingFeedback, Exercise)
            .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .join(Exercise, Exercise.id == ExerciseAttempt.exercise_id)
            .where(*conditions)
            .order_by(ExerciseAttempt.created_at.desc())
            .limit(limit)
        )
        return list(result.all())

    async def daily_stats(self, user_id: str | None, start_utc: object) -> dict:
        """Aggregate today's evaluated attempts for a learner (gamification).

        ``start_utc`` is the UTC instant of the day boundary (computed in the
        app timezone by the caller). Returns counts and average scores.
        """
        conditions = [
            ExerciseAttempt.user_id.is_(None)
            if user_id is None
            else ExerciseAttempt.user_id == user_id,
            ExerciseAttempt.created_at >= start_utc,
        ]
        row = await self._session.execute(
            select(
                func.count(ExerciseAttempt.id),
                func.avg(WritingFeedback.overall_score),
                func.avg(WritingFeedback.semantic_score),
                func.avg(WritingFeedback.grammar_score),
                func.avg(WritingFeedback.vocabulary_score),
                func.avg(WritingFeedback.naturalness_score),
                func.avg(WritingFeedback.context_fit_score),
                func.avg(WritingFeedback.register_fit_score),
            )
            .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .where(*conditions)
        )
        counts = row.one()
        return {
            "attempts": counts[0] or 0,
            "average_score": round(counts[1]) if counts[1] is not None else None,
            "skills": {
                "semantic": round(counts[2]) if counts[2] is not None else None,
                "grammar": round(counts[3]) if counts[3] is not None else None,
                "vocabulary": round(counts[4]) if counts[4] is not None else None,
                "naturalness": round(counts[5]) if counts[5] is not None else None,
                "context_fit": round(counts[6]) if counts[6] is not None else None,
                "register_fit": round(counts[7]) if counts[7] is not None else None,
            },
        }


class WritingFeedbackRepository(BaseRepository[WritingFeedback]):
    model = WritingFeedback

    async def get_by_attempt(self, attempt_id: str) -> WritingFeedback | None:
        return await self._session.scalar(
            select(WritingFeedback).where(WritingFeedback.attempt_id == attempt_id)
        )


class VocabularyEntryRepository(BaseRepository[VocabularyEntry]):
    model = VocabularyEntry

    async def get_by_normalized(self, normalized_expression: str) -> VocabularyEntry | None:
        return await self._session.scalar(
            select(VocabularyEntry).where(
                VocabularyEntry.normalized_expression == normalized_expression
            )
        )

    async def list_expressions(self, limit: int = 200) -> list[str]:
        """Existing expressions (for AI duplicate detection), newest first."""
        result = await self._session.scalars(
            select(VocabularyEntry.expression)
            .order_by(VocabularyEntry.created_at.desc())
            .limit(limit)
        )
        return list(result.all())

    async def list_bank(
        self,
        *,
        vocabulary_type: str | None = None,
        jlpt_level: str | None = None,
        difficulty_min: int | None = None,
        difficulty_max: int | None = None,
        register: str | None = None,
        source_type: str | None = None,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[tuple[VocabularyEntry, UserVocabulary | None]], int]:
        """Vocabulary Bank rows (entry + anonymous-user state), newest first."""
        conditions = []
        if vocabulary_type is not None:
            conditions.append(VocabularyEntry.type == VocabularyType(vocabulary_type))
        if jlpt_level is not None:
            conditions.append(VocabularyEntry.estimated_jlpt_level == jlpt_level)
        if difficulty_min is not None:
            conditions.append(VocabularyEntry.difficulty >= difficulty_min)
        if difficulty_max is not None:
            conditions.append(VocabularyEntry.difficulty <= difficulty_max)
        if register is not None:
            conditions.append(VocabularyEntry.register == register)
        if source_type is not None:
            conditions.append(
                exists().where(
                    VocabularyDiscovery.entry_id == VocabularyEntry.id,
                    VocabularyDiscovery.source_type == VocabularySourceType(source_type),
                )
            )
        if search:
            conditions.append(
                VocabularyEntry.expression.contains(search.strip())
                | VocabularyEntry.reading.contains(search.strip())
                | VocabularyEntry.meaning_vi.contains(search.strip())
            )

        total = (
            await self._session.scalar(
                select(func.count()).select_from(VocabularyEntry).where(*conditions)
            )
        ) or 0
        rows = await self._session.execute(
            select(VocabularyEntry, UserVocabulary)
            .outerjoin(UserVocabulary, UserVocabulary.entry_id == VocabularyEntry.id)
            .where(*conditions)
            .order_by(VocabularyEntry.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(rows.all()), total


class UserVocabularyRepository(BaseRepository[UserVocabulary]):
    model = UserVocabulary

    async def get_by_entry(self, entry_id: str) -> UserVocabulary | None:
        """State for the anonymous learner (user_id is NULL until auth exists)."""
        return await self._session.scalar(
            select(UserVocabulary).where(
                UserVocabulary.entry_id == entry_id,
                UserVocabulary.user_id.is_(None),
            )
        )

    async def list_recent_for_user(
        self, user_id: str | None, limit: int = 10
    ) -> list[VocabularyEntry]:
        """Recent vocabulary the learner added, newest first."""
        result = await self._session.scalars(
            select(VocabularyEntry)
            .join(UserVocabulary, UserVocabulary.entry_id == VocabularyEntry.id)
            .where(
                UserVocabulary.user_id.is_(None)
                if user_id is None
                else UserVocabulary.user_id == user_id
            )
            .order_by(UserVocabulary.created_at.desc())
            .limit(limit)
        )
        return list(result.all())


class VocabularyDiscoveryRepository(BaseRepository[VocabularyDiscovery]):
    model = VocabularyDiscovery

    async def get_by_attempt_entry_source(
        self, attempt_id: str, entry_id: str, source_type: str
    ) -> VocabularyDiscovery | None:
        result = await self._session.execute(
            select(VocabularyDiscovery).where(
                VocabularyDiscovery.attempt_id == attempt_id,
                VocabularyDiscovery.entry_id == entry_id,
                VocabularyDiscovery.source_type == source_type,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_attempt(
        self, attempt_id: str
    ) -> list[tuple[VocabularyDiscovery, VocabularyEntry]]:
        result = await self._session.execute(
            select(VocabularyDiscovery, VocabularyEntry)
            .join(VocabularyEntry, VocabularyEntry.id == VocabularyDiscovery.entry_id)
            .where(VocabularyDiscovery.attempt_id == attempt_id)
            .order_by(VocabularyDiscovery.created_at.desc())
        )
        return list(result.all())

    async def list_by_entry(
        self, entry_id: str
    ) -> list[tuple[VocabularyDiscovery, ExerciseAttempt]]:
        result = await self._session.execute(
            select(VocabularyDiscovery, ExerciseAttempt)
            .join(ExerciseAttempt, ExerciseAttempt.id == VocabularyDiscovery.attempt_id)
            .where(VocabularyDiscovery.entry_id == entry_id)
            .order_by(VocabularyDiscovery.created_at.desc())
        )
        return list(result.all())

    async def count_since(self, start_utc: object) -> int:
        """Discoveries created since ``start_utc`` (used by the daily summary)."""
        return (
            await self._session.scalar(
                select(func.count())
                .select_from(VocabularyDiscovery)
                .where(VocabularyDiscovery.created_at >= start_utc)
            )
            or 0
        )


class LearnerProfileRepository(BaseRepository[LearnerProfile]):
    model = LearnerProfile

    async def get_for_user(self, user_id: str | None) -> LearnerProfile | None:
        """Profile for a user; the anonymous learner uses NULL user_id."""
        if user_id is None:
            return await self._session.scalar(
                select(LearnerProfile).where(LearnerProfile.user_id.is_(None)).limit(1)
            )
        return await self._session.scalar(
            select(LearnerProfile).where(LearnerProfile.user_id == user_id).limit(1)
        )


class MistakePatternRepository(BaseRepository[MistakePattern]):
    model = MistakePattern

    async def get_by_label(
        self, user_id: str | None, canonical_label: str
    ) -> MistakePattern | None:
        return await self._session.scalar(
            select(MistakePattern).where(
                MistakePattern.user_id.is_(None)
                if user_id is None
                else MistakePattern.user_id == user_id,
                MistakePattern.canonical_label == canonical_label,
            )
        )

    async def list_by_user(self, user_id: str | None, limit: int = 100) -> list[MistakePattern]:
        result = await self._session.scalars(
            select(MistakePattern)
            .where(
                MistakePattern.user_id.is_(None)
                if user_id is None
                else MistakePattern.user_id == user_id
            )
            .order_by(MistakePattern.evidence_count.desc())
            .limit(limit)
        )
        return list(result.all())


class LearningRecommendationRepository(BaseRepository[LearningRecommendation]):
    model = LearningRecommendation

    async def list_by_user(
        self, user_id: str | None, *, skip: int = 0, limit: int = 50
    ) -> tuple[list[LearningRecommendation], int]:
        conditions = [
            LearningRecommendation.user_id.is_(None)
            if user_id is None
            else LearningRecommendation.user_id == user_id
        ]
        total = (
            await self._session.scalar(
                select(func.count()).select_from(LearningRecommendation).where(*conditions)
            )
        ) or 0
        result = await self._session.scalars(
            select(LearningRecommendation)
            .where(*conditions)
            .order_by(LearningRecommendation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), total

    async def get_active_by_user(
        self, user_id: str | None, strategy: str | None = None
    ) -> LearningRecommendation | None:
        conditions = [
            LearningRecommendation.user_id.is_(None)
            if user_id is None
            else LearningRecommendation.user_id == user_id,
            LearningRecommendation.status == "recommended",
        ]
        if strategy is not None:
            conditions.append(LearningRecommendation.strategy == strategy)
        return await self._session.scalar(
            select(LearningRecommendation)
            .where(*conditions)
            .order_by(LearningRecommendation.created_at.desc())
            .limit(1)
        )


class LearningSessionRepository(BaseRepository[LearningSession]):
    model = LearningSession

    async def get_active_by_user(self, user_id: str | None) -> LearningSession | None:
        conditions = [
            LearningSession.user_id.is_(None)
            if user_id is None
            else LearningSession.user_id == user_id,
            LearningSession.is_active.is_(True),
        ]
        return await self._session.scalar(
            select(LearningSession)
            .where(*conditions)
            .order_by(LearningSession.created_at.desc())
            .limit(1)
        )

    async def list_by_user(
        self, user_id: str | None, *, skip: int = 0, limit: int = 20
    ) -> tuple[list[LearningSession], int]:
        conditions = [
            LearningSession.user_id.is_(None)
            if user_id is None
            else LearningSession.user_id == user_id
        ]
        total = (
            await self._session.scalar(
                select(func.count()).select_from(LearningSession).where(*conditions)
            )
        ) or 0
        result = await self._session.scalars(
            select(LearningSession)
            .where(*conditions)
            .order_by(LearningSession.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), total


def _user_condition(model: object, user_id: str | None):
    """NULL user_id selects the anonymous learner's rows."""
    column = model.user_id
    return column.is_(None) if user_id is None else column == user_id


class XPEventRepository(BaseRepository[XPEvent]):
    model = XPEvent

    async def get_by_idempotency_key(self, user_id: str | None, key: str) -> XPEvent | None:
        return await self._session.scalar(
            select(XPEvent).where(_user_condition(XPEvent, user_id), XPEvent.idempotency_key == key)
        )

    async def list_by_user(
        self, user_id: str | None, *, skip: int = 0, limit: int = 50
    ) -> tuple[list[XPEvent], int]:
        conditions = [_user_condition(XPEvent, user_id)]
        total = (
            await self._session.scalar(select(func.count()).select_from(XPEvent).where(*conditions))
        ) or 0
        result = await self._session.scalars(
            select(XPEvent)
            .where(*conditions)
            .order_by(XPEvent.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), total

    async def total_xp(self, user_id: str | None) -> int:
        return (
            await self._session.scalar(
                select(func.coalesce(func.sum(XPEvent.amount), 0)).where(
                    _user_condition(XPEvent, user_id)
                )
            )
            or 0
        )

    async def xp_since(self, user_id: str | None, start_utc: object) -> int:
        """Total XP awarded since ``start_utc`` (used for today's XP)."""
        return (
            await self._session.scalar(
                select(func.coalesce(func.sum(XPEvent.amount), 0)).where(
                    _user_condition(XPEvent, user_id),
                    XPEvent.created_at >= start_utc,
                )
            )
            or 0
        )

    async def count_by_type(self, user_id: str | None, event_type: str) -> int:
        return (
            await self._session.scalar(
                select(func.count())
                .select_from(XPEvent)
                .where(_user_condition(XPEvent, user_id), XPEvent.event_type == event_type)
            )
            or 0
        )


class UserStreakRepository(BaseRepository[UserStreak]):
    model = UserStreak

    async def get_for_user(self, user_id: str | None) -> UserStreak | None:
        return await self._session.scalar(
            select(UserStreak).where(_user_condition(UserStreak, user_id)).limit(1)
        )


class DailyGoalRepository(BaseRepository[DailyGoal]):
    model = DailyGoal

    async def get_by_user_date(self, user_id: str | None, goal_date) -> DailyGoal | None:
        return await self._session.scalar(
            select(DailyGoal).where(
                _user_condition(DailyGoal, user_id), DailyGoal.goal_date == goal_date
            )
        )


class DailyMissionRepository(BaseRepository[DailyMission]):
    model = DailyMission

    async def get_active_by_user_date(
        self, user_id: str | None, mission_date
    ) -> DailyMission | None:
        return await self._session.scalar(
            select(DailyMission)
            .where(
                _user_condition(DailyMission, user_id),
                DailyMission.mission_date == mission_date,
                DailyMission.status == "active",
            )
            .order_by(DailyMission.created_at.desc())
            .limit(1)
        )

    async def get_today_mission(self, user_id: str | None, mission_date) -> DailyMission | None:
        """The day's mission regardless of status (active or completed).

        Used by ``get_or_generate`` so a completed mission is never replaced
        by a fresh one on the same day.
        """
        return await self._session.scalar(
            select(DailyMission)
            .where(
                _user_condition(DailyMission, user_id),
                DailyMission.mission_date == mission_date,
                DailyMission.status.in_(("active", "completed")),
            )
            .order_by(DailyMission.created_at.desc())
            .limit(1)
        )

    async def list_by_user_date(self, user_id: str | None, mission_date) -> list[DailyMission]:
        result = await self._session.scalars(
            select(DailyMission)
            .where(
                _user_condition(DailyMission, user_id), DailyMission.mission_date == mission_date
            )
            .order_by(DailyMission.created_at.desc())
        )
        return list(result.all())

    async def list_recent_by_user(self, user_id: str | None, limit: int = 5) -> list[DailyMission]:
        result = await self._session.scalars(
            select(DailyMission)
            .where(_user_condition(DailyMission, user_id))
            .order_by(DailyMission.created_at.desc())
            .limit(limit)
        )
        return list(result.all())


class ChallengeRepository(BaseRepository[Challenge]):
    model = Challenge

    async def get_for_user(self, user_id: str | None, challenge_id: str) -> Challenge | None:
        return await self._session.scalar(
            select(Challenge).where(
                _user_condition(Challenge, user_id), Challenge.id == challenge_id
            )
        )

    async def list_recent_by_user(self, user_id: str | None, limit: int = 10) -> list[Challenge]:
        result = await self._session.scalars(
            select(Challenge)
            .where(_user_condition(Challenge, user_id))
            .order_by(Challenge.created_at.desc())
            .limit(limit)
        )
        return list(result.all())


class ChallengeAttemptRepository(BaseRepository[ChallengeAttempt]):
    model = ChallengeAttempt

    async def list_by_challenge(self, challenge_id: str) -> list[ChallengeAttempt]:
        result = await self._session.scalars(
            select(ChallengeAttempt)
            .where(ChallengeAttempt.challenge_id == challenge_id)
            .order_by(ChallengeAttempt.created_at.asc())
        )
        return list(result.all())

    async def get_by_challenge_attempt(
        self, challenge_id: str, attempt_id: str
    ) -> ChallengeAttempt | None:
        return await self._session.scalar(
            select(ChallengeAttempt).where(
                ChallengeAttempt.challenge_id == challenge_id,
                ChallengeAttempt.attempt_id == attempt_id,
            )
        )


class MilestoneRepository(BaseRepository[Milestone]):
    model = Milestone

    async def get_by_user_key(self, user_id: str | None, milestone_key: str) -> Milestone | None:
        return await self._session.scalar(
            select(Milestone).where(
                _user_condition(Milestone, user_id), Milestone.milestone_key == milestone_key
            )
        )

    async def list_by_user(self, user_id: str | None) -> list[Milestone]:
        result = await self._session.scalars(
            select(Milestone)
            .where(_user_condition(Milestone, user_id))
            .order_by(Milestone.achieved_at.desc())
        )
        return list(result.all())

    async def count_by_user(self, user_id: str | None) -> int:
        return (
            await self._session.scalar(
                select(func.count())
                .select_from(Milestone)
                .where(_user_condition(Milestone, user_id))
            )
            or 0
        )


class WritingSubmissionRepository(BaseRepository[WritingSubmission]):
    model = WritingSubmission

    async def get_for_user(
        self, user_id: str | None, submission_id: str
    ) -> WritingSubmission | None:
        return await self._session.scalar(
            select(WritingSubmission).where(
                _user_condition(WritingSubmission, user_id),
                WritingSubmission.id == submission_id,
            )
        )

    async def next_revision_number(self, submission_id: str) -> int:
        current = await self._session.scalar(
            select(func.max(WritingRevision.revision_number)).where(
                WritingRevision.submission_id == submission_id
            )
        )
        return (current or 0) + 1


class WritingRevisionRepository(BaseRepository[WritingRevision]):
    model = WritingRevision

    async def get_by_submission(
        self, submission_id: str, revision_number: int
    ) -> WritingRevision | None:
        return await self._session.scalar(
            select(WritingRevision).where(
                WritingRevision.submission_id == submission_id,
                WritingRevision.revision_number == revision_number,
            )
        )

    async def list_by_submission(self, submission_id: str) -> list[WritingRevision]:
        result = await self._session.scalars(
            select(WritingRevision)
            .where(WritingRevision.submission_id == submission_id)
            .order_by(WritingRevision.revision_number.asc())
        )
        return list(result.all())


class DiscourseEvaluationRepository(BaseRepository[DiscourseEvaluation]):
    model = DiscourseEvaluation

    async def get_by_revision(self, revision_id: str) -> DiscourseEvaluation | None:
        return await self._session.scalar(
            select(DiscourseEvaluation).where(DiscourseEvaluation.revision_id == revision_id)
        )

    async def latest_by_submission(self, submission_id: str) -> DiscourseEvaluation | None:
        """Newest evaluation across all revisions of a submission."""
        return await self._session.scalar(
            select(DiscourseEvaluation)
            .join(WritingRevision, WritingRevision.id == DiscourseEvaluation.revision_id)
            .where(WritingRevision.submission_id == submission_id)
            .order_by(WritingRevision.revision_number.desc())
            .limit(1)
        )

    async def list_recent_for_user(
        self, user_id: str | None, limit: int = 50
    ) -> list[tuple[DiscourseEvaluation, WritingSubmission, Exercise]]:
        """Recent discourse evaluations (with submission and exercise) for a
        learner; the anonymous learner uses NULL user_id."""
        result = await self._session.execute(
            select(DiscourseEvaluation, WritingSubmission, Exercise)
            .join(WritingRevision, WritingRevision.id == DiscourseEvaluation.revision_id)
            .join(WritingSubmission, WritingSubmission.id == WritingRevision.submission_id)
            .join(Exercise, Exercise.id == WritingSubmission.exercise_id)
            .where(
                WritingSubmission.user_id.is_(None)
                if user_id is None
                else WritingSubmission.user_id == user_id
            )
            .order_by(DiscourseEvaluation.created_at.desc())
            .limit(limit)
        )
        return list(result.all())


class DiscourseIssueRepository(BaseRepository[DiscourseIssue]):
    model = DiscourseIssue

    async def list_by_evaluation(self, evaluation_id: str) -> list[DiscourseIssue]:
        result = await self._session.scalars(
            select(DiscourseIssue)
            .where(DiscourseIssue.evaluation_id == evaluation_id)
            .order_by(DiscourseIssue.issue_number.asc())
        )
        return list(result.all())


class WritingScenarioRepository(BaseRepository[WritingScenario]):
    model = WritingScenario

    async def get_for_user(self, user_id: str | None, scenario_id: str) -> WritingScenario | None:
        return await self._session.scalar(
            select(WritingScenario).where(
                _user_condition(WritingScenario, user_id),
                WritingScenario.id == scenario_id,
            )
        )

    async def list_recent_for_user(
        self, user_id: str | None, limit: int = 10
    ) -> list[WritingScenario]:
        """Most recently generated scenarios for the learner, newest first."""
        result = await self._session.scalars(
            select(WritingScenario)
            .where(_user_condition(WritingScenario, user_id))
            .order_by(WritingScenario.created_at.desc())
            .limit(limit)
        )
        return list(result.all())

    async def list_recent_completed_for_user(
        self, user_id: str | None, limit: int = 10
    ) -> list[tuple[WritingScenario, ExerciseAttempt, WritingFeedback]]:
        """Recently completed scenario exercises (scenario + attempt + feedback).

        Powers the lightweight scenario history and repetition avoidance.
        """
        result = await self._session.execute(
            select(WritingScenario, ExerciseAttempt, WritingFeedback)
            .join(Exercise, Exercise.scenario_id == WritingScenario.id)
            .join(ExerciseAttempt, ExerciseAttempt.exercise_id == Exercise.id)
            .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
            .where(
                WritingScenario.user_id.is_(None)
                if user_id is None
                else WritingScenario.user_id == user_id
            )
            .order_by(ExerciseAttempt.created_at.desc())
            .limit(limit)
        )
        return list(result.all())


class SimulationSessionRepository(BaseRepository[SimulationSession]):
    model = SimulationSession

    async def get_for_user(self, user_id: str | None, session_id: str) -> SimulationSession | None:
        return await self._session.scalar(
            select(SimulationSession).where(
                _user_condition(SimulationSession, user_id),
                SimulationSession.id == session_id,
            )
        )

    async def list_for_user(
        self, user_id: str | None, *, skip: int = 0, limit: int = 20
    ) -> tuple[list[SimulationSession], int]:
        conditions = [_user_condition(SimulationSession, user_id)]
        total = (
            await self._session.scalar(
                select(func.count()).select_from(SimulationSession).where(*conditions)
            )
            or 0
        )
        result = await self._session.scalars(
            select(SimulationSession)
            .where(*conditions)
            .order_by(SimulationSession.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.all()), total

    async def list_completed_for_scenario(
        self, user_id: str | None, scenario_id: str
    ) -> list[SimulationSession]:
        result = await self._session.scalars(
            select(SimulationSession)
            .where(
                _user_condition(SimulationSession, user_id),
                SimulationSession.scenario_id == scenario_id,
                SimulationSession.status.in_(("completed", "ended")),
            )
            .order_by(SimulationSession.created_at.desc())
        )
        return list(result.all())

    async def list_recent_for_user(
        self, user_id: str | None, limit: int = 50
    ) -> list[SimulationSession]:
        result = await self._session.scalars(
            select(SimulationSession)
            .where(_user_condition(SimulationSession, user_id))
            .order_by(SimulationSession.created_at.desc())
            .limit(limit)
        )
        return list(result.all())


class SimulationTurnRepository(BaseRepository[SimulationTurn]):
    model = SimulationTurn

    async def list_by_session(self, session_id: str) -> list[SimulationTurn]:
        result = await self._session.scalars(
            select(SimulationTurn)
            .where(SimulationTurn.session_id == session_id)
            .order_by(SimulationTurn.turn_number.asc())
        )
        return list(result.all())

    async def get_by_session_number(
        self, session_id: str, turn_number: int
    ) -> SimulationTurn | None:
        return await self._session.scalar(
            select(SimulationTurn).where(
                SimulationTurn.session_id == session_id,
                SimulationTurn.turn_number == turn_number,
            )
        )


class SimulationEvaluationRepository(BaseRepository[SimulationEvaluation]):
    model = SimulationEvaluation

    async def get_by_turn(self, turn_id: str) -> SimulationEvaluation | None:
        return await self._session.scalar(
            select(SimulationEvaluation).where(SimulationEvaluation.turn_id == turn_id)
        )

    async def list_by_session(self, session_id: str) -> list[SimulationEvaluation]:
        result = await self._session.execute(
            select(SimulationEvaluation)
            .join(SimulationTurn, SimulationTurn.id == SimulationEvaluation.turn_id)
            .where(SimulationTurn.session_id == session_id)
            .order_by(SimulationTurn.turn_number.asc())
        )
        return list(result.scalars().all())

    async def list_recent_for_user(
        self, user_id: str | None, limit: int = 50
    ) -> list[tuple[SimulationEvaluation, SimulationTurn, SimulationSession, WritingScenario]]:
        """Recent simulation evaluations (with turn, session and scenario) for
        a learner; the anonymous learner uses NULL user_id."""
        result = await self._session.execute(
            select(SimulationEvaluation, SimulationTurn, SimulationSession, WritingScenario)
            .join(SimulationTurn, SimulationTurn.id == SimulationEvaluation.turn_id)
            .join(SimulationSession, SimulationSession.id == SimulationTurn.session_id)
            .join(WritingScenario, WritingScenario.id == SimulationSession.scenario_id)
            .where(
                SimulationSession.user_id.is_(None)
                if user_id is None
                else SimulationSession.user_id == user_id
            )
            .order_by(SimulationEvaluation.created_at.desc())
            .limit(limit)
        )
        return list(result.all())
