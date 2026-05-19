from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Response, Cookie
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.dependencies import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token
)
from app.core.exceptions import UnauthorizedException, ConflictException
from app.models.merchant import Merchant
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.config import settings

import uuid

router = APIRouter(prefix="/auth", tags=["Auth"])


async def get_redis():
    client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.aclose()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    # Email kontrolü
    existing = await db.execute(select(Merchant).where(Merchant.email == body.email))
    if existing.scalar_one_or_none():
        raise ConflictException("Bu email adresi zaten kayıtlı")

    merchant = Merchant(
        id=uuid.uuid4(),
        email=body.email,
        password_hash=hash_password(body.password),
        business_name=body.business_name,
        phone=body.phone,
    )
    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)

    access_token = create_access_token(str(merchant.id), merchant.email)
    refresh_token, _ = create_refresh_token(str(merchant.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Merchant).where(Merchant.email == body.email))
    merchant = result.scalar_one_or_none()

    if not merchant or not verify_password(body.password, merchant.password_hash):
        raise UnauthorizedException("Email veya şifre hatalı")

    if not merchant.is_active or merchant.deleted_at:
        raise UnauthorizedException("Hesap pasif veya silinmiş")

    access_token = create_access_token(str(merchant.id), merchant.email)
    refresh_token, _ = create_refresh_token(str(merchant.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    if not refresh_token:
        raise UnauthorizedException("Refresh token bulunamadı")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise UnauthorizedException("Geçersiz refresh token")

    jti = payload.get("jti")
    if jti and await redis.exists(f"BLACKLIST:{jti}"):
        raise UnauthorizedException("Token iptal edilmiş, tekrar giriş yapınız")

    merchant_id = payload.get("sub")
    merchant = await db.get(Merchant, merchant_id)
    if not merchant or not merchant.is_active:
        raise UnauthorizedException()

    access_token = create_access_token(str(merchant.id), merchant.email)
    new_refresh_token, _ = create_refresh_token(str(merchant.id))

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    redis: aioredis.Redis = Depends(get_redis),
):
    if refresh_token:
        payload = decode_token(refresh_token)
        if payload:
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                ttl = int(exp - datetime.now(timezone.utc).timestamp())
                if ttl > 0:
                    await redis.setex(f"BLACKLIST:{jti}", ttl, "1")
    response.delete_cookie("refresh_token")
