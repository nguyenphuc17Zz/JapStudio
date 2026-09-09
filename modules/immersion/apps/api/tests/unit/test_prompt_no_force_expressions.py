from app.services.ai.prompts.prompt_registry import PromptRegistry


def test_comprehensive_prompt_has_no_force_expressions_rule():
    """Regression guard: the extraction prompt must allow empty expressions
    and forbid inventing collocations when the article has none."""
    prompt = PromptRegistry.build_comprehensive_prompt(
        title="テスト", content="これはテスト記事です。", source_name="Test"
    )
    lowered = prompt.lower()
    assert "expressions" in lowered
    assert "empty" in lowered
    assert "never invent" in lowered or "never force" in lowered or "không" in prompt
