import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_merchant
from app.core.exceptions import NotFoundException
from app.models.merchant import Merchant
from app.models.payment_link import PaymentLink
from app.schemas.payment_link import (
    PaymentLinkCreate, PaymentLinkUpdate, PaymentLinkResponse
)
from app.services.payment_link_service import PaymentLinkService
from app.config import settings

router = APIRouter(prefix="/payment-links", tags=["Payment Links"])


@router.get("", response_model=list[PaymentLinkResponse])
async def list_payment_links(
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaymentLink)
        .where(PaymentLink.merchant_id == merchant.id)
        .order_by(PaymentLink.created_at.desc())
    )
    links = result.scalars().all()
    return [_enrich_link(link) for link in links]


@router.post("", response_model=PaymentLinkResponse, status_code=201)
async def create_payment_link(
    body: PaymentLinkCreate,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentLinkService(db)
    link = await service.create(merchant, body)
    return _enrich_link(link)


@router.get("/{link_id}", response_model=PaymentLinkResponse)
async def get_payment_link(
    link_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    link = await _get_link_or_404(link_id, merchant.id, db)
    return _enrich_link(link)


@router.put("/{link_id}", response_model=PaymentLinkResponse)
async def update_payment_link(
    link_id: uuid.UUID,
    body: PaymentLinkUpdate,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    link = await _get_link_or_404(link_id, merchant.id, db)
    if body.title is not None:
        link.title = body.title
    if body.description is not None:
        link.description = body.description
    if body.amount is not None:
        link.amount = body.amount
    if body.is_active is not None:
        link.is_active = body.is_active
    if body.expires_at is not None:
        link.expires_at = body.expires_at
    if body.max_uses is not None:
        link.max_uses = body.max_uses
    await db.commit()
    await db.refresh(link)
    return _enrich_link(link)


@router.delete("/{link_id}", status_code=204)
async def delete_payment_link(
    link_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    link = await _get_link_or_404(link_id, merchant.id, db)
    await db.delete(link)
    await db.commit()


async def _get_link_or_404(link_id: uuid.UUID, merchant_id: uuid.UUID, db: AsyncSession) -> PaymentLink:
    result = await db.execute(
        select(PaymentLink).where(
            PaymentLink.id == link_id,
            PaymentLink.merchant_id == merchant_id,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise NotFoundException("Ödeme linki bulunamadı")
    return link


def _enrich_link(link: PaymentLink) -> dict:
    data = PaymentLinkResponse.model_validate(link)
    data.url = f"{settings.FRONTEND_URL}/pay/{link.short_code}"
    return data
