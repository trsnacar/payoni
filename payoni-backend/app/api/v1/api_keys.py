import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.dependencies import get_db, get_current_merchant
from app.core.exceptions import NotFoundException
from app.core.security import generate_api_key
from app.models.merchant import Merchant
from app.models.api_key import ApiKey

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


class ApiKeyCreate(BaseModel):
    name: Optional[str] = None


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    key_prefix: str
    name: Optional[str]
    is_active: bool
    last_used_at: Optional[str] = None
    created_at: str

    model_config = {"from_attributes": True}


class ApiKeyCreatedResponse(ApiKeyResponse):
    full_key: str  # Sadece oluşturulunca gösterilir


@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.merchant_id == merchant.id, ApiKey.is_active == True)
        .order_by(ApiKey.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_api_key(
    body: ApiKeyCreate,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    full_key, key_hash, key_prefix = generate_api_key()
    api_key = ApiKey(
        id=uuid.uuid4(),
        merchant_id=merchant.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=body.name,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return ApiKeyCreatedResponse(
        id=api_key.id,
        key_prefix=api_key.key_prefix,
        name=api_key.name,
        is_active=api_key.is_active,
        created_at=api_key.created_at.isoformat(),
        full_key=full_key,
    )


@router.delete("/{key_id}", status_code=204)
async def delete_api_key(
    key_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.merchant_id == merchant.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise NotFoundException("API anahtarı bulunamadı")
    key.is_active = False
    await db.commit()
