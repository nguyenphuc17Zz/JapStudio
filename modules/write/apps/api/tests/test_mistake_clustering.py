"""MistakeClusteringService tests (Phase 6): AI clustering, deterministic
fallback, label-based accumulation and confidence progression."""

from app.providers.ai.router import AIRouter
from app.repositories import MistakePatternRepository
from app.schemas.learning_ai import MistakeClusteringResult, MistakeClusterItem
from app.services.ai_service import AIService
from app.services.mistake_clustering_service import (
    MistakeClusteringService,
    cluster_issues_agglomerative,
)

from scripted_provider import ScriptedAIProvider

ISSUES = [
    {
        "category": "grammar",
        "severity": "major",
        "original_text": "私の仕事",
        "suggested_fix": "私の仕事は",
        "explanation": "thiếu trợ từ は",
    },
    {
        "category": "grammar",
        "severity": "minor",
        "original_text": "学校行く",
        "suggested_fix": "学校へ行く",
        "explanation": "thiếu trợ từ",
    },
]


def _service(session, *, provider: ScriptedAIProvider | None = None) -> MistakeClusteringService:
    router = AIRouter(
        providers={"fake": lambda: provider or ScriptedAIProvider()},
        default_provider="fake",
        fallback_providers=[],
    )
    return MistakeClusteringService(MistakePatternRepository(session), AIService(ai_router=router))


async def test_ai_clusters_accumulate_evidence(session) -> None:
    cluster = MistakeClusterItem(
        canonical_label="particle_ha_ga",
        description_vi="Nhầm trợ từ は/が",
        example_snippets=["私の仕事", "学校行く"],
        severity="major",
    )
    provider = ScriptedAIProvider(
        mistake_clusterings=[
            MistakeClusteringResult(clusters=[cluster]),
            MistakeClusteringResult(clusters=[cluster]),
        ]
    )
    service = _service(session, provider=provider)
    await service.update_after_attempt(None, ISSUES)
    await service.update_after_attempt(None, ISSUES)

    patterns = await MistakePatternRepository(session).list_by_user(None)
    assert len(patterns) == 1
    pattern = patterns[0]
    assert pattern.canonical_label == "particle_ha_ga"
    assert pattern.evidence_count == 2
    assert pattern.recent_evidence_count == 2
    assert pattern.confidence == "medium"
    assert pattern.examples == ["私の仕事", "学校行く"]
    assert pattern.provenance["severity"] == "major"


async def test_empty_issues_skipped(session) -> None:
    service = _service(session)
    await service.update_after_attempt(None, [])
    assert await MistakePatternRepository(session).count() == 0


async def test_fallback_groups_by_category(session) -> None:
    class FailingProvider(ScriptedAIProvider):
        async def generate_structured(self, prompt, response_model, **kwargs):
            raise RuntimeError("boom")

    service = _service(session, provider=FailingProvider())
    await service.update_after_attempt(None, ISSUES)
    patterns = await MistakePatternRepository(session).list_by_user(None)
    assert len(patterns) == 1
    assert patterns[0].canonical_label == "grammar_pattern"
    assert patterns[0].evidence_count == 1
    assert patterns[0].confidence == "low"


async def test_confidence_progression(session) -> None:
    provider = ScriptedAIProvider(
        mistake_clusterings=[
            MistakeClusteringResult(
                clusters=[
                    MistakeClusterItem(
                        canonical_label="te_form",
                        description_vi="Lỗi nối thể て",
                        severity="minor",
                    )
                ]
            )
            for _ in range(5)
        ]
    )
    service = _service(session, provider=provider)
    for _ in range(5):
        await service.update_after_attempt(None, ISSUES)
    pattern = (await MistakePatternRepository(session).list_by_user(None))[0]
    assert pattern.evidence_count == 5
    assert pattern.confidence == "high"


def test_agglomerative_clustering_separates_distinct_patterns() -> None:
    mixed_issues = [
        {"category": "grammar", "explanation": "thiếu trợ từ は", "original_text": "私の仕事"},
        {"category": "grammar", "explanation": "thiếu trợ từ が", "original_text": "雨降る"},
        {"category": "grammar", "explanation": "sai thể bị động られる", "original_text": "先生に褒める"},
        {"category": "grammar", "explanation": "sai thể bị động される", "original_text": "雨に降る"},
    ]
    clusters = cluster_issues_agglomerative(mixed_issues, threshold=0.65)
    assert len(clusters) == 2

