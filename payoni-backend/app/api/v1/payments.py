import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_merchant
from app.models.merchant import Merchant
from app.schemas.payment import ChargeRequest, ChargeResponse, ThreeDCompleteRequest, RefundRequest
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/charge", response_model=ChargeResponse)
async def charge(
    body: ChargeRequest,
    request: Request,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    customer_ip = request.client.host if request.client else None
    if body.customer.ip:
        customer_ip = body.customer.ip
    return await service.charge(merchant, body, customer_ip=customer_ip)


@router.post("/3d/init", response_model=ChargeResponse)
async def init_3d(
    body: ChargeRequest,
    request: Request,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    body.use_3d = True
    service = PaymentService(db)
    customer_ip = request.client.host if request.client else None
    return await service.charge(merchant, body, customer_ip=customer_ip)


@router.post("/{transaction_id}/cancel", response_model=ChargeResponse)
async def cancel_payment(
    transaction_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    return await service.cancel(merchant, transaction_id)


@router.post("/{transaction_id}/refund", response_model=ChargeResponse)
async def refund_payment(
    transaction_id: uuid.UUID,
    body: RefundRequest,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    return await service.refund(merchant, transaction_id, body)


@router.get("/bin/{bin_number}")
async def query_bin(
    bin_number: str,
    pos_account_id: Optional[uuid.UUID] = None,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    return await service.bin_query(merchant, bin_number, pos_account_id)


@router.get("/installments")
async def query_installments(
    bin_number: str,
    amount: float,
    pos_account_id: Optional[uuid.UUID] = None,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = PaymentService(db)
    return await service.installment_query(merchant, bin_number, amount, pos_account_id)
