import base64
import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


def _get_key() -> bytes:
    """Derives 32-byte AES key from PAYONI_MASTER_KEY setting."""
    raw = settings.PAYONI_MASTER_KEY.encode("utf-8")
    # Pad or truncate to exactly 32 bytes
    return raw[:32].ljust(32, b"\x00")


def encrypt_credentials(credentials: dict) -> tuple[str, str]:
    """
    Encrypts a credentials dict with AES-256-GCM.
    Returns (ciphertext_b64, iv_b64).
    """
    key = _get_key()
    iv = os.urandom(12)  # 96-bit IV
    aesgcm = AESGCM(key)
    plaintext = json.dumps(credentials).encode("utf-8")
    ciphertext = aesgcm.encrypt(iv, plaintext, None)
    return (
        base64.b64encode(ciphertext).decode("utf-8"),
        base64.b64encode(iv).decode("utf-8"),
    )


def decrypt_credentials(ciphertext_b64: str, iv_b64: str) -> dict:
    """Decrypts credentials. Raises ValueError if tampered."""
    key = _get_key()
    iv = base64.b64decode(iv_b64)
    ciphertext = base64.b64decode(ciphertext_b64)
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(iv, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))
