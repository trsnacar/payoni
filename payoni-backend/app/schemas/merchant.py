from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, EmailStr


class MerchantResponse(BaseModel):
    id: UUID
    email: str
    business_name: str
    tax_id: Optional[str]
    phone: Optional[str]
    company_type: Optional[str] = None
    tax_office: Optional[str] = None
    trade_registry_no: Optional[str] = None
    company_address: Optional[str] = None
    authorized_name: Optional[str] = None
    authorized_title: Optional[str] = None
    authorized_phone: Optional[str] = None
    is_active: bool
    is_verified: bool
    plan: str
    onboarding_status: str = "pending_documents"
    webhook_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class MerchantDocumentResponse(BaseModel):
    id: UUID
    document_type: str
    original_filename: str
    file_size: int
    mime_type: str
    file_path: str
    status: str
    uploaded_at: datetime
    rejection_reason: Optional[str] = None

    model_config = {"from_attributes": True}


class MerchantUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    tax_id: Optional[str] = None


class WebhookSettingsRequest(BaseModel):
    webhook_url: str
    webhook_secret: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
