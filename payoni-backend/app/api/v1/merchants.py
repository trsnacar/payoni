import os
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_merchant
from app.models.merchant import Merchant
from app.models.merchant_document import MerchantDocument
from app.schemas.merchant import (
    MerchantResponse, MerchantUpdateRequest, WebhookSettingsRequest,
    ChangePasswordRequest, MerchantDocumentResponse,
)
from app.core.security import verify_password, hash_password
from app.config import settings

ALLOWED_DOC_TYPES = {"tax_plate", "signature_circular", "id_front", "id_back", "trade_registry"}
REQUIRED_DOC_TYPES = ALLOWED_DOC_TYPES
ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/jpg"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

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


@router.post("/me/documents", response_model=MerchantDocumentResponse, status_code=201)
async def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    if document_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Geçersiz belge türü: {document_type}")
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Sadece PDF, JPG ve PNG dosyaları kabul edilir")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Dosya boyutu 10 MB'ı aşamaz")

    merchant_dir = os.path.join("uploads", str(merchant.id))
    os.makedirs(merchant_dir, exist_ok=True)

    ext = (file.filename or "file").rsplit(".", 1)[-1].lower()
    filename = f"{document_type}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = os.path.join(merchant_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Aynı türde varsa güncelle
    existing = await db.execute(
        select(MerchantDocument).where(
            MerchantDocument.merchant_id == merchant.id,
            MerchantDocument.document_type == document_type,
        )
    )
    existing_doc = existing.scalar_one_or_none()
    if existing_doc:
        # Eski dosyayı sil
        if os.path.exists(existing_doc.file_path):
            os.remove(existing_doc.file_path)
        existing_doc.file_path = file_path
        existing_doc.original_filename = file.filename or filename
        existing_doc.mime_type = file.content_type
        existing_doc.file_size = len(content)
        existing_doc.status = "pending"
        existing_doc.uploaded_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing_doc)
        doc = existing_doc
    else:
        doc = MerchantDocument(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            document_type=document_type,
            file_path=file_path,
            original_filename=file.filename or filename,
            mime_type=file.content_type,
            file_size=len(content),
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

    # Tüm zorunlu belgeler yüklendiyse durumu güncelle
    uploaded = await db.execute(
        select(MerchantDocument.document_type).where(MerchantDocument.merchant_id == merchant.id)
    )
    uploaded_types = {r[0] for r in uploaded.fetchall()}
    if REQUIRED_DOC_TYPES.issubset(uploaded_types):
        merchant.onboarding_status = "under_review"
        await db.commit()

    return doc


@router.get("/me/documents", response_model=List[MerchantDocumentResponse])
async def list_documents(
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MerchantDocument).where(MerchantDocument.merchant_id == merchant.id)
    )
    return result.scalars().all()
