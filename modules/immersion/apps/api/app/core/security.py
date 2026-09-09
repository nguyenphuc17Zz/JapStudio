import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings

def _get_fernet() -> Fernet:
    """Derives a deterministic Fernet key from the config secret."""
    raw_key = settings.ENCRYPTION_KEY.encode()
    # Ensure 32-byte key for Fernet url-safe base64
    derived = hashlib.sha256(raw_key).digest()
    b64_key = base64.urlsafe_b64encode(derived)
    return Fernet(b64_key)

def encrypt_value(plain_text: str) -> str:
    """Encrypts plaintext string and returns URL-safe base64 token string."""
    if not plain_text:
        return ""
    fernet = _get_fernet()
    return fernet.encrypt(plain_text.encode("utf-8")).decode("utf-8")

def decrypt_value(cipher_text: str) -> str:
    """Decrypts ciphertext and returns original plaintext string."""
    if not cipher_text:
        return ""
    fernet = _get_fernet()
    return fernet.decrypt(cipher_text.encode("utf-8")).decode("utf-8")

def mask_secret(value: str) -> str:
    """Masks secret value for safe presentation in UI and logs.
    e.g., 'sk-1234567890abcdef' -> 'sk-12...cdef' or '****'
    """
    if not value:
        return ""
    if len(value) <= 8:
        return "********"
    return f"{value[:4]}...{value[-4:]}"

# Aliases
encrypt_secret = encrypt_value
decrypt_secret = decrypt_value

