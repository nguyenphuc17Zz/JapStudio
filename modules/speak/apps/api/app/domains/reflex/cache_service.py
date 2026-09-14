"""ExerciseCacheService — Universal Smart Pool & Algorithmic Exercise Manager.

Implements 5 core algorithms:
1. Adaptive Multi-Armed Bandit (Decaying Exploration Rate)
2. Spaced Recency Decay & Frequency Suppression Selection
3. N-gram Jaccard Semantic Deduplication
4. Maximal Marginal Relevance (MMR) Diversity Awareness
5. Zero-Latency Asynchronous Background Prefetch Pipeline
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import random
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.domains.reflex.models import AIExerciseCache
from app.infrastructure.database.session import AsyncSessionLocal


def _extract_text_for_signature(exercise_dict: dict[str, Any]) -> str:
    """Extracts primary Japanese sentence/prompt text for signature & deduplication."""
    candidates = [
        exercise_dict.get("prompt"),
        exercise_dict.get("japanese_text"),
        exercise_dict.get("prompt_ja"),
        exercise_dict.get("target_sentence"),
        exercise_dict.get("npc_opening_dialogue"),
        exercise_dict.get("situation_title"),
        exercise_dict.get("word"),
        exercise_dict.get("question"),
        exercise_dict.get("scenario"),
        exercise_dict.get("canonical"),
        exercise_dict.get("reference_ja"),
        exercise_dict.get("prompt_vi"),
        exercise_dict.get("situation_vi"),
        exercise_dict.get("source_sentence"),
    ]
    # For Aizuchi: include all NPC turn texts
    if isinstance(exercise_dict.get("npc_turns"), list):
        for turn in exercise_dict["npc_turns"][:4]:
            if isinstance(turn, dict) and turn.get("text"):
                candidates.append(turn["text"])
    # For Builder: include keywords
    if isinstance(exercise_dict.get("keywords"), list):
        candidates.append(" ".join(str(k) for k in exercise_dict["keywords"]))
    parts = [str(c) for c in candidates if c]
    return " ".join(parts).strip()


def _extract_ngrams(text: str, n: int = 2) -> set[str]:
    """Extracts character n-grams from Japanese text."""
    clean = "".join(c for c in text if not c.isspace())
    if len(clean) < n:
        return {clean} if clean else set()
    return {clean[i : i + n] for i in range(len(clean) - n + 1)}


def _jaccard_similarity(set_a: set[str], set_b: set[str]) -> float:
    """Computes Jaccard similarity index between two n-gram sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return float(intersection) / float(union) if union > 0 else 0.0


