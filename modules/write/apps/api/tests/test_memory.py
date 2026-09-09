"""Memory layer tests (Phase 12): taxonomy, ingest pipeline, retrieval, retention."""

import pytest
from app.domain.memory_taxonomy import (
    MEMORY_CATEGORIES,
    MEMORY_SOURCES,
    MEMORY_TYPES,
    is_valid_category,
    is_valid_confidence,
    is_valid_type,
)
from app.models import LearnerProfile
from app.quality.enums import ConfidenceLevel
from app.repositories import LearnerMemoryRepository, LearnerProfileRepository
from app.schemas.memory_ai import MemoryCandidate
from app.services.ai_service import AIService
from app.services.memory_service import (
    DeterministicMemoryRetriever,
    MemoryService,
)
from sqlalchemy.ext.asyncio import AsyncSession


def _candidate(
    category="mistake_pattern",
    memory_type="pattern",
    content="Người học hay quên trợ từ の trong cụm danh từ.",
    confidence="medium",
    importance=6,
) -> MemoryCandidate:
    return MemoryCandidate(
        category=category,
        type=memory_type,
        content=content,
        confidence=confidence,
        importance=importance,
        evidence=[{"source_type": "evaluation", "source_id": "attempt-1"}],
    )


def _service(session: AsyncSession) -> MemoryService:
    return MemoryService(
        repository=LearnerMemoryRepository(session),
        profile_repository=LearnerProfileRepository(session),
        ai_service=AIService(),
    )


class TestTaxonomy:
    def test_controlled_sets_are_complete(self):
        assert "preference" in MEMORY_CATEGORIES
        assert "mistake_pattern" in MEMORY_CATEGORIES
        assert "user_explicit" in MEMORY_SOURCES
        assert {"semantic", "episodic", "pattern", "preference"} == set(MEMORY_TYPES)

    def test_validators(self):
        assert is_valid_category("mistake_pattern")
        assert not is_valid_category("made_up_category")
        assert is_valid_type("semantic")
        assert not is_valid_type("weird")
        assert is_valid_confidence("high")
        assert not is_valid_confidence("absolute")


@pytest.mark.asyncio
class TestIngest:
    async def test_ingest_creates_memory(self, session):
        service = _service(session)
        counts = await service.ingest_event(
            None, "evaluation", "attempt-1", {"topic": "Work", "overall_score": 70}
        )
        assert counts["created"] == 1
        memories, total = await service.list_for_user(None)
        assert total == 1
        memory = memories[0]
        assert memory.source_type == "evaluation"
        assert memory.source_id == "attempt-1"
        assert memory.status == "active"
        assert memory.importance == 6

    async def test_ingest_is_idempotent_per_evidence(self, session):
        service = _service(session)
        await service.ingest_event(None, "evaluation", "attempt-1", {"topic": "Work"})
        counts = await service.ingest_event(None, "evaluation", "attempt-1", {"topic": "Work"})
        assert counts["created"] == 0
        _, total = await service.list_for_user(None)
        assert total == 1

    async def test_ingest_rejects_weak_candidates(self, session):
        service = _service(session)
        low = _candidate(importance=1, confidence="low")
        outcome = await service._handle_candidate(None, "evaluation", "attempt-1", low)
        assert outcome == "rejected"
        _, total = await service.list_for_user(None)
        assert total == 0

    async def test_ingest_rejects_unsupported_source(self, session):
        counts = await _service(session).ingest_event(
            None, "made_up_source", "x", {"topic": "Work"}
        )
        assert counts == {"created": 0, "updated": 0, "rejected": 0}

    async def test_disabled_by_profile_preference(self, session):
        profile = LearnerProfile(
            user_id=None,
            native_language="vi",
            daily_target=3,
            profile_version="learner_profile:v1",
            preferences={"memory_enabled": False},
        )
        await LearnerProfileRepository(session).add(profile)
        counts = await _service(session).ingest_event(
            None, "evaluation", "attempt-1", {"topic": "Work"}
        )
        assert counts["created"] == 0
        _, total = await _service(session).list_for_user(None)
        assert total == 0

    async def test_explicit_memory_wins_over_inference(self, session):
        service = _service(session)
        await service.create_explicit(
            None, "preference", "preference", "Người học thích viết về du lịch.", 9
        )
        existing, _ = await service.list_for_user(None)
        explicit = existing[0]

        candidate = _candidate(
            category="preference",
            memory_type="preference",
            content="Người học thích viết về du lịch.",
        )
        # drive the conflict path directly: same category/type + full overlap
        outcome = await service._handle_candidate(None, "evaluation", "attempt-9", candidate)
        assert outcome == "updated"
        memories, _ = await service.list_for_user(None)
        assert len(memories) == 1
        assert memories[0].id == explicit.id
        assert memories[0].occurrence_count == 2


