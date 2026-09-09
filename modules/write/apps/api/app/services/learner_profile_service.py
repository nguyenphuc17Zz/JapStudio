"""Learner profile service (Phase 6): incremental state + AI synthesis.

The profile is the learner-facing, persistent summary of the deterministic
evidence computed by LearnerEvidenceService. AI synthesis (stage 1) only
reframes that evidence (strengths/weaknesses framing, JLPT band); the code
always overrides the numbers it can compute itself.
"""

import logging
from typing import Any

from app.core.config import Settings, get_settings
from app.models import LearnerProfile
from app.prompts.learner_profile_synthesis import (
    build_learner_profile_synthesis_prompt,
    learner_profile_synthesis_prompt_version,
)
from app.quality.service import create_quality_service
from app.repositories import LearnerProfileRepository
from app.schemas.learning_ai import LearnerProfileSynthesisResult
from app.services.ai_service import AIService
from app.services.learner_evidence import (
    JLPT_ORDER,
    LearnerEvidenceService,
)

logger = logging.getLogger("app.learning")

GOAL_TYPES = {
    "general",
    "daily_conversation",
    "business",
    "it",
    "brse",
    "jlpt",
    "natural_japanese",
    "writing_fluency",
}


class LearnerProfileService:
    """Owns profile creation, incremental updates and AI synthesis."""

    def __init__(
        self,
        repository: LearnerProfileRepository,
        evidence_service: LearnerEvidenceService,
        ai_service: AIService,
        settings: Settings | None = None,
    ) -> None:
        self._repository = repository
        self._evidence = evidence_service
        self._ai = ai_service
        self._settings = settings or get_settings()
        self._quality = create_quality_service(settings=self._settings)

    def _task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_learning_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_default_provider
            or None
        )
        model = self._settings.ai_learning_profile_model or self._settings.ai_learning_model or None
        return provider, model

    # -- persistence ---------------------------------------------------------

    async def get_or_create(self, user_id: str | None) -> LearnerProfile:
        profile = await self._repository.get_for_user(user_id)
        if profile is not None:
            return profile
        return await self._repository.add(
            LearnerProfile(
                user_id=user_id,
                native_language="vi",
                daily_target=3,
                profile_version="learner_profile:v1",
                adaptive_state={},
            )
        )

    async def update_preferences(
        self, user_id: str | None, updates: dict[str, Any]
    ) -> LearnerProfile:
        """Apply user-editable fields (goal, target JLPT, daily target, registers, topics)."""
        profile = await self.get_or_create(user_id)
        if "goal" in updates:
            profile.goal = updates["goal"]
        if "goal_type" in updates:
            value = updates["goal_type"]
            profile.goal_type = value if value and value in GOAL_TYPES else None
        if "target_jlpt" in updates:
            value = updates["target_jlpt"]
            profile.target_jlpt = value if value and value in JLPT_ORDER else None
        if "daily_target" in updates and updates["daily_target"] is not None:
            profile.daily_target = max(1, min(int(updates["daily_target"]), 20))
        if "preferred_registers" in updates:
            profile.preferred_registers = updates["preferred_registers"] or None
        if "preferred_topics" in updates:
            profile.preferred_topics = updates["preferred_topics"] or None
        if "streak_enabled" in updates and updates["streak_enabled"] is not None:
            preferences = dict(profile.preferences or {})
            preferences["streak_enabled"] = bool(updates["streak_enabled"])
            profile.preferences = preferences
        if "memory_enabled" in updates and updates["memory_enabled"] is not None:
            preferences = dict(profile.preferences or {})
            preferences["memory_enabled"] = bool(updates["memory_enabled"])
            profile.preferences = preferences
        return await self._repository.update(profile)

    async def record_evaluation(self, user_id: str | None) -> None:
        """Increment evidence counter; auto-synthesize when the interval is due.

        Never raises: learner intelligence must not break the writing flow.
        """
        profile = await self.get_or_create(user_id)
        profile.evaluations_since_synthesis += 1
        await self._repository.update(profile)
        if (
            self._settings.ai_learning_auto_update_enabled
            and profile.evaluations_since_synthesis
            >= self._settings.ai_learning_profile_refresh_interval
        ):
            try:
                await self.synthesize(user_id)
            except Exception:
                logger.exception(
                    "learner profile auto-synthesis failed user_id=%s (deferred)", user_id
                )

    # -- synthesis -----------------------------------------------------------

    async def synthesize(self, user_id: str | None) -> dict[str, Any]:
        """Run stage 1: AI framing over deterministic evidence, then persist."""
        profile = await self.get_or_create(user_id)
        evidence = await self._evidence.compute_summary(user_id)
        provider, model = self._task()

        ai_framing: LearnerProfileSynthesisResult | None = None
        try:
            ai_framing, _ = await self._ai.generate_structured(
                build_learner_profile_synthesis_prompt(evidence),
                LearnerProfileSynthesisResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_learning_max_tokens,
            )
        except Exception as exc:
            logger.warning("learner profile synthesis failed error=%s", exc)

        if ai_framing is not None:
            self._quality.validate(
                "learner_profile_synthesis",
                ai_framing,
                provider=provider,
                model=model,
            )

        adaptive_state = self._merge(evidence, ai_framing)
        profile.adaptive_state = adaptive_state
        profile.evaluations_since_synthesis = 0
        profile.profile_version = "learner_profile:v1"
        await self._repository.update(profile)
        return adaptive_state

    def _merge(
        self, evidence: dict[str, Any], ai_framing: LearnerProfileSynthesisResult | None
    ) -> dict[str, Any]:
        """Deterministic evidence is authoritative; AI only frames it.

        AI strengths/weaknesses framing is accepted only when there is enough
        real evidence (>= 3 attempts) for the AI to summarize; the computed
        numbers (skills, JLPT band, trends) are never overridden.
        """
        skills = evidence["skills"]
        strengths = [s for s in evidence["strengths"]]
        weaknesses = [s for s in evidence["weaknesses"]]
        if ai_framing is not None and evidence["evidence_count"] >= 3:
            if not strengths and ai_framing.strengths:
                strengths = list(ai_framing.strengths)
            if not weaknesses and ai_framing.weaknesses:
                weaknesses = list(ai_framing.weaknesses)
        return {
            "skills": skills,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "estimated_jlpt": dict(evidence["estimated_jlpt"]),
            "recent_trends": dict(evidence["recent_trends"]),
            "registers": evidence.get("registers", {}),
            "topics": evidence.get("topics", []),
            "recent_topics": evidence.get("recent_topics", []),
            "average_difficulty": evidence.get("average_difficulty", 3),
            "evidence_count": evidence["evidence_count"],
            "computed_at": evidence["computed_at"],
            "metadata": {
                "provider": self._task()[0] or "unknown",
                "model": self._task()[1] or "unknown",
                "prompt_version": learner_profile_synthesis_prompt_version(),
                "ai_framed": ai_framing is not None,
            },
        }

    # -- helpers -------------------------------------------------------------

    async def profile_summary(self, user_id: str | None) -> dict[str, Any]:
        """The profile block shared by the planner and explanation prompts."""
        profile = await self.get_or_create(user_id)
        state = profile.adaptive_state or {}
        if not state:
            state = await self.synthesize(user_id)
        return {
            "goal": profile.goal,
            "target_jlpt": profile.target_jlpt,
            "daily_target": profile.daily_target,
            "preferred_registers": profile.preferred_registers,
            "preferred_topics": profile.preferred_topics,
            "skills": state.get("skills", {}),
            "strengths": state.get("strengths", []),
            "weaknesses": state.get("weaknesses", []),
            "estimated_jlpt": state.get("estimated_jlpt", {}),
            "recent_trends": state.get("recent_trends", {}),
            "recent_topics": state.get("recent_topics", []),
            "registers": state.get("registers", {}),
            "average_difficulty": state.get("average_difficulty", 3),
            "evidence_count": state.get("evidence_count", 0),
            "profile_version": profile.profile_version,
        }

    @staticmethod
    def skill_descriptions() -> dict[str, str]:
        return {
            "grammar": "Ngữ pháp",
            "vocabulary": "Từ vựng",
            "naturalness": "Tự nhiên",
            "semantic": "Đúng nghĩa",
            "context_fit": "Hợp ngữ cảnh",
            "register_fit": "Đúng phong cách",
            "coherence": "Mạch lạc (đoạn văn)",
            "cohesion": "Liên kết câu",
            "organization": "Cấu trúc bài viết",
            "flow": "Nhịp đọc",
            "style_consistency": "Nhất quán phong cách",
        }
