"""Gamification engine (Phase 7): deterministic XP, levels, streaks, daily
goals, milestones, mission progress, AI celebrations and summaries.

All rewards are deterministic and idempotent (unique idempotency keys in the
XP event ledger). AI only narrates real events. The whole engine never
raises: failures degrade to deterministic fallbacks and are logged.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, get_settings
from app.models import (
    Challenge,
    DailyGoal,
    DailyMission,
    Exercise,
    Milestone,
    UserStreak,
    XPEvent,
)
from app.prompts.encouragement import (
    build_encouragement_prompt,
    encouragement_prompt_version,
)
from app.prompts.milestone_celebration import (
    build_milestone_celebration_prompt,
    milestone_celebration_prompt_version,
)
from app.prompts.progress_summary import (
    build_progress_summary_prompt,
    progress_summary_prompt_version,
)
from app.quality.service import create_quality_service
from app.repositories import (
    DailyGoalRepository,
    ExerciseAttemptRepository,
    LearningSessionRepository,
    MilestoneRepository,
    UserStreakRepository,
    VocabularyDiscoveryRepository,
    XPEventRepository,
)
from app.schemas.gamification_ai import (
    EncouragementResult,
    MilestoneCelebrationResult,
    ProgressSummaryResult,
)
from app.services.ai_service import AIService
from app.services.learner_profile_service import LearnerProfileService
from app.services.mission_service import MissionService
from app.services.timezone_service import app_timezone, day_key, now_utc

logger = logging.getLogger("app.gamification")

MILESTONE_DEFINITIONS: dict[str, dict[str, str]] = {
    "exercises_10": {
        "title": "10 bài viết đã hoàn thành",
        "description": "Hoàn thành 10 bài viết có đánh giá.",
    },
    "exercises_50": {
        "title": "50 bài viết đã hoàn thành",
        "description": "Hoàn thành 50 bài viết có đánh giá.",
    },
    "exercises_100": {
        "title": "100 bài viết đã hoàn thành",
        "description": "Hoàn thành 100 bài viết có đánh giá.",
    },
    "streak_7": {
        "title": "Chuỗi luyện tập 7 ngày",
        "description": "Duy trì luyện tập 7 ngày liên tiếp.",
    },
    "streak_30": {
        "title": "Chuỗi luyện tập 30 ngày",
        "description": "Duy trì luyện tập 30 ngày liên tiếp.",
    },
    "first_business_challenge": {
        "title": "Thử thách business đầu tiên",
        "description": "Hoàn thành thử thách viết tiếng Nhật business.",
    },
    "first_paragraph": {
        "title": "Đoạn văn đầu tiên",
        "description": "Hoàn thành bài viết đoạn văn đầu tiên.",
    },
    "naturalness_90": {
        "title": "Độ tự nhiên trên 90",
        "description": "Đạt điểm naturalness trên 90 trong một bài viết.",
    },
    "first_n2": {
        "title": "Bài JLPT N2 đầu tiên",
        "description": "Hoàn thành bài viết cấp độ JLPT N2 trở lên.",
    },
}


def level_info(total_xp: int, base: int) -> dict[str, int]:
    """Deterministic level model: cost from level L to L+1 is ``base * L``.

    Level 1 starts at 0 XP; cumulative thresholds 100, 300, 600, ...
    """
    level = 1
    remaining = max(0, total_xp)
    while remaining >= base * level:
        remaining -= base * level
        level += 1
    step = base * level
    progress = int(remaining * 100 / step) if step else 0
    return {
        "current_level": level,
        "current_xp": total_xp,
        "xp_in_level": remaining,
        "xp_to_next_level": step - remaining,
        "progress_percent": progress,
    }


def normalize_scores(scores: dict[str, Any]) -> dict[str, int]:
    """Accept both ``overall`` and ``overall_score`` key conventions."""
    normalized: dict[str, int] = {}
    for key, value in scores.items():
        plain = key[:-6] if key.endswith("_score") else key
        normalized[plain] = int(value)
    return normalized


class GamificationService:
    """Coordinates XP, streak, goal, mission and milestone logic."""

    def __init__(
        self,
        xp_repository: XPEventRepository,
        streak_repository: UserStreakRepository,
        goal_repository: DailyGoalRepository,
        milestone_repository: MilestoneRepository,
        attempt_repository: ExerciseAttemptRepository,
        discovery_repository: VocabularyDiscoveryRepository,
        session_repository: LearningSessionRepository,
        missions: MissionService,
        profile_service: LearnerProfileService,
        ai_service: AIService,
        settings: Settings | None = None,
    ) -> None:
        self._xp = xp_repository
        self._streaks = streak_repository
        self._goals = goal_repository
        self._milestones = milestone_repository
        self._attempts = attempt_repository
        self._discoveries = discovery_repository
        self._sessions = session_repository
        self._missions = missions
        self._profiles = profile_service
        self._ai = ai_service
        self._settings = settings or get_settings()
        self._quality = create_quality_service(settings=self._settings)

    def _task(self) -> tuple[str | None, str | None]:
        settings = self._settings
        provider = (
            settings.ai_gamification_provider
            or settings.ai_learning_provider
            or settings.ai_exercise_evaluation_provider
            or settings.ai_default_provider
            or None
        )
        return provider, settings.ai_gamification_model or None

    # ------------------------------------------------------------------ hooks

    async def record_exercise_activity(
        self,
        user_id: str | None,
        *,
        exercise: Exercise,
        attempt_id: str,
        scores: dict[str, Any],
        is_first_attempt: bool,
        previous_best: int | None,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        """Post-evaluation hook for a normal writing attempt (never raises)."""
        try:
            if not self._settings.gamification_enabled:
                return {"enabled": False}
            day = day_key(now, self._settings)
            events: dict[str, Any] = {
                "enabled": True,
                "xp_events": [],
                "milestones": [],
                "encouragement": None,
                "progress_summary": None,
            }
            scores = normalize_scores(scores)

            streak = await self._update_streak(user_id, day)
            events["streak"] = self._streak_payload(streak)

            goal = await self._update_goal(user_id, day, count=1)
            events["daily_goal"] = self._goal_payload(goal)

            mission, mission_completed = await self._missions.record_progress(user_id, day, count=1)
            events["mission_completed"] = mission_completed
            if mission_completed:
                await self._award(
                    user_id,
                    "mission_complete",
                    self._settings.xp_mission_complete,
                    "daily_mission",
                    mission.id if mission is not None else str(day),
                    f"mission:{mission.id if mission is not None else day}:complete",
                )

            overall = int(scores.get("overall", 0))
            awarded = await self._award(
                user_id,
                "exercise_complete",
                self._settings.xp_exercise_complete,
                "exercise_attempt",
                attempt_id,
                f"exercise:{attempt_id}:complete",
                metadata={
                    "exercise_type": exercise.exercise_type.value,
                    "topic": exercise.topic,
                    "register": exercise.register.value,
                    "jlpt_level": exercise.jlpt_level.value,
                    "difficulty": exercise.difficulty,
                    "target_length": exercise.target_length.value,
                    "overall_score": overall,
                    "is_first_attempt": is_first_attempt,
                },
            )
            if awarded is not None:
                events["xp_events"].append(self._xp_event_payload(awarded))

            if is_first_attempt and overall >= self._settings.xp_high_score_threshold:
                awarded = await self._award(
                    user_id,
                    "high_score_bonus",
                    self._settings.xp_high_score_bonus,
                    "exercise_attempt",
                    attempt_id,
                    f"exercise:{attempt_id}:high_score",
                    metadata={"overall_score": overall},
                )
                if awarded is not None:
                    events["xp_events"].append(self._xp_event_payload(awarded))

            improvement = (
                previous_best is not None
                and overall - previous_best >= self._settings.xp_retry_improvement_delta
            )
            if improvement:
                awarded = await self._award(
                    user_id,
                    "retry_improvement",
                    self._settings.xp_retry_improvement,
                    "exercise_attempt",
                    attempt_id,
                    f"exercise:{attempt_id}:improvement",
                    metadata={"before": previous_best, "after": overall},
                )
                if awarded is not None:
                    events["xp_events"].append(self._xp_event_payload(awarded))

            if (is_first_attempt and overall >= self._settings.xp_high_score_threshold) or (
                improvement
            ):
                events["encouragement"] = await self._maybe_encourage(
                    user_id,
                    day,
                    overall=overall,
                    previous_best=previous_best,
                    improvement=improvement,
                )

            context = {
                "activity_type": "exercise",
                "exercise": exercise,
                "scores": scores,
                "streak_current": streak.current_streak if streak is not None else 0,
            }
            events["milestones"] = [
                {"milestone_key": m.milestone_key, "title": m.title}
                for m in await self._check_milestones(user_id, context)
            ]

            if goal.completed and goal.completed_at is not None:
                events["progress_summary"] = await self._generate_progress_summary(user_id, day)
            return events
        except Exception:
            logger.exception("gamification hook failed (writing flow is unaffected)")
            return {"enabled": True, "error": True}

    async def record_challenge_activity(
        self,
        user_id: str | None,
        *,
        challenge: Challenge,
        exercise: Exercise | None,
        score: int,
        success: bool,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        """Post-evaluation hook for a challenge attempt (never raises)."""
        try:
            if not self._settings.gamification_enabled:
                return {"enabled": False}
            day = day_key(now, self._settings)
            events: dict[str, Any] = {
                "enabled": True,
                "xp_events": [],
                "milestones": [],
                "encouragement": None,
                "progress_summary": None,
            }

            streak = await self._update_streak(user_id, day)
            events["streak"] = self._streak_payload(streak)
            streak_current = events["streak"]["current_streak"]

            goal = await self._update_goal(user_id, day, count=1)
            events["daily_goal"] = self._goal_payload(goal)
            goal_completed = bool(goal.completed and goal.completed_at is not None)

            mission, mission_completed = await self._missions.record_progress(
                user_id, day, count=1 if success else 0
            )
            events["mission_completed"] = mission_completed
            if mission_completed:
                await self._award(
                    user_id,
                    "mission_complete",
                    self._settings.xp_mission_complete,
                    "daily_mission",
                    mission.id if mission is not None else str(day),
                    f"mission:{mission.id if mission is not None else day}:complete",
                )

            if success:
                awarded = await self._award(
                    user_id,
                    "challenge_complete",
                    self._settings.xp_challenge_complete,
                    "challenge",
                    challenge.id,
                    f"challenge:{challenge.id}:complete",
                    metadata={
                        "challenge_type": challenge.challenge_type,
                        "score": score,
                    },
                )
                if awarded is not None:
                    events["xp_events"].append(self._xp_event_payload(awarded))

            context = {
                "activity_type": "challenge",
                "challenge": challenge,
                "exercise": exercise,
                "scores": {"overall": score},
                "streak_current": streak_current,
            }
            events["milestones"] = [
                {"milestone_key": m.milestone_key, "title": m.title}
                for m in await self._check_milestones(user_id, context)
            ]

            if goal_completed:
                events["progress_summary"] = await self._generate_progress_summary(user_id, day)
            return events
        except Exception:
            logger.exception("gamification hook failed (writing flow is unaffected)")
            return {"enabled": True, "error": True}

    @staticmethod
    def _sim_attr(session: Any, key: str, default: Any = None) -> Any:
        if isinstance(session, dict):
            return session.get(key, default)
        return getattr(session, key, default)

    async def record_simulation_activity(
        self,
        user_id: str | None,
        *,
        session: Any,
        average: int | None,
        objective_resolved: bool,
        improved: bool,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        """End-of-session hook for an interactive simulation (never raises).

        One completed simulation counts as one activity toward streak, daily
        goal and mission; XP awards are idempotent per session. ``session``
        is expected to be a plain snapshot dict (``id``, ``simulation_type``,
        ``mode``, ``resolution``); ORM objects are tolerated defensively.
        """
        try:
            if not self._settings.gamification_enabled:
                return {"enabled": False}
            day = day_key(now, self._settings)
            events: dict[str, Any] = {
                "enabled": True,
                "xp_events": [],
                "milestones": [],
                "encouragement": None,
                "progress_summary": None,
            }

            streak = await self._update_streak(user_id, day)
            events["streak"] = self._streak_payload(streak)
            streak_current = events["streak"]["current_streak"]

            goal = await self._update_goal(user_id, day, count=1)
            events["daily_goal"] = self._goal_payload(goal)
            goal_completed = bool(goal.completed and goal.completed_at is not None)

            mission, mission_completed = await self._missions.record_progress(user_id, day, count=1)
            events["mission_completed"] = mission_completed
            if mission_completed:
                await self._award(
                    user_id,
                    "mission_complete",
                    self._settings.xp_mission_complete,
                    "daily_mission",
                    mission.id if mission is not None else str(day),
                    f"mission:{mission.id if mission is not None else day}:complete",
                )

            awarded = await self._award(
                user_id,
                "simulation_complete",
                self._settings.xp_simulation_complete,
                "simulation",
                self._sim_attr(session, "id"),
                f"simulation:{self._sim_attr(session, 'id')}:complete",
                metadata={
                    "simulation_type": self._sim_attr(session, "simulation_type"),
                    "mode": self._sim_attr(session, "mode"),
                    "resolution": self._sim_attr(session, "resolution"),
                    "average_overall": average,
                },
            )
            if awarded is not None:
                events["xp_events"].append(self._xp_event_payload(awarded))

            if objective_resolved:
                awarded = await self._award(
                    user_id,
                    "simulation_objective",
                    self._settings.xp_simulation_objective,
                    "simulation",
                    self._sim_attr(session, "id"),
                    f"simulation:{self._sim_attr(session, 'id')}:objective",
                    metadata={"simulation_type": self._sim_attr(session, "simulation_type")},
                )
                if awarded is not None:
                    events["xp_events"].append(self._xp_event_payload(awarded))

            if improved and average is not None:
                awarded = await self._award(
                    user_id,
                    "simulation_improvement",
                    self._settings.xp_simulation_improvement,
                    "simulation",
                    self._sim_attr(session, "id"),
                    f"simulation:{self._sim_attr(session, 'id')}:improved",
                    metadata={"average_overall": average},
                )
                if awarded is not None:
                    events["xp_events"].append(self._xp_event_payload(awarded))

            context = {
                "activity_type": "simulation",
                "session": session,
                "scores": {"overall": average or 0},
                "streak_current": streak_current,
            }
            events["milestones"] = [
                {"milestone_key": m.milestone_key, "title": m.title}
                for m in await self._check_milestones(user_id, context)
            ]

            if goal_completed:
                events["progress_summary"] = await self._generate_progress_summary(user_id, day)
            return events
        except Exception:
            logger.exception("simulation gamification hook failed (session is unaffected)")
            return {"enabled": True, "error": True}

    # -------------------------------------------------------------------- XP

    async def _award(
        self,
        user_id: str | None,
        event_type: str,
        amount: int,
        source_type: str,
        source_id: str,
        idempotency_key: str,
        *,
        metadata: dict[str, Any] | None = None,
    ) -> XPEvent | None:
        """Award XP through the immutable ledger (duplicate-safe)."""
        if amount <= 0 and event_type != "encouragement":
            return None
        existing = await self._xp.get_by_idempotency_key(user_id, idempotency_key)
        if existing is not None:
            return None
        try:
            return await self._xp.add(
                XPEvent(
                    user_id=user_id,
                    event_type=event_type,
                    amount=amount,
                    source_type=source_type,
                    source_id=source_id,
                    idempotency_key=idempotency_key,
                    event_metadata=metadata,
                )
            )
        except IntegrityError:
            await self._xp._session.rollback()
            return None

    def _xp_event_payload(self, event: XPEvent) -> dict[str, Any]:
        return {
            "id": event.id,
            "event_type": event.event_type,
            "amount": event.amount,
            "source_type": event.source_type,
            "source_id": event.source_id,
            "created_at": event.created_at,
            "metadata": event.event_metadata,
        }

    async def award_xp(
        self,
        user_id: str | None,
        event_type: str,
        amount: int,
        source_type: str,
        source_id: str,
        idempotency_key: str,
        *,
        metadata: dict[str, Any] | None = None,
    ) -> XPEvent | None:
        """Public duplicate-safe XP award (used by the curriculum engine)."""
        return await self._award(
            user_id,
            event_type,
            amount,
            source_type,
            source_id,
            idempotency_key,
            metadata=metadata,
        )

    # ----------------------------------------------------------------- streak

    async def _update_streak(self, user_id: str | None, day) -> UserStreak | None:
        profile = await self._profiles.get_or_create(user_id)
        preferences = profile.preferences or {}
        if not preferences.get("streak_enabled", True):
            return None
        streak = await self._streaks.get_for_user(user_id)
        if streak is None:
            streak = await self._streaks.add(
                UserStreak(user_id=user_id, current_streak=0, longest_streak=0)
            )
        if streak.last_active_date == day:
            return streak
        if streak.last_active_date == day - timedelta(days=1):
            streak.current_streak += 1
        else:
            streak.current_streak = 1
        streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        streak.last_active_date = day
        return await self._streaks.update(streak)

    def _streak_payload(self, streak: UserStreak | None) -> dict[str, Any]:
        return {
            "current_streak": streak.current_streak if streak else 0,
            "longest_streak": streak.longest_streak if streak else 0,
            "last_active_date": streak.last_active_date if streak else None,
        }

    # --------------------------------------------------------------- daily goal

    async def _update_goal(self, user_id: str | None, day, count: int) -> DailyGoal:
        goal = await self._goals.get_by_user_date(user_id, day)
        if goal is None:
            profile = await self._profiles.get_or_create(user_id)
            goal = await self._goals.add(
                DailyGoal(
                    user_id=user_id,
                    goal_date=day,
                    target=profile.daily_target,
                )
            )
        if count > 0 and not goal.completed:
            goal.completed_count += count
            if goal.completed_count >= goal.target:
                goal.completed_count = goal.target
                goal.completed = True
                goal.completed_at = now_utc()
                await self._goals.update(goal)
                await self._award(
                    user_id,
                    "daily_goal",
                    self._settings.xp_daily_goal,
                    "daily_goal",
                    str(day),
                    f"daily_goal:{day}:complete",
                    metadata={"target": goal.target, "completed_count": goal.completed_count},
                )
        return await self._goals.update(goal)

    def _goal_payload(self, goal: DailyGoal | None) -> dict[str, Any]:
        target = goal.target if goal else 0
        count = goal.completed_count if goal else 0
        return {
            "target": target,
            "completed_count": count,
            "completed": bool(goal and goal.completed),
            "progress_percent": int(count * 100 / target) if target else 0,
        }

    # -------------------------------------------------------------- milestones

    async def _check_milestones(
        self, user_id: str | None, context: dict[str, Any]
    ) -> list[Milestone]:
        created: list[Milestone] = []
        for key, definition in MILESTONE_DEFINITIONS.items():
            if not await self._milestone_reached(user_id, key, context):
                continue
            existing = await self._milestones.get_by_user_key(user_id, key)
            if existing is not None:
                continue
            milestone = await self._milestones.add(
                Milestone(
                    user_id=user_id,
                    milestone_key=key,
                    title=definition["title"],
                    description=definition["description"],
                )
            )
            await self._award(
                user_id,
                "milestone",
                self._settings.xp_milestone,
                "milestone",
                key,
                f"milestone:{key}",
                metadata={"milestone_key": key, "title": definition["title"]},
            )
            celebration = await self._celebrate_milestone(user_id, milestone, context)
            milestone.celebration = celebration
            await self._milestones.update(milestone)
            created.append(milestone)
        return created

    async def _milestone_reached(
        self, user_id: str | None, key: str, context: dict[str, Any]
    ) -> bool:
        activity_type = context.get("activity_type")
        if key.startswith("exercises_"):
            threshold = int(key.split("_")[1])
            return (await self._xp.count_by_type(user_id, "exercise_complete")) >= threshold
        if key.startswith("streak_"):
            threshold = int(key.split("_")[1])
            return context.get("streak_current", 0) >= threshold
        if key == "first_business_challenge":
            if activity_type != "challenge":
                return False
            exercise = context.get("exercise")
            return (
                exercise is not None
                and exercise.register.value == "business"
                and bool(context.get("scores", {}).get("overall", 0) >= 80)
            )
        if key == "first_paragraph":
            if activity_type != "exercise":
                return False
            exercise = context.get("exercise")
            return exercise is not None and exercise.target_length.value == "paragraph"
        if key == "naturalness_90":
            return int(context.get("scores", {}).get("naturalness", 0)) > 90
        if key == "first_n2":
            if activity_type != "exercise":
                return False
            exercise = context.get("exercise")
            return exercise is not None and exercise.jlpt_level.value in ("N2", "N1")
        return False

    # ------------------------------------------------------------------- AI

    async def _celebrate_milestone(
        self, user_id: str | None, milestone: Milestone, context: dict[str, Any]
    ) -> dict[str, Any]:
        """AI celebration with real metrics; deterministic fallback on failure."""
        provider, model = self._task()
        real_metrics: dict[str, Any] = {
            "milestone_key": milestone.milestone_key,
            "exercises_completed": await self._xp.count_by_type(user_id, "exercise_complete"),
            "current_streak": context.get("streak_current", 0),
            "current_level": level_info(
                await self._xp.total_xp(user_id), self._settings.xp_level_base
            )["current_level"],
        }
        message = (
            f"🎉 {milestone.title}! Đây là một cột mốc thật sự trong hành trình "
            "học tiếng Nhật của bạn. Hãy tiếp tục nhé!"
        )
        fallback = True
        try:
            result, _ = await self._ai.generate_structured(
                build_milestone_celebration_prompt(
                    {
                        "key": milestone.milestone_key,
                        "title": milestone.title,
                        "description": milestone.description,
                    },
                    real_metrics,
                ),
                MilestoneCelebrationResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_gamification_max_tokens,
            )
            message = result.message
            fallback = False
        except Exception as exc:
            logger.warning("milestone celebration failed error=%s (fallback)", exc)
        if not fallback:
            self._quality.validate("milestone_celebration", result, provider=provider, model=model)
        return {
            "message": message,
            "provider": provider or ("fallback" if fallback else "unknown"),
            "model": model or "deterministic",
            "prompt_version": milestone_celebration_prompt_version(),
            "ai_generated": not fallback,
        }

    async def _maybe_encourage(
        self,
        user_id: str | None,
        day,
        *,
        overall: int,
        previous_best: int | None,
        improvement: bool = False,
    ) -> str | None:
        """Rate-limited contextual encouragement (once per day)."""
        profile = await self._profiles.get_or_create(user_id)
        preferences = profile.preferences or {}
        if not preferences.get("encouragement_enabled", True):
            return None
        if not self._settings.ai_encouragement_enabled:
            return None
        key = f"encouragement:{day}"
        existing = await self._xp.get_by_idempotency_key(user_id, key)
        if existing is not None and existing.event_metadata:
            return existing.event_metadata.get("message")
        provider, model = self._task()
        model = self._settings.ai_encouragement_model or model
        evidence = {
            "overall_score": overall,
            "previous_best": previous_best,
            "improvement": improvement,
        }
        if improvement and previous_best is not None:
            message = (
                f"Bạn vừa cải thiện rõ điểm số bài viết: {previous_best} -> {overall}. "
                "Những lần viết lại như vậy chính là cách học hiệu quả nhất!"
            )
        else:
            message = f"Bạn vừa có một bài viết tốt (điểm tổng {overall}). Tiếp tục nhé!"
        fallback = True
        try:
            result, _ = await self._ai.generate_structured(
                build_encouragement_prompt(evidence),
                EncouragementResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_gamification_max_tokens,
            )
            message = result.message
            fallback = False
        except Exception as exc:
            logger.warning("encouragement generation failed error=%s (fallback)", exc)
        if not fallback:
            self._quality.validate("encouragement", result, provider=provider, model=model)
        await self._award(
            user_id,
            "encouragement",
            0,
            "encouragement",
            str(day),
            key,
            metadata={
                "message": message,
                "provider": provider or ("fallback" if fallback else "unknown"),
                "model": model or "deterministic",
                "prompt_version": encouragement_prompt_version(),
            },
        )
        return message

    async def _generate_progress_summary(self, user_id: str | None, day) -> dict[str, Any] | None:
        """Once-per-day AI summary over real evidence; deterministic fallback."""
        if not self._settings.ai_progress_summary_enabled:
            return None
        start = self._day_start_utc(day)
        stats = await self._attempts.daily_stats(user_id, start)
        discovered = await self._discoveries.count_since(start)
        stats["vocabulary_discovered"] = discovered
        stats["date"] = str(day)
        provider, model = self._task()
        model = self._settings.ai_progress_summary_model or model
        summary_text = self._deterministic_summary(stats)
        improved: list[str] = []
        needs_work: list[str] = []
        fallback = True
        try:
            result, _ = await self._ai.generate_structured(
                build_progress_summary_prompt(stats),
                ProgressSummaryResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_gamification_max_tokens,
            )
            summary_text = result.summary
            improved = list(result.improved)
            needs_work = list(result.needs_work)
            fallback = False
        except Exception as exc:
            logger.warning("progress summary failed error=%s (fallback)", exc)
        if not fallback:
            self._quality.validate("progress_summary", result, provider=provider, model=model)
        payload = {
            "summary": summary_text,
            "improved": improved,
            "needs_work": needs_work,
            "vocabulary_discovered": stats["vocabulary_discovered"],
            "attempts": stats["attempts"],
            "average_score": stats["average_score"],
            "provider": provider or ("fallback" if fallback else "unknown"),
            "model": model or "deterministic",
            "prompt_version": progress_summary_prompt_version(),
            "ai_generated": not fallback,
        }
        await self._persist_session_summary(user_id, payload)
        return payload

    def _deterministic_summary(self, stats: dict[str, Any]) -> str:
        attempts = stats.get("attempts", 0)
        average = stats.get("average_score")
        discovered = stats.get("vocabulary_discovered", 0)
        if attempts == 0:
            return "Hôm nay bạn chưa hoàn thành bài viết nào. Hãy dành vài phút luyện tập nhé!"
        base = f"Hôm nay bạn hoàn thành {attempts} bài"
        if average is not None:
            base += f" (điểm trung bình {average})"
        if discovered:
            base += f", khám phá {discovered} từ vựng mới"
        return base + ". Mỗi ngày một chút, tiến bộ sẽ rõ ràng!"

    async def _persist_session_summary(self, user_id: str | None, payload: dict[str, Any]) -> None:
        try:
            session = await self._sessions.get_active_by_user(user_id)
            if session is None:
                return
            summary = dict(session.summary or {})
            summary["progress_summary"] = payload
            session.summary = summary
            await self._sessions.update(session)
        except Exception:
            logger.exception("session summary persistence failed (skipped)")

    # ------------------------------------------------------------- read APIs

    async def summary(self, user_id: str | None) -> dict[str, Any]:
        """Level, XP, streaks and today's goal block."""
        total = await self._xp.total_xp(user_id)
        streak = await self._streaks.get_for_user(user_id)
        today = day_key(None, self._settings)
        goal = await self._goals.get_by_user_date(user_id, today)
        start = self._day_start_utc(today)
        today_xp = await self._xp.xp_since(user_id, start)
        return {
            "level": level_info(total, self._settings.xp_level_base),
            "current_streak": streak.current_streak if streak else 0,
            "longest_streak": streak.longest_streak if streak else 0,
            "last_active_date": streak.last_active_date if streak else None,
            "today_xp": today_xp,
            "daily_goal": self._goal_payload(goal),
        }

    def _day_start_utc(self, day) -> datetime:
        tz = app_timezone(self._settings)
        local_midnight = datetime(day.year, day.month, day.day, 0, 0, tzinfo=tz)
        return local_midnight.astimezone(timezone.utc)

    async def xp_history(
        self, user_id: str | None, *, skip: int = 0, limit: int = 50
    ) -> tuple[list[dict[str, Any]], int]:
        items, total = await self._xp.list_by_user(user_id, skip=skip, limit=limit)
        return [self._xp_event_payload(event) for event in items], total

    async def milestones(self, user_id: str | None) -> list[dict[str, Any]]:
        rows = await self._milestones.list_by_user(user_id)
        return [
            {
                "id": m.id,
                "milestone_key": m.milestone_key,
                "title": m.title,
                "description": m.description,
                "achieved_at": m.achieved_at,
                "celebration": m.celebration,
            }
            for m in rows
        ]

    async def today_payload(
        self,
        user_id: str | None,
        adaptive_payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Dashboard payload: summary + mission + focus + reminders."""
        summary = await self.summary(user_id)
        mission = await self._missions.get_or_generate(user_id)
        goal = summary["daily_goal"]
        reminders: list[str] = []
        if not goal["completed"]:
            remaining = goal["target"] - goal["completed_count"]
            if remaining > 0:
                reminders.append(f"Bạn còn {remaining} bài để hoàn thành mục tiêu hôm nay.")
        if summary["current_streak"] >= 7:
            reminders.append(
                f"Bạn đang giữ chuỗi luyện tập {summary['current_streak']} ngày. Tiếp tục nhé!"
            )
        if goal["completed_count"] == 0:
            reminders.append("Hôm nay bạn chưa luyện tập. Bắt đầu với một bài nhé!")
        if mission is not None and mission.register != "mixed" and goal["completed_count"] == 0:
            reminders.append(
                f"Hôm nay hãy thử luyện tiếng Nhật theo phong cách {mission.register}."
            )
        encouragement = await self._today_encouragement(user_id)
        session_summary = await self._today_session_summary(user_id)
        return {
            "summary": summary,
            "mission": self._mission_payload(mission) if mission else None,
            "focus": (adaptive_payload or {}).get("focus", {}),
            "recommendation": (adaptive_payload or {}).get("recommendation"),
            "session_summary": session_summary,
            "encouragement": encouragement,
            "reminders": reminders,
        }

    async def _today_encouragement(self, user_id: str | None) -> str | None:
        today = day_key(None, self._settings)
        event = await self._xp.get_by_idempotency_key(user_id, f"encouragement:{today}")
        if event is not None and event.event_metadata:
            return event.event_metadata.get("message")
        return None

    async def _today_session_summary(self, user_id: str | None) -> dict[str, Any] | None:
        session = await self._sessions.get_active_by_user(user_id)
        if session is None or not session.summary:
            return None
        return dict(session.summary)

    def _mission_payload(self, mission: DailyMission) -> dict[str, Any]:
        return {
            "id": mission.id,
            "mission_type": mission.mission_type,
            "title": mission.title,
            "description": mission.description,
            "target_count": mission.target_count,
            "completed_count": mission.completed_count,
            "completed": mission.completed_at is not None,
            "focus_skills": mission.focus_skills,
            "topic": mission.topic,
            "register": mission.register,
            "difficulty": mission.difficulty,
            "reason": mission.reason,
            "status": mission.status,
            "provider": mission.provider,
            "model": mission.model,
            "prompt_version": mission.prompt_version,
            "created_at": mission.created_at,
        }