@pytest.mark.asyncio
class TestResolutionRules:
    async def test_merge_bumps_occurrence_and_importance(self, session):
        service = _service(session)
        seed = await service.create_explicit(
            None,
            "learning_pattern",
            "pattern",
            "Người học hay quên trợ từ の trong cụm danh từ.",
            6,
        )
        candidate = _candidate(
            category="learning_pattern",
            content=seed.content,
            importance=8,
        )
        outcome = await service._handle_candidate(None, "evaluation", "attempt-2", candidate)
        assert outcome == "updated"
        memories, _ = await service.list_for_user(None)
        assert len(memories) == 1
        assert memories[0].occurrence_count == 2
        assert memories[0].importance == 8

    async def test_contextual_conflict_keeps_both(self, session):
        service = _service(session)
        await service.ingest_event(None, "evaluation", "attempt-1", {"topic": "Work"})
        candidate = _candidate(
            category="preference",
            memory_type="preference",
            content="Người học thích viết về du lịch.",
        )
        outcome = await service._handle_candidate(None, "evaluation", "attempt-2", candidate)
        assert outcome == "created"
        _, total = await service.list_for_user(None)
        assert total == 2

    async def test_low_confidence_conflicting_candidate_is_rejected(self, session):
        service = _service(session)
        await service.create_explicit(
            None,
            "learning_pattern",
            "pattern",
            "Người học luôn kiểm tra lại bài trước khi nộp.",
            7,
        )
        candidate = _candidate(
            category="learning_pattern",
            memory_type="pattern",
            content="Người học luôn kiểm tra lại bài trước khi nộp.",
            confidence="low",
            importance=4,
        )
        outcome = await service._handle_candidate(None, "evaluation", "attempt-2", candidate)
        assert outcome == "rejected"
        memories, _ = await service.list_for_user(None)
        assert len(memories) == 1
        assert memories[0].source_type == "user_explicit"


@pytest.mark.asyncio
class TestRetrieval:
    async def test_retriever_ranks_importance_and_task_boost(self, session):
        service = _service(session)
        await service.create_explicit(None, "goal_memory", "semantic", "Mục tiêu JLPT N3.", 9)
        await service.create_explicit(
            None, "preference", "preference", "Thích văn phong thân mật.", 5
        )
        retriever = DeterministicMemoryRetriever(LearnerMemoryRepository(session))
        memories = await retriever.retrieve(None, "planner", max_items=10, max_tokens=10_000)
        assert len(memories) == 2
        assert memories[0].category == "goal_memory"

    async def test_retriever_respects_budget(self, session):
        service = _service(session)
        for index in range(5):
            await service.create_explicit(
                None,
                "preference",
                "preference",
                f"Ghi nhớ mẫu số {index} với nội dung khá dài để chiếm token.",
                5,
            )
        retriever = DeterministicMemoryRetriever(LearnerMemoryRepository(session))
        memories = await retriever.retrieve(None, "planner", max_items=10, max_tokens=20)
        assert 0 < len(memories) < 5

    async def test_retriever_skips_archived(self, session):
        service = _service(session)
        memory = await service.create_explicit(
            None, "preference", "preference", "Thích buổi sáng.", 5
        )
        await service.archive(None, memory.id)
        retriever = DeterministicMemoryRetriever(LearnerMemoryRepository(session))
        memories = await retriever.retrieve(None, "planner")
        assert memories == []

    async def test_context_builder_formats_block(self, session):
        service = _service(session)
        await service.create_explicit(None, "preference", "preference", "Thích viết thư tay.", 7)
        block = await service.context_builder().memory_block(None, "coach")
        assert "Ghi nhớ" in block
        assert "Thích viết thư tay" in block


@pytest.mark.asyncio
class TestUserOperations:
    async def test_create_explicit_forces_high_confidence(self, session):
        service = _service(session)
        memory = await service.create_explicit(None, "goal_memory", "semantic", "Mục tiêu N2.", 9)
        assert memory.confidence == ConfidenceLevel.HIGH.value
        assert memory.source_type == "user_explicit"
        assert memory.memory_class == "temporary"

    async def test_create_explicit_sanitizes_taxonomy(self, session):
        service = _service(session)
        memory = await service.create_explicit(None, "not_a_category", "not_a_type", "Nội dung.", 9)
        assert memory.category == "preference"
        assert memory.type == "preference"

    async def test_forget_deletes(self, session):
        service = _service(session)
        memory = await service.create_explicit(None, "preference", "preference", "Nội dung.", 5)
        assert await service.forget(None, memory.id) is True
        assert await service.get_for_user(None, memory.id) is None
        assert await service.forget(None, memory.id) is False

    async def test_archive_hides_from_retrieval(self, session):
        service = _service(session)
        memory = await service.create_explicit(None, "preference", "preference", "Nội dung.", 5)
        assert await service.archive(None, memory.id) is True
        stored = await service.get_for_user(None, memory.id)
        assert stored is not None and stored.status == "archived"

    async def test_refresh_reprocesses_events(self, session):
        service = _service(session)
        counts = await service.refresh(None)
        assert counts["processed_events"] == 0
        assert counts["expired"] == 0


@pytest.mark.asyncio
class TestRetention:
    async def test_expire_temporary_marks_goals(self, session):
        service = _service(session)
        memory = await service.create_explicit(None, "goal_memory", "semantic", "Mục tiêu N3.", 8)
        from datetime import datetime, timedelta, timezone

        memory.last_seen_at = datetime.now(timezone.utc) - timedelta(days=200)
        await LearnerMemoryRepository(session).update(memory)
        expired = await service.expire_temporary(None)
        assert expired == 1
        stored = await service.get_for_user(None, memory.id)
        assert stored.status == "expired"
