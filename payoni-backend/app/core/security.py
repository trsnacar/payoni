from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets
import uuid

import bcrypt as _bcrypt
from jose import JWTError, jwt

from app.config import settings


def _prep(password: str) -> bytes:
    # SHA-256 hex digest (64 bytes) — bcrypt 72-byte sınırının altında kalır
    return hashlib.sha256(password.encode()).hexdigest().encode()


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(_prep(password), _bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _bcrypt.checkpw(_prep(plain_password), hashed_password.encode())


def create_access_token(merchant_id: str, email: str, is_superuser: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": merchant_id,
        "email": email,
        "is_superuser": is_superuser,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(merchant_id: str) -> tuple[str, str]:
    """Returns (token, jti) — jti is stored in Redis for revocation."""
    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": merchant_id,
        "type": "refresh",
        "jti": jti,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, jti


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def generate_api_key() -> tuple[str, str, str]:
    """Returns (full_key, key_hash, key_prefix)."""
    raw = secrets.token_urlsafe(32)
    full_key = f"pay_live_{raw}"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    key_prefix = full_key[:16]
    return full_key, key_hash, key_prefix


def hash_api_key(full_key: str) -> str:
    return hashlib.sha256(full_key.encode()).hexdigest()
