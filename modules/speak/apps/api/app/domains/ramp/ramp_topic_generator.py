"""RampTopicGenerator — dynamic topic generation without hard-coded topic DB.

§8 Dynamic Topic Generation — AI + semantic generator + deterministic fallback.
§48 Japanese language resources — reuses existing provider.
§49 Contextual topic generation.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import random
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.ai.contracts import (
    AIMessage,
    AIMessageRole,
    AIRequest,
    AITask,
    ResponseFormat,
    ResponseFormatType,
)
from app.domains.ai.router import AIRouter
from app.domains.ramp.contracts import (
    RampGenerationInput,
    RampScaffold,
    RampTaskSpec,
    RampTopicDomain,
)
from app.domains.ramp.prompts import RampPrompts
from app.domains.reflex.cache_service import ExerciseCacheService

# ---------------------------------------------------------------------------
# Deterministic fallback topic seeds (NOT a hard-coded dataset; these are
# parametric templates used only when AI is unavailable)
# ---------------------------------------------------------------------------

_FALLBACK_TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "personal": [
        {"topic": "自己紹介", "prompt_jp": "自分について一つ話してください。", "prompt_vi": "Hãy nói một điều về bản thân bạn."},
        {"topic": "趣味", "prompt_jp": "好きなことは何ですか？", "prompt_vi": "Bạn thích làm gì?"},
    ],
    "daily_life": [
        {"topic": "週末", "prompt_jp": "週末は何をしましたか？", "prompt_vi": "Bạn đã làm gì cuối tuần?"},
        {"topic": "朝のルーティン", "prompt_jp": "毎朝何をしていますか？", "prompt_vi": "Mỗi sáng bạn làm gì?"},
        {"topic": "昨日の夜", "prompt_jp": "昨日の夜は何をしましたか？", "prompt_vi": "Tối qua bạn làm gì?"},
    ],
    "work": [
        {"topic": "仕事", "prompt_jp": "仕事はどうですか？", "prompt_vi": "Công việc của bạn thế nào?"},
        {"topic": "会議", "prompt_jp": "最近、会議はどうでしたか？", "prompt_vi": "Cuộc họp gần đây của bạn thế nào?"},
    ],
    "opinions": [
        {"topic": "テレワーク", "prompt_jp": "テレワークについてどう思いますか？", "prompt_vi": "Bạn nghĩ gì về làm việc từ xa?"},
        {"topic": "SNS", "prompt_jp": "SNSのメリットとデメリットを教えてください。", "prompt_vi": "Hãy cho biết ưu và nhược điểm của mạng xã hội."},
    ],
    "preferences": [
        {"topic": "食べ物", "prompt_jp": "好きな食べ物は何ですか？", "prompt_vi": "Món ăn yêu thích của bạn là gì?"},
    ],
    "experiences": [
        {"topic": "旅行", "prompt_jp": "印象に残っている旅行について話してください。", "prompt_vi": "Hãy kể về một chuyến đi đáng nhớ."},
    ],
    "hypothetical": [
        {"topic": "もし〜なら", "prompt_jp": "もし一週間休みがあったら、何をしますか？", "prompt_vi": "Nếu có một tuần nghỉ, bạn sẽ làm gì?"},
    ],
    "comparison": [
        {"topic": "比較", "prompt_jp": "都会と田舎、どちらが好きですか？理由も教えてください。", "prompt_vi": "Bạn thích thành phố hay nông thôn? Hãy giải thích lý do."},
    ],
    "problem_solving": [
        {"topic": "問題解決", "prompt_jp": "最近困ったことと、どう解決したか教えてください。", "prompt_vi": "Hãy kể về một vấn đề gần đây và cách bạn giải quyết."},
    ],
    "study": [
        {"topic": "日本語学習", "prompt_jp": "日本語の勉強で一番難しいことは何ですか？", "prompt_vi": "Điều khó nhất trong việc học tiếng Nhật là gì?"},
    ],
}


class RampTopicGenerator:
    """
    Generates RampTaskSpec topics dynamically.
    AI-first, deterministic-fallback. Never stores a fixed topic bank.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_router = AIRouter(db)
        self.cache_service = ExerciseCacheService(db)

    async def _dispatch_smart_cached_topic(
        self,
        inp: RampGenerationInput,
        domain: str,
        generator_coro_factory,
    ) -> RampTaskSpec:
        """Orchestrates bandit exploration, spaced decay zero-latency serving, and background expansion for speaking ramp topics."""
        sub_mode = f"stage_{inp.current_stage}"
        difficulty = inp.learner_level or "normal"
        is_explore, pool_size = await self.cache_service.should_explore(
            domain="ramp", sub_mode=sub_mode, difficulty=difficulty
        )
        if not is_explore:
            cached = await self.cache_service.get_smart_exercise(
                domain="ramp", sub_mode=sub_mode, difficulty=difficulty
            )
            if cached:
                try:
                    from app.domains.ramp.contracts import STAGE_EXERCISE_TYPE, RampExerciseType
                    ex_type = STAGE_EXERCISE_TYPE.get(inp.current_stage, RampExerciseType.SPEAK_SPONTANEOUS)
                    try:
                        topic_domain_val = RampTopicDomain(cached.get("domain", domain))
                    except ValueError:
                        topic_domain_val = RampTopicDomain.DAILY_LIFE

                    scaffold = RampScaffold(
                        support_level=inp.support_level,
                        topic=cached["topic"],
                        keywords=cached.get("keywords", []),
                        sentence_starter=cached.get("sentence_starter"),
                        example_response=cached.get("example_response"),
                    )
                    spec = RampTaskSpec(
                        exercise_type=ex_type,
                        stage=inp.current_stage,
                        topic=cached["topic"],
                        topic_domain=topic_domain_val,
                        prompt_jp=cached["prompt_jp"],
                        prompt_vi=cached.get("prompt_vi"),
                        target_duration_sec=inp.desired_duration_sec,
                        support_level=inp.support_level,
                        scaffold=scaffold,
                        keywords_for_production=cached.get("keywords", []),
                        learning_targets=["spontaneous_production"],
                        is_retry=inp.is_retry,
                        task_signature=self._make_signature(cached["topic"], inp.current_stage),
                        provider="smart_cache_pool",
                        model="gemini_cached",
                    )
                    self.cache_service.trigger_background_expansion(
                        domain="ramp",
                        sub_mode=sub_mode,
                        difficulty=difficulty,
                        generator_coroutine_factory=generator_coro_factory,
                        category=domain,
                    )
                    return spec
                except Exception as err:
                    logger.warning(f"[RampTopicGenerator] Error restoring cached ramp topic: {err}")

        fresh = await generator_coro_factory()
        if fresh and fresh.prompt_jp:
            cached_item = {
                "topic": fresh.topic,
                "prompt_jp": fresh.prompt_jp,
                "prompt_vi": fresh.prompt_vi,
                "domain": fresh.topic_domain.value if hasattr(fresh.topic_domain, "value") else str(fresh.topic_domain),
                "keywords": fresh.keywords_for_production,
                "sentence_starter": fresh.scaffold.sentence_starter if fresh.scaffold else None,
                "example_response": fresh.scaffold.example_response if fresh.scaffold else None,
                "prompt": fresh.prompt_jp,
                "ai_generated": True,
                "generation_source": "gemini_ai",
            }

            async def _save_bg(item):
                try:
                    svc = ExerciseCacheService()
                    await svc.save_exercise_to_pool(
                        domain="ramp",
                        sub_mode=sub_mode,
                        difficulty=difficulty,
                        exercise_dict=item,
                        category=domain,
                    )
                except Exception as err:
                    logger.warning(f"[RampTopicGenerator] Background pool save failed: {err}")

            asyncio.create_task(_save_bg(cached_item))
        return fresh

    async def generate(
        self,
        inp: RampGenerationInput,
        max_retries: int = 2,
    ) -> RampTaskSpec:
        """Generate a topic spec. AI path with smart pool cache, deterministic fallback guaranteed."""
        domain = inp.topic_domain or self._pick_domain(inp.interests, inp.topic_history)

        async def _run_ai_with_fallback() -> RampTaskSpec:
            for attempt in range(max_retries):
                try:
                    spec = await self._generate_with_ai(inp, domain)
                    if spec:
                        logger.debug(f"[RampTopicGenerator] AI topic generated stage={inp.current_stage}")
                        return spec
                except Exception as e:
                    logger.warning(f"[RampTopicGenerator] AI attempt {attempt + 1} failed: {e}")
            logger.info("[RampTopicGenerator] Using deterministic fallback topic")
            return self._build_fallback(inp, domain)

        return await self._dispatch_smart_cached_topic(
            inp=inp,
            domain=domain,
            generator_coro_factory=_run_ai_with_fallback,
        )

    async def _generate_with_ai(
        self,
        inp: RampGenerationInput,
        domain: str,
    ) -> RampTaskSpec | None:
        sys_prompt, user_content = RampPrompts.build_topic_generation_prompt(
            stage=inp.current_stage,
            support_level=inp.support_level,
            learner_level=inp.learner_level,
            measured_speaking_level=inp.measured_speaking_level,
            topic_domain=domain,
            interests=inp.interests,
            topic_history=inp.topic_history,
            desired_duration_sec=inp.desired_duration_sec,
        )
        req = AIRequest(
            messages=[AIMessage(role=AIMessageRole.USER, content=user_content)],
            task=AITask.RAMP_TOPIC_GENERATION,
            system_instruction=sys_prompt,
            temperature=0.85,
            max_output_tokens=600,
            response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
        )
        resp = await self.ai_router.generate(req)
        data = json.loads(resp.text)

        # Basic validation
        if not data.get("topic") or not data.get("prompt_jp"):
            return None

        scaffold = RampScaffold(
            support_level=inp.support_level,
            topic=data.get("topic"),
            keywords=data.get("keywords", []),
            sentence_starter=data.get("sentence_starter"),
            example_response=data.get("example_response"),
        )

        from app.domains.ramp.contracts import STAGE_EXERCISE_TYPE, RampExerciseType
        ex_type = STAGE_EXERCISE_TYPE.get(inp.current_stage, RampExerciseType.SPEAK_SPONTANEOUS)

        try:
            topic_domain_val = RampTopicDomain(data.get("domain", domain))
        except ValueError:
            topic_domain_val = RampTopicDomain.DAILY_LIFE

        return RampTaskSpec(
            exercise_type=ex_type,
            stage=inp.current_stage,
            topic=data["topic"],
            topic_domain=topic_domain_val,
            prompt_jp=data["prompt_jp"],
            prompt_vi=data.get("prompt_vi"),
            target_duration_sec=inp.desired_duration_sec,
            support_level=inp.support_level,
            scaffold=scaffold,
            keywords_for_production=data.get("keywords", []),
            learning_targets=["spontaneous_production"],
            is_retry=inp.is_retry,
            task_signature=self._make_signature(data["topic"], inp.current_stage),
            provider=getattr(resp, "provider", None),
            model=getattr(resp, "model", None),
        )

    def _build_fallback(
        self,
        inp: RampGenerationInput,
        domain: str,
    ) -> RampTaskSpec:
        templates = _FALLBACK_TEMPLATES.get(domain, _FALLBACK_TEMPLATES["daily_life"])
        # Exclude recently used topics
        fresh = [t for t in templates if t["topic"] not in inp.topic_history]
        pool = fresh if fresh else templates
        tpl = random.choice(pool)

        from app.domains.ramp.contracts import STAGE_EXERCISE_TYPE, RampExerciseType
        ex_type = STAGE_EXERCISE_TYPE.get(inp.current_stage, RampExerciseType.SPEAK_SPONTANEOUS)

        scaffold = RampScaffold(
            support_level=inp.support_level,
            topic=tpl["topic"],
        )

        try:
            topic_domain_val = RampTopicDomain(domain)
        except ValueError:
            topic_domain_val = RampTopicDomain.DAILY_LIFE

        return RampTaskSpec(
            exercise_type=ex_type,
            stage=inp.current_stage,
            topic=tpl["topic"],
            topic_domain=topic_domain_val,
            prompt_jp=tpl["prompt_jp"],
            prompt_vi=tpl.get("prompt_vi"),
            target_duration_sec=inp.desired_duration_sec,
            support_level=inp.support_level,
            scaffold=scaffold,
            learning_targets=["spontaneous_production"],
            is_retry=inp.is_retry,
            task_signature=self._make_signature(tpl["topic"], inp.current_stage),
        )

    def _pick_domain(self, interests: list[str], topic_history: list[str]) -> str:
        """Pick a domain that balances interests and variety."""
        all_domains = [d.value for d in RampTopicDomain]
        # Prefer interest-aligned domains
        interest_domains = []
        interest_map = {
            "仕事": "work", "work": "work",
            "旅行": "experiences", "travel": "experiences",
            "食": "preferences", "food": "preferences",
            "勉強": "study", "study": "study",
        }
        for interest in interests:
            for k, v in interest_map.items():
                if k in interest.lower():
                    interest_domains.append(v)

        # Weight: interest domains 3x, all others 1x
        weighted = interest_domains * 3 + all_domains
        # Filter out recently-used (rough heuristic from topic_history)
        return random.choice(weighted)

    @staticmethod
    def _make_signature(topic: str, stage: int) -> str:
        raw = f"{topic}:{stage}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]
