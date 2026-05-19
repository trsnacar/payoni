from typing import AsyncGenerator, Optional
from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.core.security import decode_token, hash_api_key
from app.core.exceptions import UnauthorizedException
from app.models.merchant import Merchant
from app.models.api_key import ApiKey

bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_merchant(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Merchant:
    """JWT veya API key ile merchant doğrulama."""
    if not credentials:
        raise UnauthorizedException()

    token = credentials.credentials

    # API key denemesi (pay_live_ prefix'i varsa)
    if token.startswith("pay_live_") or token.startswith("pay_test_"):
        return await _get_merchant_by_api_key(token, db)

    # JWT token denemesi
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedException("Geçersiz veya süresi dolmuş token")

    merchant_id = payload.get("sub")
    merchant = await db.get(Merchant, merchant_id)
    if not merchant or not merchant.is_active or merchant.deleted_at:
        raise UnauthorizedException("Merchant bulunamadı veya pasif")

    return merchant


async def _get_merchant_by_api_key(key: str, db: AsyncSession) -> Merchant:
    key_hash = hash_api_key(key)
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active == True,
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise UnauthorizedException("Geçersiz API anahtarı")

    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        raise UnauthorizedException("API anahtarının süresi dolmuş")

    merchant = await db.get(Merchant, api_key.merchant_id)
    if not merchant or not merchant.is_active:
        raise UnauthorizedException()

    # last_used_at güncelle (fire-and-forget benzeri)
    api_key.last_used_at = datetime.now(timezone.utc)
    await db.commit()

    return merchant
