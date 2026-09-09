from app.core.security import encrypt_value, decrypt_value, mask_secret


def test_encryption_roundtrip():
    secret = "sk-super-secret-api-token-12345"
    encrypted = encrypt_value(secret)
    assert encrypted != secret
    decrypted = decrypt_value(encrypted)
    assert decrypted == secret


def test_empty_string_encryption():
    assert encrypt_value("") == ""
    assert decrypt_value("") == ""


def test_secret_masking():
    short_secret = "12345"
    assert mask_secret(short_secret) == "********"

    long_secret = "sk-live-9876543210abcdef"
    masked = mask_secret(long_secret)
    assert masked.startswith("sk-l")
    assert masked.endswith("cdef")
    assert "..." in masked
    assert "98765" not in masked
