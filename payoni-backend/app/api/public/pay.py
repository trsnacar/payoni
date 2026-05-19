from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.payment_link import PublicPaymentLinkResponse
from app.schemas.payment import ChargeRequest, ChargeResponse
from app.services.payment_link_service import PaymentLinkService

router = APIRouter(prefix="/pay", tags=["Public Payment"])


@router.get("/{short_code}", response_model=PublicPaymentLinkResponse)
async def resolve_payment_link(
    short_code: str,
    db: AsyncSession = Depends(get_db),
):
    service = PaymentLinkService(db)
    return await service.resolve_public(short_code)


@router.post("/{short_code}/charge", response_model=ChargeResponse)
async def charge_via_link(
    short_code: str,
    body: ChargeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    service = PaymentLinkService(db)
    customer_ip = request.client.host if request.client else None
    return await service.charge_via_link(short_code, body, customer_ip=customer_ip)
