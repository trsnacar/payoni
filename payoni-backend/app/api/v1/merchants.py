from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_merchant
from app.models.merchant import Merchant
from app.schemas.merchant import MerchantResponse, MerchantUpdateRequest, WebhookSettingsRequest, ChangePasswordRequest
from app.core.security import verify_password, hash_password

router = APIRouter(prefix="/merchants", tags=["Merchants"])


@router.get("/me", response_model=MerchantResponse)
async def get_me(merchant: Merchant = Depends(get_current_merchant)):
    return merchant


@router.put("/me", response_model=MerchantResponse)
async def update_me(
    body: MerchantUpdateRequest,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    if body.business_name is not None:
        merchant.business_name = body.business_name
    if body.phone is not None:
        merchant.phone = body.phone
    if body.tax_id is not None:
        merchant.tax_id = body.tax_id
    await db.commit()
    await db.refresh(merchant)
    return merchant


@router.put("/me/webhook", response_model=MerchantResponse)
async def update_webhook(
    body: WebhookSettingsRequest,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    merchant.webhook_url = body.webhook_url
    merchant.webhook_secret = body.webhook_secret
    await db.commit()
    await db.refresh(merchant)
    return merchant


@router.put("/me/password")
async def change_password(
    body: ChangePasswordRequest,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, merchant.password_hash):
        raise HTTPException(status_code=400, detail="Mevcut şifre yanlış")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Yeni şifre en az 8 karakter olmalıdır")
    merchant.password_hash = hash_password(body.new_password)
    await db.commit()
    return {"message": "Şifre başarıyla güncellendi"}
