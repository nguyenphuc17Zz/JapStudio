"""Prompt registry tests (Phase 11)."""

from app.prompts.registry import PromptRegistry, create_prompt_registry
from app.quality.enums import CostProfile, Criticality


class TestPromptRegistry:
    def test_creates_all_entries(self) -> None:
        registry = create_prompt_registry()
        assert len(registry.records()) >= 50

    def test_lookup_and_version_for(self) -> None:
        registry = create_prompt_registry()
        record = registry.get("semantic_evaluation")
        assert record is not None
        assert registry.version_for("semantic_evaluation") == record.version
        assert ":" in record.version

    def test_unknown_task_returns_none(self) -> None:
        registry = create_prompt_registry()
        assert registry.get("no_such_prompt") is None

    def test_find_by_version(self) -> None:
        registry = create_prompt_registry()
        version = registry.version_for("semantic_evaluation")
        assert registry.find_version(version)

    def test_records_public_dict(self) -> None:
        public = create_prompt_registry().to_public_dict()
        assert public
        assert set(public[0]) == {
            "task",
            "version",
            "description",
            "criticality",
            "cost_profile",
            "output_schema",
        }

    def test_manual_registry_build(self) -> None:
        from app.prompts.registry import PromptRecord

        registry = PromptRegistry()
        record = PromptRecord(
            task="custom",
            version="custom:v1",
            description="Custom prompt",
            criticality=Criticality.HIGH,
            cost_profile=CostProfile.BALANCED,
        )
        registry.register(record)
        assert registry.version_for("custom") == "custom:v1"
