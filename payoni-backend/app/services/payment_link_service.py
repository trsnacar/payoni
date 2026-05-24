import uuid
from datetime import datetime, timezone
from typing import Optional

from nanoid import generate
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.merchant import Merchant
from app.models.payment_link import PaymentLink
from app.models.pos_account import PosAccount
from app.schemas.payment_link import PaymentLinkCreate, PublicPaymentLinkResponse
from app.schemas.payment import ChargeRequest, ChargeResponse
from app.core.exceptions import NotFoundException, ValidationException
from app.services.payment_service import PaymentService


_NANOID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"


class PaymentLinkService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, merchant: Merchant, req: PaymentLinkCreate) -> PaymentLink:
        short_code = await self._generate_unique_code()
        link = PaymentLink(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            short_code=short_code,
            title=req.title,
            description=req.description,
            amount=req.amount,
            currency=req.currency,
            min_amount=req.min_amount,
            max_amount=req.max_amount,
            preferred_pos_id=req.preferred_pos_id,
            allow_installments=req.allow_installments,
            max_uses=req.max_uses,
            expires_at=req.expires_at,
            redirect_url=req.redirect_url,
            custom_fields=req.custom_fields,
        )
        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def resolve_public(self, short_code: str) -> PublicPaymentLinkResponse:
        link = await self._get_active_link(short_code)
        merchant = await self.db.get(Merchant, link.merchant_id)

        is_available = (
            link.is_active
            and (link.expires_at is None or link.expires_at > datetime.now(timezone.utc))
            and (link.max_uses is None or link.use_count < link.max_uses)
        )

        return PublicPaymentLinkResponse(
            title=link.title,
            description=link.description,
            amount=link.amount,
            currency=link.currency,
            min_amount=link.min_amount,
            max_amount=link.max_amount,
            allow_installments=link.allow_installments,
            merchant_name=merchant.business_name if merchant else "Merchant",
            custom_fields=link.custom_fields,
            is_available=is_available,
            expires_at=link.expires_at,
        )

    async def charge_via_link(
        self,
        short_code: str,
        req: ChargeRequest,
        customer_ip: Optional[str] = None,
    ) -> ChargeResponse:
        link = await self._get_active_link(short_code)

        # Tutar validasyonu
        if link.amount is not None:
            req.amount = link.amount
        elif link.min_amount and req.amount < link.min_amount:
            raise ValidationException(f"Minimum tutar: {link.min_amount}")
        elif link.max_amount and req.amount > link.max_amount:
            raise ValidationException(f"Maksimum tutar: {link.max_amount}")

        # POS çözümle
        if link.preferred_pos_id:
            req.pos_account_id = link.preferred_pos_id

        merchant = await self.db.get(Merchant, link.merchant_id)
        if not merchant:
            raise NotFoundException("Merchant bulunamadı")

        payment_service = PaymentService(self.db)
        result = await payment_service.charge(
            merchant, req, customer_ip=customer_ip, payment_link_id=link.id
        )

        # Kullanım sayısını atomik artır
        await self.db.execute(
            update(PaymentLink)
            .where(PaymentLink.id == link.id)
            .values(use_count=PaymentLink.use_count + 1)
        )
        await self.db.commit()

        return result

    async def _get_active_link(self, short_code: str) -> PaymentLink:
        result = await self.db.execute(
            select(PaymentLink).where(PaymentLink.short_code == short_code)
        )
        link = result.scalar_one_or_none()
        if not link:
            raise NotFoundException("Ödeme linki bulunamadı")
        if not link.is_active:
            raise ValidationException("Bu ödeme linki artık aktif değil")
        if link.expires_at and link.expires_at < datetime.now(timezone.utc):
            raise ValidationException("Bu ödeme linkinin süresi dolmuş")
        if link.max_uses and link.use_count >= link.max_uses:
            raise ValidationException("Bu ödeme linki maksimum kullanım sayısına ulaştı")
        return link

    async def _generate_unique_code(self) -> str:
        for _ in range(5):
            code = generate(_NANOID_ALPHABET, 10)
            result = await self.db.execute(
                select(PaymentLink).where(PaymentLink.short_code == code)
            )
            if not result.scalar_one_or_none():
                return code
        raise RuntimeError("Benzersiz short code üretilemedi")
