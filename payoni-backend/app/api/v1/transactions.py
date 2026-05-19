import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io

from app.dependencies import get_db, get_current_merchant
from app.models.merchant import Merchant
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionResponse, TransactionListResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    filters = [Transaction.merchant_id == merchant.id]
    if status:
        filters.append(Transaction.status == status)
    if date_from:
        filters.append(Transaction.created_at >= datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc))
    if date_to:
        next_day = date_to + timedelta(days=1)
        filters.append(Transaction.created_at < datetime(next_day.year, next_day.month, next_day.day, tzinfo=timezone.utc))
    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                Transaction.customer_email.ilike(term),
                Transaction.customer_name.ilike(term),
                Transaction.gateway_tx_id.ilike(term),
            )
        )

    total_result = await db.execute(
        select(func.count()).where(and_(*filters))
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Transaction)
        .where(and_(*filters))
        .order_by(Transaction.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = result.scalars().all()

    return TransactionListResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/export")
async def export_transactions(
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.merchant_id == merchant.id)
        .order_by(Transaction.created_at.desc())
        .limit(10000)
    )
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Tutar", "Para Birimi", "Taksit", "Durum",
        "Kart Son 4", "Kart Markası", "3D Secure",
        "Müşteri Adı", "Müşteri Email",
        "Gateway TX ID", "Gateway Ref",
        "İade Tutarı", "Açıklama", "Tarih",
    ])
    for tx in transactions:
        writer.writerow([
            str(tx.id),
            tx.amount,
            tx.currency,
            tx.installments or 1,
            tx.status,
            tx.card_last4 or "",
            tx.card_brand or "",
            "Evet" if tx.is_3d else "Hayır",
            tx.customer_name or "",
            tx.customer_email or "",
            tx.gateway_tx_id or "",
            tx.gateway_ref or "",
            tx.refunded_amount or "",
            tx.description or "",
            tx.created_at.isoformat(),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.merchant_id == merchant.id,
        )
    )
    tx = result.scalar_one_or_none()
    if not tx:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("İşlem bulunamadı")
    return tx