class ExerciseCacheService:
    """Universal High-Performance Exercise Cache Service across all learning domains."""

    TAU_SECONDS = 3600.0  # 1 hour decay parameter for Spaced Recency
    GAMMA_FREQ = 0.7      # Frequency suppression exponent
    MIN_WARMUP_ITEMS = 15 # Below this count, exploration is 100%
    MAX_EXPLORATION_MIN = 0.08 # Minimum exploration floor (8%)

    def __init__(self, db: AsyncSession | None = None):
        self.db = db

    async def get_pool_count(self, domain: str, sub_mode: str, difficulty: str) -> int:
        """Counts existing valid cached exercises for a given sub_mode."""
        session = self.db or AsyncSessionLocal()
        close_needed = self.db is None
        try:
            stmt = (
                select(func.count(AIExerciseCache.id))
                .where(
                    AIExerciseCache.domain == domain,
                    AIExerciseCache.sub_mode == sub_mode,
                    AIExerciseCache.difficulty == difficulty,
                )
            )
            res = await session.execute(stmt)
            return res.scalar_one() or 0
        finally:
            if close_needed:
                await session.close()

    async def should_explore(self, domain: str, sub_mode: str, difficulty: str) -> tuple[bool, int]:
        """
        Algorithm 1: Adaptive Multi-Armed Bandit Exploration.
        Returns (is_explore_turn, current_pool_size).
        If True, system should trigger AI generation to expand the pool.
        """
        pool_size = await self.get_pool_count(domain, sub_mode, difficulty)
        if pool_size < self.MIN_WARMUP_ITEMS:
            return True, pool_size

        # P(explore) = max(0.08, 1 / sqrt(1 + 0.04 * pool_size))
        p_explore = max(self.MAX_EXPLORATION_MIN, 1.0 / math.sqrt(1.0 + 0.04 * pool_size))
        is_explore = random.random() < p_explore
        return is_explore, pool_size

    async def get_smart_exercise(
        self,
        domain: str,
        sub_mode: str,
        difficulty: str,
        exclude_ids: list[str] | None = None,
        recent_prompts: list[str] | None = None,
    ) -> dict[str, Any] | None:
        """
        Algorithm 2 & 4: Spaced Recency Decay + Frequency Suppression + MMR Diversity.
        Picks the most pedagogically diverse and fresh exercise from the pool.
        """
        session = self.db or AsyncSessionLocal()
        close_needed = self.db is None
        try:
            stmt = (
                select(AIExerciseCache)
                .where(
                    AIExerciseCache.domain == domain,
                    AIExerciseCache.sub_mode == sub_mode,
                    AIExerciseCache.difficulty == difficulty,
                )
            )
            if exclude_ids:
                stmt = stmt.where(AIExerciseCache.id.notin_(exclude_ids[:30]))

            # Fetch a high-quality sample window (up to 100 rows ordered by least served)
            stmt = stmt.order_by(AIExerciseCache.times_served.asc(), AIExerciseCache.last_served_at.asc().nulls_first()).limit(100)
            res = await session.execute(stmt)
            rows = list(res.scalars().all())

            if not rows:
                return None

            now = datetime.now(timezone.utc)
            weights: list[float] = []
            recent_ngram_sets = [_extract_ngrams(p) for p in (recent_prompts or []) if p]

            for item in rows:
                # 1. Spaced Recency Decay (Exponential)
                if item.last_served_at is None:
                    recency_weight = 1.0
                else:
                    last_served = item.last_served_at
                    if last_served.tzinfo is None:
                        last_served = last_served.replace(tzinfo=timezone.utc)
                    delta_sec = max(0.0, (now - last_served).total_seconds())
                    recency_weight = 1.0 - math.exp(-delta_sec / self.TAU_SECONDS)

                # 2. Frequency Suppression
                freq_weight = 1.0 / math.pow(1.0 + item.times_served, self.GAMMA_FREQ)

                # 3. Quality score
                quality_weight = max(0.1, item.quality_score)

                # 4. MMR / Recent prompt penalty
                mmr_weight = 1.0
                if recent_ngram_sets and item.ngram_signature:
                    item_sig = set(item.ngram_signature.split())
                    max_sim = max((_jaccard_similarity(item_sig, r_sig) for r_sig in recent_ngram_sets), default=0.0)
                    if max_sim > 0.45:
                        mmr_weight = 0.15 # Penalize similar sentences in the same session

                final_w = max(0.001, recency_weight * freq_weight * quality_weight * mmr_weight)
                weights.append(final_w)

            chosen_item = random.choices(rows, weights=weights, k=1)[0]

            # Mark item as served
            chosen_item.times_served += 1
            chosen_item.last_served_at = now
            await session.commit()

            # Parse content json
            payload = json.loads(chosen_item.content_json)
            payload["ai_generated"] = True
            payload["generation_source"] = "smart_cache_pool"
            payload["cached_pool_id"] = str(chosen_item.id)
            payload["times_served"] = chosen_item.times_served
            return payload

        except Exception as err:
            logger.error(f"[ExerciseCacheService] get_smart_exercise error: {err}")
            return None
        finally:
            if close_needed:
                await session.close()

    async def save_exercise_to_pool(
        self,
        domain: str,
        sub_mode: str,
        difficulty: str,
        exercise_dict: dict[str, Any],
        category: str | None = None,
    ) -> bool:
        """
        Algorithm 3: N-Gram Jaccard Semantic Deduplication & Infinite Pool Storage.
        Saves exercise into DB only if it is non-duplicate and semantically novel.
        """
        if not exercise_dict or not isinstance(exercise_dict, dict):
            return False

        # Don't re-cache items that were already pulled from cache
        if exercise_dict.get("generation_source") == "smart_cache_pool":
            return False

        # Compute stable SHA256 of text
        primary_text = _extract_text_for_signature(exercise_dict)
        if not primary_text:
            primary_text = json.dumps(exercise_dict, sort_keys=True)

        content_hash = hashlib.sha256(primary_text.strip().lower().encode("utf-8")).hexdigest()
        ngrams = _extract_ngrams(primary_text, n=2)
        ngram_sig = " ".join(sorted(ngrams))

        session = self.db or AsyncSessionLocal()
        close_needed = self.db is None
        try:
            # 1. Exact duplicate check
            existing_hash = await session.execute(
                select(AIExerciseCache.id).where(AIExerciseCache.content_hash == content_hash).limit(1)
            )
            if existing_hash.scalar_one_or_none():
                return False

            # 2. Semantic novelty check against existing items in same sub_mode
            existing_recent = await session.execute(
                select(AIExerciseCache.ngram_signature)
                .where(
                    AIExerciseCache.domain == domain,
                    AIExerciseCache.sub_mode == sub_mode,
                    AIExerciseCache.ngram_signature.isnot(None),
                )
                .order_by(AIExerciseCache.created_at.desc())
                .limit(50)
            )
            for (sig_str,) in existing_recent.all():
                if sig_str:
                    existing_set = set(sig_str.split())
                    sim = _jaccard_similarity(ngrams, existing_set)
                    if sim > 0.78:
                        logger.info(f"[ExerciseCacheService] Discarding duplicate/near-duplicate exercise (Jaccard sim={sim:.2f})")
                        return False

            # Clean up transient flags before caching
            clean_dict = dict(exercise_dict)
            clean_dict.pop("cached_pool_id", None)
            clean_dict["ai_generated"] = True
            clean_dict["generation_source"] = "smart_cache_pool"

            content_json = json.dumps(clean_dict, ensure_ascii=False)
            new_cache_entry = AIExerciseCache(
                domain=domain,
                sub_mode=sub_mode,
                difficulty=difficulty,
                category=category,
                content_json=content_json,
                content_hash=content_hash,
                ngram_signature=ngram_sig,
                times_served=1,
                last_served_at=datetime.now(timezone.utc),
                quality_score=1.0,
                generation_source="gemini_ai",
            )
            session.add(new_cache_entry)
            await session.commit()
            logger.info(f"[ExerciseCacheService] Successfully cached new unique exercise in {domain}/{sub_mode} (pool growing)")
            return True

        except Exception as err:
            logger.warning(f"[ExerciseCacheService] save_exercise_to_pool failed: {err}")
            await session.rollback()
            return False
        finally:
            if close_needed:
                await session.close()

    def trigger_background_expansion(
        self,
        domain: str,
        sub_mode: str,
        difficulty: str,
        generator_coroutine_factory: Callable[[], Coroutine[Any, Any, dict[str, Any] | None]],
        category: str | None = None,
    ) -> None:
        """
        Algorithm 5: Zero-Latency Asynchronous Background Prefetch Pipeline.
        Spawns non-blocking async worker to generate and store fresh AI exercises into the pool.
        """
        async def _background_worker():
            try:
                new_exercise = await generator_coroutine_factory()
                if new_exercise and isinstance(new_exercise, dict):
                    # Check if it was genuine AI-generated
                    if new_exercise.get("ai_generated") is not False:
                        service = ExerciseCacheService()
                        await service.save_exercise_to_pool(
                            domain=domain,
                            sub_mode=sub_mode,
                            difficulty=difficulty,
                            exercise_dict=new_exercise,
                            category=category,
                        )
            except Exception as bg_err:
                logger.warning(f"[ExerciseCacheService] Background expansion worker failed for {domain}/{sub_mode}: {bg_err}")

        asyncio.create_task(_background_worker())
