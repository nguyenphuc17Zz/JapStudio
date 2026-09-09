from app.core.secrets_guard import redact_secrets


def test_masks_sk_and_gsk_keys():
    msg = "failed with sk-9Iz9W6ORyogifQvAinQiazpYbFcYl4pTEjCNs2JZv key and gsk_abcDEF1234567890 done"
    out = redact_secrets(msg)
    assert "sk-9Iz9" not in out
    assert "gsk_abcDEF" not in out
    assert "sk-****" in out
    assert "gsk_****" in out


def test_masks_bearer_and_query_key():
    msg = 'Client error for url https://x.test/chat?key=AIzaSyD1234567890abcdef headers {"Authorization": "Bearer gsk_secretvalue99"}'
    out = redact_secrets(msg)
    assert "AIzaSyD1234567890abcdef" not in out
    assert "gsk_secretvalue99" not in out
    assert "key=****" in out
    assert "****" in out  # Bearer token masked (as gsk_****)


def test_masks_api_key_assignment():
    out = redact_secrets('config {"api_key": "supersecretkey123"} saved')
    assert "supersecretkey123" not in out
    assert "****" in out


def test_passthrough_safe_text_and_none():
    assert redact_secrets("Groq từ chối (400): model không tồn tại.") == "Groq từ chối (400): model không tồn tại."
    assert redact_secrets(None) == ""
    assert redact_secrets(123) == "123"
