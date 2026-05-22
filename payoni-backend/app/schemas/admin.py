from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.merchant import MerchantDocumentResponse


class AdminMerchantList(BaseModel):
    id: UUID
    email: str
    business_name: str
    company_type: Optional[str]
    onboarding_status: str
    is_verified: bool
    is_active: bool
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminMerchantDetail(AdminMerchantList):
    tax_id: Optional[str]
    phone: Optional[str]
    tax_office: Optional[str]
    trade_registry_no: Optional[str]
    company_address: Optional[str]
    authorized_name: Optional[str]
    authorized_title: Optional[str]
    authorized_phone: Optional[str]
    documents: List[MerchantDocumentResponse] = []


class AdminStatsResponse(BaseModel):
    pending: int
    under_review: int
    approved: int
    rejected: int
    total: int


class RejectRequest(BaseModel):
    reason: str


class DocumentStatusRequest(BaseModel):
    status: Literal["approved", "rejected"]
    reason: Optional[str] = None
