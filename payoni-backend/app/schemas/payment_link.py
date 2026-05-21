from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional, Any

from pydantic import BaseModel


class PaymentLinkCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: str = "TRY"
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    preferred_pos_id: Optional[UUID] = None
    allow_installments: bool = True
    commission_passthrough: bool = False
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None
    redirect_url: Optional[str] = None
    custom_fields: list[dict] = []


class PaymentLinkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None


class PaymentLinkResponse(BaseModel):
    id: UUID
    short_code: str
    title: Optional[str]
    description: Optional[str]
    amount: Optional[Decimal]
    currency: str
    min_amount: Optional[Decimal]
    max_amount: Optional[Decimal]
    allow_installments: bool
    commission_passthrough: bool
    max_uses: Optional[int]
    use_count: int
    expires_at: Optional[datetime]
    is_active: bool
    redirect_url: Optional[str]
    custom_fields: Optional[list]
    url: str  # tam URL
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicPaymentLinkResponse(BaseModel):
    """Müşteriye gösterilen (merchant bilgisi içermeyen) link verisi."""
    title: Optional[str]
    description: Optional[str]
    amount: Optional[Decimal]
    currency: str
    min_amount: Optional[Decimal]
    max_amount: Optional[Decimal]
    allow_installments: bool
    commission_passthrough: bool
    preferred_pos_id: Optional[UUID] = None
    merchant_name: str
    custom_fields: Optional[list]
    is_available: bool
    expires_at: Optional[datetime]
