"""Daily mission service (Phase 7).

One active mission per learner per day; regeneration archives the old one and
creates a replacement (never double-counting). Generation uses the Phase 6
learner state; the AI proposes and code validates/clamps.
"""

import logging
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, get_settings
from app.models import DailyMission
from app.prompts.daily_mission_generation import (
    build_daily_mission_prompt,
    daily_mission_prompt_version,
)
from app.quality.service import create_quality_service
from app.repositories import DailyMissionRepository
from app.schemas.gamification_ai import DailyMissionResult
from app.services.ai_service import AIService
from app.services.learner_profile_service import LearnerProfileService
from app.services.timezone_service import day_key, now_utc

logger = logging.getLogger("app.gamification")

VALID_REGISTERS = {"casual", "polite", "business", "mixed"}
VALID_MISSION_TYPES = {"practice", "weakness_focus", "register_focus", "challenge_mix"}
VALID_SKILLS = {
    "grammar",
    "vocabulary",
    "naturalness",
    "semantic",
    "context_fit",
    "register_fit",
}

SKILL_LABELS = {
    "grammar": "ngữ pháp",
    "vocabulary": "từ vựng",
    "naturalness": "độ tự nhiên",
    "semantic": "độ đúng nghĩa",
    "context_fit": "sự phù hợp ngữ cảnh",
    "register_fit": "đúng phong cách",
}


class MissionService:
    """Owns mission generation, persistence and progress counting."""

    def __init__(
        self,
        mission_repository: DailyMissionRepository,
        profile_service: LearnerProfileService,
        ai_service: AIService,
        settings: Settings | None = None,
    ) -> None:
        self._missions = mission_repository
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
        model = settings.ai_daily_mission_model or settings.ai_gamification_model or None
        return provider, model

    # -- read -----------------------------------------------------------------

    async def get_or_generate(
        self, user_id: str | None, now=None, objective_id: str | None = None
    ) -> DailyMission | None:
        """Today's mission; generates once per day (a completed mission stays)."""
        if not self._settings.ai_daily_mission_enabled:
            return None
        day = day_key(now, self._settings)
        existing = await self._missions.get_today_mission(user_id, day)
        if existing is not None:
            return existing
        return await self._generate(user_id, day, objective_id)

    async def regenerate(
        self, user_id: str | None, now=None, objective_id: str | None = None
    ) -> DailyMission | None:
        """Archive today's active mission and create a replacement."""
        if not self._settings.ai_daily_mission_enabled:
            return None
        day = day_key(now, self._settings)
        active = await self._missions.get_active_by_user_date(user_id, day)
        if active is not None and active.status != "archived":
            active.status = "archived"
            active.archived_at = now_utc()
            await self._missions.update(active)
        return await self._generate(user_id, day, objective_id)

    # -- progress --------------------------------------------------------------

    async def record_progress(
        self, user_id: str | None, day, count: int = 1
    ) -> tuple[DailyMission | None, bool]:
        """Increment today's active mission progress; returns (mission, completed_now)."""
        mission = await self._missions.get_active_by_user_date(user_id, day)
        if mission is None or mission.status != "active":
            return mission, False
        if mission.completed_at is not None:
            return mission, False
        mission.completed_count += count
        completed_now = False
        if mission.completed_count >= mission.target_count:
            mission.completed_count = mission.target_count
            mission.status = "completed"
            mission.completed_at = now_utc()
            completed_now = True
        await self._missions.update(mission)
        return mission, completed_now

    # -- generation ------------------------------------------------------------

    async def _generate(
        self, user_id: str | None, day, objective_id: str | None = None
    ) -> DailyMission:
        summary = await self._profiles.profile_summary(user_id)
        recent = await self._missions.list_recent_by_user(user_id, limit=5)
        recent_titles = [m.title for m in recent]
        provider, model = self._task()
        result: DailyMissionResult | None = None
        if self._settings.ai_daily_mission_enabled:
            try:
                result, _ = await self._ai.generate_structured(
                    build_daily_mission_prompt(summary, recent_titles),
                    DailyMissionResult,
                    provider=provider,
                    model=model,
                    max_tokens=self._settings.ai_gamification_max_tokens,
                )
            except Exception as exc:
                logger.warning("daily mission generation failed error=%s (fallback)", exc)
        if result is not None:
            self._quality.validate("daily_mission", result, provider=provider, model=model)
        mission = self._validate(summary, result)
        mission["user_id"] = user_id
        mission["mission_date"] = day
        mission["objective_id"] = objective_id
        mission["provider"] = provider or "unknown"
        mission["model"] = model or "unknown"
        mission["prompt_version"] = daily_mission_prompt_version()
        if result is None:
            mission["provider"] = "fallback"
            mission["model"] = "deterministic"
        try:
            return await self._missions.add(DailyMission(**mission))
        except IntegrityError:
            await self._missions.session.rollback()
            existing = await self._missions.get_today_mission(user_id, day)
            if existing is not None:
                logger.info("mission race resolved id=%s (already exists for day)", existing.id)
                return existing
            raise

    def _validate(self, summary: dict[str, Any], result: DailyMissionResult | None) -> dict:
        """Deterministic validation/clamping over the AI proposal."""
        target = max(1, min(int(summary.get("daily_target") or 3), 20))
        weaknesses = summary.get("weaknesses") or []
        weakness = next((w for w in weaknesses if isinstance(w, str)), "grammar")
        preferred_registers = summary.get("preferred_registers") or []
        register = next((r for r in preferred_registers if r in VALID_REGISTERS), "mixed")
        difficulty = max(1, min(int(summary.get("average_difficulty") or 4), 10))
        if result is None:
            label = SKILL_LABELS.get(weakness, weakness)
            return {
                "mission_type": "weakness_focus",
                "title": f"Luyện tập: {label}",
                "description": (
                    f"Hôm nay hãy hoàn thành {target} bài viết tập trung cải thiện "
                    f"{label}. Bắt đầu từ một bài do AI gợi ý nhé!"
                ),
                "target_count": target,
                "focus_skills": [weakness if weakness in VALID_SKILLS else "grammar"],
                "topic": "Kể về công việc và cuộc sống hằng ngày",
                "register": register,
                "difficulty": difficulty,
                "reason": (
                    f"Điểm yếu gần nhất của bạn là {label}; luyện tập hôm nay sẽ "
                    "giúp củng cố nền tảng trước khi chuyển sang kỹ năng khác."
                ),
            }
        mission_type = (
            result.mission_type if result.mission_type in VALID_MISSION_TYPES else "practice"
        )
        skills = [s for s in result.focus_skills if s in VALID_SKILLS][:3] or ["grammar"]
        validated_register = result.register if result.register in VALID_REGISTERS else register
        return {
            "mission_type": mission_type,
            "title": result.title[:100],
            "description": result.description[:1000],
            "target_count": max(1, min(result.target_count, target)),
            "focus_skills": skills,
            "topic": result.topic[:100],
            "register": validated_register,
            "difficulty": max(1, min(result.difficulty, 10)),
            "reason": result.reason[:1000],
        }
