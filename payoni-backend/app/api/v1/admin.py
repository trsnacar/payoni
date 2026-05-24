from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_current_superuser
from app.tasks.email_tasks import send_approval_email, send_rejection_email
from app.models.merchant import Merchant
from app.models.merchant_document import MerchantDocument
from app.core.exceptions import NotFoundException
from app.schemas.admin import (
    AdminMerchantList,
    AdminMerchantDetail,
    AdminStatsResponse,
    RejectRequest,
    DocumentStatusRequest,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    _: Merchant = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(Merchant.onboarding_status, func.count(Merchant.id))
        .where(Merchant.deleted_at.is_(None))
        .group_by(Merchant.onboarding_status)
    )
    counts = {r[0]: r[1] for r in rows}
    total_row = await db.execute(
        select(func.count(Merchant.id)).where(Merchant.deleted_at.is_(None))
    )
    return AdminStatsResponse(
        pending=counts.get("pending_documents", 0),
        under_review=counts.get("under_review", 0),
        approved=counts.get("approved", 0),
        rejected=counts.get("rejected", 0),
        total=total_row.scalar_one_or_none() or 0,
    )


@router.get("/merchants", response_model=List[AdminMerchantList])
async def list_merchants(
    status: Optional[str] = Query(None, description="onboarding_status filtresi"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: Merchant = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
):
    q = select(Merchant).where(Merchant.deleted_at.is_(None))
    if status:
        q = q.where(Merchant.onboarding_status == status)
    q = q.order_by(Merchant.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/merchants/{merchant_id}", response_model=AdminMerchantDetail)
async def get_merchant(
    merchant_id: UUID,
    _: Merchant = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Merchant)
        .options(selectinload(Merchant.documents))
        .where(Merchant.id == merchant_id, Merchant.deleted_at.is_(None))
    )
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise NotFoundException("Merchant bulunamadı")
    return merchant


@router.put("/merchants/{merchant_id}/approve", response_model=AdminMerchantDetail)
async def approve_merchant(
    merchant_id: UUID,
    _: Merchant = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Merchant)
        .options(selectinload(Merchant.documents))
        .where(Merchant.id == merchant_id, Merchant.deleted_at.is_(None))
    )
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise NotFoundException("Merchant bulunamadı")

    merchant.is_verified = True
    merchant.onboarding_status = "approved"
    for doc in merchant.documents:
        if doc.status == "pending":
            doc.status = "approved"

    await db.commit()
    await db.refresh(merchant)
    send_approval_email.delay(merchant.email, merchant.business_name)
    return merchant


@router.put("/merchants/{merchant_id}/reject", response_model=AdminMerchantDetail)
async def reject_merchant(
    merchant_id: UUID,
    body: RejectRequest,
    _: Merchant = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Merchant)
        .options(selectinload(Merchant.documents))
        .where(Merchant.id == merchant_id, Merchant.deleted_at.is_(None))
    )
    merchant = result.scalar_one_or_none()
    if not merchant:
        raise NotFoundException("Merchant bulunamadı")

    merchant.is_verified = False
    merchant.onboarding_status = "rejected"
    await db.commit()
    await db.refresh(merchant)
    send_rejection_email.delay(merchant.email, merchant.business_name, body.reason)
    return merchant


@router.put("/documents/{document_id}/status")
async def update_document_status(
    document_id: UUID,
    body: DocumentStatusRequest,
    _: Merchant = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(MerchantDocument, document_id)
    if not doc:
        raise NotFoundException("Belge bulunamadı")

    doc.status = body.status
    doc.rejection_reason = body.reason if body.status == "rejected" else None
    await db.commit()
    return {"id": str(doc.id), "status": doc.status}
