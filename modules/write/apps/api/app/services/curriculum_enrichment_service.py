"""Curriculum Enrichment Service (Phase 22).

Optional AI layer that enriches deterministic plan output with personalized
writing task descriptions, learner-friendly priority explanations, and
post-session debriefs.

Design rules:
  - ALL enrichment methods are async and wrapped in try/except.
  - If AI fails for any reason, the deterministic output is returned unchanged.
  - Scoring, ranking and task structure are NEVER modified here.
  - Every call is logged so failures can be monitored in production.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import Settings, get_settings
from app.prompts.curriculum_enrichment import (
    build_priority_reason_prompt,
    build_session_debrief_prompt,
    build_task_enrichment_prompt,
)
from app.schemas.adaptive_curriculum import DailyPlan, PlanTask, RankedWeakness
from app.services.ai_service import AIService

logger = logging.getLogger("app.curriculum_enrichment")


class CurriculumEnrichmentService:
    """AI enrichment layer for adaptive curriculum outputs.

    All methods accept a *copy* of deterministic objects and return enriched
    copies — they never mutate their inputs in place.
    """

    def __init__(
        self,
        ai_service: AIService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._ai = ai_service or AIService(settings=self._settings)

    # -- provider wiring -------------------------------------------------------

    def _provider_model(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_learning_provider
            or self._settings.ai_exercise_generation_provider
            or self._settings.ai_default_provider
            or None
        )
        model = self._settings.ai_learning_model or None
        return provider, model

    # -------------------------------------------------------------------------
    # 1. Task description enrichment
    # -------------------------------------------------------------------------

    async def enrich_task_descriptions(
        self,
        plan: DailyPlan,
        profile_summary: dict[str, Any],
    ) -> DailyPlan:
        """Return a copy of the plan with AI-generated task_description + reason.

        Falls back to the original plan if AI fails.
        """
        if not plan.tasks:
            return plan
        try:
            tasks_payload = [t.model_dump() for t in plan.tasks]
            prompt = build_task_enrichment_prompt(tasks_payload, profile_summary)
            provider, model = self._provider_model()
            result = await self._ai.generate_text(
                prompt,
                provider=provider,
                model=model,
                max_tokens=1024,
            )
            enriched_tasks = self._parse_task_enrichment(result.text, plan.tasks)
            return plan.model_copy(
                update={"tasks": enriched_tasks, "enriched": True}
            )
        except Exception as exc:
            logger.warning(
                "curriculum task enrichment failed (fallback to template) error=%s",
                type(exc).__name__,
            )
            return plan

    def _parse_task_enrichment(
        self, raw: str, original_tasks: list[PlanTask]
    ) -> list[PlanTask]:
        """Parse AI JSON response and apply to original tasks."""
        data = _extract_json_array(raw)
        by_id: dict[str, dict[str, str]] = {}
        for item in data:
            tid = str(item.get("task_id", ""))
            if tid:
                by_id[tid] = item

        result: list[PlanTask] = []
        for task in original_tasks:
            enrichment = by_id.get(task.task_id, {})
            description = str(enrichment.get("task_description") or "").strip()
            reason = str(enrichment.get("reason") or "").strip()
            if description and reason:
                result.append(
                    task.model_copy(
                        update={
                            "task_description": description,
                            "reason": reason,
                        }
                    )
                )
            else:
                result.append(task)
        return result

    # -------------------------------------------------------------------------
    # 2. Priority reason enrichment
    # -------------------------------------------------------------------------

    async def enrich_priority_reasons(
        self,
        ranked: list[RankedWeakness],
        profile_summary: dict[str, Any],
    ) -> list[RankedWeakness]:
        """Return a copy of ranked list with AI-rewritten priority_reason.

        Falls back to the original list if AI fails.
        """
        if not ranked:
            return ranked
        try:
            ranked_payload = [r.model_dump() for r in ranked]
            prompt = build_priority_reason_prompt(ranked_payload, profile_summary)
            provider, model = self._provider_model()
            result = await self._ai.generate_text(
                prompt,
                provider=provider,
                model=model,
                max_tokens=512,
            )
            return self._parse_reason_enrichment(result.text, ranked)
        except Exception as exc:
            logger.warning(
                "curriculum priority reason enrichment failed (fallback) error=%s",
                type(exc).__name__,
            )
            return ranked

    def _parse_reason_enrichment(
        self, raw: str, original: list[RankedWeakness]
    ) -> list[RankedWeakness]:
        data = _extract_json_array(raw)
        by_id: dict[str, str] = {}
        for item in data:
            wid = str(item.get("weakness_id", ""))
            reason = str(item.get("priority_reason") or "").strip()
            if wid and reason:
                by_id[wid] = reason

        result: list[RankedWeakness] = []
        for ranked_w in original:
            reason = by_id.get(ranked_w.weakness_id, "")
            if reason:
                result.append(ranked_w.model_copy(update={"priority_reason": reason}))
            else:
                result.append(ranked_w)
        return result

    # -------------------------------------------------------------------------
    # 3. Session debrief
    # -------------------------------------------------------------------------

    async def generate_session_debrief(
        self,
        completed_tasks: list[PlanTask],
        profile_summary: dict[str, Any],
    ) -> str | None:
        """Generate a short post-session summary.

        Returns None if AI is unavailable or fails.
        """
        if not completed_tasks:
            return None
        try:
            tasks_payload = [t.model_dump() for t in completed_tasks]
            prompt = build_session_debrief_prompt(tasks_payload, profile_summary)
            provider, model = self._provider_model()
            result = await self._ai.generate_text(
                prompt,
                provider=provider,
                model=model,
                max_tokens=256,
            )
            data = _extract_json_object(result.text)
            debrief = str(data.get("debrief") or "").strip()
            return debrief if debrief else None
        except Exception as exc:
            logger.warning(
                "curriculum session debrief generation failed error=%s",
                type(exc).__name__,
            )
            return None


# ---------------------------------------------------------------------------
# JSON parsing helpers
# ---------------------------------------------------------------------------


def _extract_json_array(text: str) -> list[dict]:
    """Extract the first JSON array from AI text output."""
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    start = text.find("[")
    end = text.rfind("]") + 1
    if start == -1 or end <= start:
        return []
    try:
        data = json.loads(text[start:end])
        return [item for item in data if isinstance(item, dict)]
    except json.JSONDecodeError:
        return []


def _extract_json_object(text: str) -> dict:
    """Extract the first JSON object from AI text output."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= start:
        return {}
    try:
        data = json.loads(text[start:end])
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}
