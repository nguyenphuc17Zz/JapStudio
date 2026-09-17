"""Unit test for Conversation Turn Scaffolding (suggestions & key vocab)."""

import pytest
from app.domains.conversation.service import ConversationService
from app.domains.personas.models import Persona


def test_conversation_fallback_scaffolding():
    """Verify that _generate_fallback_scaffolding generates rich suggestions and key vocab."""
    svc = ConversationService(None)  # Session not needed for pure logic

    persona = Persona(name="Yamada", role="Business Boss", personality="Strict", speaking_style="Formal Keigo")

    # 1. Work context
    work_scaffold = svc._generate_fallback_scaffolding("来週のプレゼンの準備はどうなっていますか？", persona=persona)
    assert "suggestions" in work_scaffold
    assert len(work_scaffold["suggestions"]) >= 2
    assert "key_vocab" in work_scaffold
    assert len(work_scaffold["key_vocab"]) >= 2

    # 2. Restaurant / Food context
    food_scaffold = svc._generate_fallback_scaffolding("ご注文はお決まりでしょうか？何にいたしましょうか？", persona=persona)
    assert any("注文" in v["ja"] or "おすすめ" in v["ja"] for v in food_scaffold["key_vocab"])

    # 3. General conversation
    gen_scaffold = svc._generate_fallback_scaffolding("今日はいい天気ですね！", persona=persona)
    assert len(gen_scaffold["suggestions"]) >= 2


def test_conversation_opening_scaffolding():
    """Verify that opening scaffolding produces valid schema with suggestions and key_vocab."""
    svc = ConversationService(None)
    persona = Persona(name="Kenji", role="Ramen Chef", personality="Friendly", speaking_style="Casual")

    opening_scaffold = svc._generate_fallback_scaffolding("いらっしゃい！何にする？今日のおすすめは特製ラーメンだよ！", persona=persona)
    assert "suggestions" in opening_scaffold
    assert len(opening_scaffold["suggestions"]) >= 2
    assert "key_vocab" in opening_scaffold
    assert len(opening_scaffold["key_vocab"]) >= 2
    for s in opening_scaffold["suggestions"]:
        assert "intent" in s
        assert "ja" in s
        assert "vi" in s
    for v in opening_scaffold["key_vocab"]:
        assert "ja" in v
        assert "reading" in v
        assert "vi" in v


def test_conversation_context_builder_directive():
    """Verify that build_ai_request configures 1500 max_output_tokens and includes scaffolding turn directive."""
    from app.domains.conversation.context import ConversationContextBuilder
    from app.domains.conversation.models import ConversationSession, ConversationTurn

    builder = ConversationContextBuilder()
    persona = Persona(name="Yuki", role="Senior", personality="Warm", speaking_style="Casual", difficulty="N3")
    session = ConversationSession(id="s1", user_id="u1", mode="conversation")
    turn1 = ConversationTurn(session_id="s1", sequence=1, speaker="assistant", transcript="こんにちは！")

    req = builder.build_ai_request(
        session=session,
        persona=persona,
        current_user_text="元気です！",
        turns_history=[turn1],
        user_id="u1"
    )

    assert req.max_output_tokens == 1500
    assert "---SCAFFOLD---" in req.messages[-1].content
    assert "元気です！" in req.messages[-1].content

