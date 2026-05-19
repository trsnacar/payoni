import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_merchant
from app.core.encryption import encrypt_credentials, decrypt_credentials
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.merchant import Merchant
from app.models.pos_account import PosAccount
from app.schemas.pos_account import (
    PosAccountCreate, PosAccountUpdate,
    PosAccountResponse, PosAccountTestResponse,
)
from app.gateways.factory import GatewayFactory
from app.gateways.exceptions import GatewayError

router = APIRouter(prefix="/pos-accounts", tags=["POS Accounts"])


@router.get("", response_model=list[PosAccountResponse])
async def list_pos_accounts(
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PosAccount).where(
            PosAccount.merchant_id == merchant.id,
            PosAccount.deleted_at == None,
        ).order_by(PosAccount.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=PosAccountResponse, status_code=201)
async def create_pos_account(
    body: PosAccountCreate,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    # Credential şifreleme
    credentials_enc, iv = encrypt_credentials(body.credentials)

    pos = PosAccount(
        id=uuid.uuid4(),
        merchant_id=merchant.id,
        provider_slug=body.provider_slug,
        display_name=body.display_name or body.provider_slug,
        credentials_enc=credentials_enc,
        iv=iv,
        environment=body.environment,
        is_default=body.is_default,
    )

    if body.is_default:
        # Mevcut default'u kaldır
        await db.execute(
            select(PosAccount).where(
                PosAccount.merchant_id == merchant.id,
                PosAccount.is_default == True,
            )
        )
        existing_defaults = await db.execute(
            select(PosAccount).where(
                PosAccount.merchant_id == merchant.id,
                PosAccount.is_default == True,
            )
        )
        for p in existing_defaults.scalars().all():
            p.is_default = False

    db.add(pos)
    await db.commit()
    await db.refresh(pos)
    return pos


@router.get("/{pos_id}", response_model=PosAccountResponse)
async def get_pos_account(
    pos_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    pos = await _get_pos_or_404(pos_id, merchant.id, db)
    return pos


@router.put("/{pos_id}", response_model=PosAccountResponse)
async def update_pos_account(
    pos_id: uuid.UUID,
    body: PosAccountUpdate,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    pos = await _get_pos_or_404(pos_id, merchant.id, db)

    if body.display_name is not None:
        pos.display_name = body.display_name
    if body.credentials is not None:
        credentials_enc, iv = encrypt_credentials(body.credentials)
        pos.credentials_enc = credentials_enc
        pos.iv = iv
    if body.environment is not None:
        pos.environment = body.environment
    if body.is_active is not None:
        pos.is_active = body.is_active
    if body.is_default is not None:
        pos.is_default = body.is_default

    await db.commit()
    await db.refresh(pos)
    return pos


@router.delete("/{pos_id}", status_code=204)
async def delete_pos_account(
    pos_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    pos = await _get_pos_or_404(pos_id, merchant.id, db)
    pos.deleted_at = datetime.now(timezone.utc)
    pos.is_active = False
    await db.commit()


@router.post("/{pos_id}/test", response_model=PosAccountTestResponse)
async def test_pos_account(
    pos_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    pos = await _get_pos_or_404(pos_id, merchant.id, db)
    credentials = decrypt_credentials(pos.credentials_enc, pos.iv)

    try:
        gateway = GatewayFactory.create(pos.provider_slug, credentials, pos.environment)
        result = await gateway.test_connection()
        pos.last_tested_at = datetime.now(timezone.utc)
        pos.last_test_success = result.success
        await db.commit()
        return PosAccountTestResponse(success=result.success, message=result.message)
    except Exception as e:
        pos.last_tested_at = datetime.now(timezone.utc)
        pos.last_test_success = False
        await db.commit()
        return PosAccountTestResponse(success=False, message=str(e))


@router.post("/{pos_id}/set-default", response_model=PosAccountResponse)
async def set_default_pos(
    pos_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    # Tüm POS'ların default'unu kaldır
    all_pos = await db.execute(
        select(PosAccount).where(PosAccount.merchant_id == merchant.id)
    )
    for p in all_pos.scalars().all():
        p.is_default = False

    pos = await _get_pos_or_404(pos_id, merchant.id, db)
    pos.is_default = True
    await db.commit()
    await db.refresh(pos)
    return pos


async def _get_pos_or_404(pos_id: uuid.UUID, merchant_id: uuid.UUID, db: AsyncSession) -> PosAccount:
    result = await db.execute(
        select(PosAccount).where(
            PosAccount.id == pos_id,
            PosAccount.merchant_id == merchant_id,
            PosAccount.deleted_at == None,
        )
    )
    pos = result.scalar_one_or_none()
    if not pos:
        raise NotFoundException("POS hesabı bulunamadı")
    return pos
