"""Mistake clustering service (Phase 6, stage 2).

Groups raw issue evidence from evaluation payloads into recurring patterns.
AI proposes clusters (canonical_label as the stable deduplication key);
deterministic code upserts counters and examples. On AI failure a
deterministic fallback groups by issue category.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from app.core.config import Settings, get_settings
from app.models import MistakePattern
from app.prompts.mistake_clustering import (
    build_mistake_clustering_prompt,
)
from app.repositories import MistakePatternRepository
from app.schemas.learning_ai import MistakeClusteringResult
from app.services.ai_service import AIService

logger = logging.getLogger("app.learning")

_RECENT_WINDOW_DAYS = 30
_MAX_EXAMPLES = 5
_SEVERITY_WEIGHT = {"critical": 3, "major": 2, "minor": 1, "info": 0}


def _pattern_confidence(evidence_count: int) -> str:
    if evidence_count >= 5:
        return "high"
    if evidence_count >= 2:
        return "medium"
    return "low"


import math

def _extract_trigrams(text: str) -> list[str]:
    text = text.lower().strip()
    if len(text) <= 3:
        return [text] if text else []
    return [text[i : i + 3] for i in range(len(text) - 2)]


def cluster_issues_agglomerative(issues: list[dict], threshold: float = 0.65) -> list[list[dict]]:
    """Hierarchical agglomerative clustering using TF-IDF Trigram Cosine Distance."""
    if not issues:
        return []
    if len(issues) == 1:
        return [[issues[0]]]

    doc_texts = [
        f"{it.get('category', '')} {it.get('subtype', '')} {it.get('explanation', '')} {it.get('original_text', '')} {it.get('suggested_fix', '')}".strip()
        for it in issues
    ]
    doc_trigrams = [_extract_trigrams(t) for t in doc_texts]

    df: dict[str, int] = {}
    for trigrams in doc_trigrams:
        for t in set(trigrams):
            df[t] = df.get(t, 0) + 1

    n_docs = len(issues)
    vectors: list[dict[str, float]] = []
    for trigrams in doc_trigrams:
        tf: dict[str, int] = {}
        for t in trigrams:
            tf[t] = tf.get(t, 0) + 1
        vec: dict[str, float] = {}
        norm_sq = 0.0
        for t, count in tf.items():
            idf = math.log(1.0 + n_docs / (1.0 + df[t]))
            val = count * idf
            vec[t] = val
            norm_sq += val * val
        norm = math.sqrt(norm_sq) or 1.0
        vectors.append({t: val / norm for t, val in vec.items()})

    def cosine_dist(i: int, j: int) -> float:
        v1, v2 = vectors[i], vectors[j]
        dot = sum(v1[k] * v2[k] for k in v1 if k in v2)
        return max(0.0, min(1.0, 1.0 - dot))

    clusters: list[list[int]] = [[i] for i in range(n_docs)]

    while len(clusters) > 1:
        best_dist = float("inf")
        best_pair = (-1, -1)

        for c1 in range(len(clusters)):
            for c2 in range(c1 + 1, len(clusters)):
                avg_dist = sum(
                    cosine_dist(i, j) for i in clusters[c1] for j in clusters[c2]
                ) / (len(clusters[c1]) * len(clusters[c2]))
                if avg_dist < best_dist:
                    best_dist = avg_dist
                    best_pair = (c1, c2)

        if best_dist > threshold:
            break

        c1, c2 = best_pair
        clusters[c1].extend(clusters[c2])
        clusters.pop(c2)

    return [[issues[idx] for idx in cluster] for cluster in clusters]


class MistakeClusteringService:
    """Owns pattern extraction, clustering and persistence."""

    def __init__(
        self,
        repository: MistakePatternRepository,
        ai_service: AIService,
        settings: Settings | None = None,
    ) -> None:
        self._repository = repository
        self._ai = ai_service
        self._settings = settings or get_settings()

    def _task(self) -> tuple[str | None, str | None]:
        provider = (
            self._settings.ai_learning_provider
            or self._settings.ai_exercise_evaluation_provider
            or self._settings.ai_default_provider
            or None
        )
        model = self._settings.ai_learning_model or None
        return provider, model

    async def update_after_attempt(self, user_id: str | None, issues: list[dict]) -> None:
        """Cluster one attempt's issues into patterns and accumulate evidence.

        Never raises: mistakes are enrichment, not a gate.
        """
        if not issues:
            return
        provider, model = self._task()
        clusters: list[dict[str, Any]] = []
        try:
            result, _ = await self._ai.generate_structured(
                build_mistake_clustering_prompt(issues),
                MistakeClusteringResult,
                provider=provider,
                model=model,
                max_tokens=self._settings.ai_learning_max_tokens,
            )
            clusters = [item.model_dump(mode="json") for item in result.clusters]
        except Exception as exc:
            logger.warning("mistake clustering failed error=%s (deterministic fallback)", exc)
            clusters = self._fallback_clusters(issues)

        for cluster in clusters:
            await self._upsert(user_id, cluster)

    def _fallback_clusters(self, issues: list[dict]) -> list[dict[str, Any]]:
        """Deterministic NLP grouping via TF-IDF Trigram Agglomerative Hierarchical Clustering."""
        grouped: dict[str, list[dict]] = {}
        for issue in issues:
            category = issue.get("category") or "unknown"
            grouped.setdefault(category, []).append(issue)

        labels = {
            "grammar": "grammar_pattern",
            "vocabulary": "vocabulary_pattern",
            "naturalness": "naturalness_pattern",
            "register": "register_pattern",
            "semantic": "semantic_pattern",
        }

        clusters = []
        for category, items in grouped.items():
            base_label = labels.get(category, f"category_{category}")
            sub_clusters = cluster_issues_agglomerative(items, threshold=0.65)
            for idx, sub_items in enumerate(sub_clusters):
                if len(sub_clusters) == 1:
                    cluster_label = base_label
                    desc = f"Có {len(sub_items)} lỗi cùng nhóm '{category}' trong bài viết."
                else:
                    cluster_label = f"{base_label}_{idx + 1}"
                    sample_expl = sub_items[0].get("explanation") or category
                    desc = f"Nhóm lỗi '{category}': {sample_expl} ({len(sub_items)} trường hợp)."

                clusters.append(
                    {
                        "canonical_label": cluster_label,
                        "description_vi": desc,
                        "example_snippets": [
                            item.get("original_text")
                            for item in sub_items[:_MAX_EXAMPLES]
                            if item.get("original_text")
                        ],
                        "severity": max((item.get("severity") or "minor") for item in sub_items)
                        if sub_items
                        else "minor",
                    }
                )
        return clusters

    async def _upsert(self, user_id: str | None, cluster: dict[str, Any]) -> None:
        label = (cluster.get("canonical_label") or "").strip()
        if not label:
            return
        pattern = await self._repository.get_by_label(user_id, label)
        now = datetime.now(timezone.utc)
        examples = cluster.get("example_snippets") or []
        if pattern is None:
            try:
                await self._repository.add(
                    MistakePattern(
                        user_id=user_id,
                        canonical_label=label,
                        description_vi=(cluster.get("description_vi") or "")[:1000],
                        examples=examples[:_MAX_EXAMPLES],
                        evidence_count=1,
                        recent_evidence_count=1,
                        last_seen_at=now,
                        confidence=_pattern_confidence(1),
                        provenance={"severity": cluster.get("severity", "minor")},
                    )
                )
                return
            except IntegrityError:
                await self._repository.session.rollback()
                pattern = await self._repository.get_by_label(user_id, label)
                if pattern is None:
                    raise
        new_count = (pattern.evidence_count or 0) + 1
        severity = cluster.get("severity", "minor")
        provenance = dict(pattern.provenance or {})
        if _SEVERITY_WEIGHT.get(severity, 0) > _SEVERITY_WEIGHT.get(
            provenance.get("severity", "minor"), 0
        ):
            provenance["severity"] = severity
        merged = list(pattern.examples or [])
        for snippet in examples:
            if snippet and snippet not in merged:
                merged.append(snippet)
        merged = merged[:_MAX_EXAMPLES]
        await self._repository.session.execute(
            update(MistakePattern)
            .where(MistakePattern.id == pattern.id)
            .values(
                evidence_count=MistakePattern.evidence_count + 1,
                recent_evidence_count=MistakePattern.recent_evidence_count + 1,
                description_vi=(cluster.get("description_vi") or pattern.description_vi)[:1000],
                examples=merged,
                last_seen_at=now,
                confidence=_pattern_confidence(new_count),
                provenance=provenance,
            )
        )
        await self._repository.session.refresh(pattern)
