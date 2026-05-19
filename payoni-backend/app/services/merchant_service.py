"""Merchant profil güncelleme ve webhook ayarları servisi."""
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.merchant import Merchant
from app.schemas.merchant import MerchantUpdate
from app.core.security import hash_password, verify_password
from app.core.exceptions import AppError


class MerchantService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, merchant_id: str) -> Merchant:
        result = await self.db.execute(select(Merchant).where(Merchant.id == merchant_id))
        merchant = result.scalar_one_or_none()
        if not merchant:
            raise AppError(404, "Merchant bulunamadı")
        return merchant

    async def update(self, merchant: Merchant, data: MerchantUpdate) -> Merchant:
        if data.business_name is not None:
            merchant.business_name = data.business_name
        if data.webhook_url is not None:
            merchant.webhook_url = data.webhook_url
        if data.email is not None:
            merchant.email = data.email

        await self.db.commit()
        await self.db.refresh(merchant)
        return merchant

    async def change_password(self, merchant: Merchant, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, merchant.password_hash):
            raise AppError(400, "Mevcut şifre yanlış")
        merchant.password_hash = hash_password(new_password)
        await self.db.commit()

    async def rotate_webhook_secret(self, merchant: Merchant) -> str:
        new_secret = secrets.token_hex(32)
        merchant.webhook_secret = new_secret
        await self.db.commit()
        return new_secret
