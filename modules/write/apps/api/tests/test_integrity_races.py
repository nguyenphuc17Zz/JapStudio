"""Race-resolution tests for the Phase 15 integrity backstops (A3).

The database now enforces the deduplication invariants the application
guards in code; when a concurrent write loses the race the affected
services must roll back and return the winning row instead of raising.
"""

from datetime import date

import pytest
from app.models import (
    VocabularyConfidence,
    VocabularyDiscovery,
    VocabularyEntry,
    VocabularySourceType,
    VocabularyType,
)
from app.quality.enums import ConfidenceLevel
from app.repositories import (
    DailyMissionRepository,
    LearnerMemoryRepository,
    LearnerProfileRepository,
    MistakePatternRepository,
    VocabularyDiscoveryRepository,
    VocabularyEntryRepository,
)
from app.services.ai_service import AIService
from app.services.memory_service import MemoryService
from app.services.mistake_clustering_service import MistakeClusteringService
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from analytics_helpers import make_attempt, make_exercise
from gamification_helpers import build_mission_service


def _memory_service(session: AsyncSession) -> MemoryService:
    return MemoryService(
        repository=LearnerMemoryRepository(session),
        profile_repository=LearnerProfileRepository(session),
        ai_service=AIService(),
    )


def _clustering_service(session: AsyncSession) -> MistakeClusteringService:
    return MistakeClusteringService(
        repository=MistakePatternRepository(session),
        ai_service=AIService(),
    )


async def _discovery_count(session: AsyncSession) -> int:
    return (await session.scalar(select(func.count()).select_from(VocabularyDiscovery))) or 0


@pytest.mark.asyncio
class TestMemoryCreateRace:
    async def test_concurrent_create_returns_winning_row(self, session) -> None:
        service = _memory_service(session)
        first = await service._create(
            None,
            category="mistake_pattern",
            memory_type="pattern",
            content="Hay quên trợ từ trong cụm danh từ.",
            confidence=ConfidenceLevel.MEDIUM,
            importance=6,
            source_type="evaluation",
            source_id="attempt-1",
        )
        await session.commit()
        second = await service._create(
            None,
            category="mistake_pattern",
            memory_type="pattern",
            content="Hay quên trợ từ trong cụm danh từ.",
            confidence=ConfidenceLevel.MEDIUM,
            importance=6,
            source_type="evaluation",
            source_id="attempt-1",
        )
        assert first is not None
        assert second is not None
        assert second.id == first.id
        await session.commit()
        _, total = await service.list_for_user(None)
        assert total == 1


@pytest.mark.asyncio
class TestMissionGenerationRace:
    async def test_concurrent_generation_returns_existing_mission(self, session) -> None:
        service = build_mission_service(session)
        first = await service._generate(None, date(2026, 8, 19))
        await session.commit()
        second = await service._generate(None, date(2026, 8, 19))
        assert second.id == first.id
        await session.commit()
        rows = await DailyMissionRepository(session).list_recent_by_user(None, limit=10)
        assert len(rows) == 1


@pytest.mark.asyncio
class TestMistakePatternRace:
    async def test_concurrent_upsert_single_row_and_counters(self, session) -> None:
        service = _clustering_service(session)
        cluster = {
            "canonical_label": "particle_omission",
            "description_vi": "Thiếu trợ từ trong câu.",
            "example_snippets": ["Hôm nay tôi đi chợ"],
        }
        await service._upsert(None, cluster)
        await service._upsert(None, cluster)
        await service._upsert(None, {**cluster, "example_snippets": ["Tôi thích cà phê"]})
        await session.commit()
        rows = await MistakePatternRepository(session).list_by_user(None, limit=10)
        assert len(rows) == 1
        assert rows[0].evidence_count == 3
        assert rows[0].recent_evidence_count == 3
        assert rows[0].description_vi == "Thiếu trợ từ trong câu."
        assert len(rows[0].examples) == 2


@pytest.mark.asyncio
class TestVocabularyDiscoveryConstraint:
    async def test_duplicate_discovery_blocked_by_database(self, session) -> None:
        exercise = await make_exercise(session)
        attempt = await make_attempt(session, exercise, score=80)
        entry = await VocabularyEntryRepository(session).add(
            VocabularyEntry(
                expression="cà phê",
                normalized_expression="ca phe",
                reading="kōhī",
                type=VocabularyType.WORD,
                meaning_vi="cà phê",
                part_of_speech="noun",
                estimated_jlpt_level="N5",
                difficulty=2,
                register="casual",
                usage_context="daily life",
                example_sentence="Tôi uống cà phê.",
                natural_alternatives=[],
                notes=None,
                importance=5,
                confidence=VocabularyConfidence.HIGH,
                provenance={"provider": "fake", "model": "fake", "prompt_version": "v1"},
            )
        )
        repository = VocabularyDiscoveryRepository(session)
        await repository.add(
            VocabularyDiscovery(
                entry_id=entry.id,
                attempt_id=attempt.id,
                exercise_id=exercise.id,
                source_type=VocabularySourceType.USER_ANSWER,
                user_expression=None,
                learning_reason="test",
                context_snippet="Tôi uống cà phê.",
                example_sentence=None,
                provenance={"provider": "fake", "model": "fake", "prompt_version": "v1"},
            )
        )
        await session.commit()
        with pytest.raises(IntegrityError):
            await repository.add(
                VocabularyDiscovery(
                    entry_id=entry.id,
                    attempt_id=attempt.id,
                    exercise_id=exercise.id,
                    source_type=VocabularySourceType.USER_ANSWER,
                    user_expression=None,
                    learning_reason="test",
                    context_snippet="Tôi uống cà phê.",
                    example_sentence=None,
                    provenance={"provider": "fake", "model": "fake", "prompt_version": "v1"},
                )
            )
        await session.rollback()
        assert await _discovery_count(session) == 1
