from decimal import Decimal
from uuid import UUID
from typing import Optional

from pydantic import BaseModel


class CardInput(BaseModel):
    number: str
    holder_name: str
    exp_month: str
    exp_year: str
    cvv: str


class CustomerInput(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    identity_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "TR"
    ip: Optional[str] = None


class ChargeRequest(BaseModel):
    pos_account_id: Optional[UUID] = None
    amount: Decimal
    currency: str = "TRY"
    installments: int = 1
    card: CardInput
    customer: CustomerInput
    description: Optional[str] = None
    use_3d: bool = False
    callback_url: Optional[str] = None  # 3D için zorunlu
    commission_passthrough: bool = False  # True ise amount zaten gross tutardır


class ThreeDCompleteRequest(BaseModel):
    transaction_id: UUID
    provider_data: dict  # provider'dan gelen raw callback verisi


class RefundRequest(BaseModel):
    amount: Optional[Decimal] = None  # None = tam iade
    reason: Optional[str] = None


class ChargeResponse(BaseModel):
    transaction_id: UUID
    status: str
    # 3D Secure için
    redirect_url: Optional[str] = None
    html_content: Optional[str] = None
    # Başarılı ödeme için
    gateway_tx_id: Optional[str] = None
    message: Optional[str] = None
