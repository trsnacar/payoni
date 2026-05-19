from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class CardDTO(BaseModel):
    number: str
    holder_name: str
    exp_month: str
    exp_year: str
    cvv: str


class CustomerDTO(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    identity_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "TR"
    ip: Optional[str] = None


class SaleDTO(BaseModel):
    order_id: str
    amount: Decimal
    currency: str = "TRY"
    installments: int = 1
    card: CardDTO
    customer: CustomerDTO
    callback_url: Optional[str] = None
    description: Optional[str] = None


class CancelDTO(BaseModel):
    order_id: str
    gateway_tx_id: str
    amount: Decimal


class RefundDTO(BaseModel):
    order_id: str
    gateway_tx_id: str
    amount: Decimal
    reason: Optional[str] = None


class BinQueryDTO(BaseModel):
    bin_number: str


class InstallmentQueryDTO(BaseModel):
    bin_number: str
    amount: Decimal
    currency: str = "TRY"


class TransactionQueryDTO(BaseModel):
    gateway_tx_id: str
    order_id: Optional[str] = None


class ThreeDCompleteDTO(BaseModel):
    order_id: str
    provider_data: dict  # provider'dan gelen ham veri


class GatewayResponse(BaseModel):
    success: bool
    gateway_tx_id: Optional[str] = None
    gateway_ref: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: dict = {}


class ThreeDInitResponse(BaseModel):
    success: bool
    conversation_id: Optional[str] = None  # 3D MD/correlation ID
    redirect_url: Optional[str] = None
    html_content: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class BinQueryResponse(BaseModel):
    bin_number: str
    card_brand: Optional[str] = None
    card_type: Optional[str] = None  # credit/debit
    bank_name: Optional[str] = None
    is_commercial: Optional[bool] = None
    max_installments: Optional[int] = None


class InstallmentOption(BaseModel):
    count: int
    monthly_amount: Decimal
    total_amount: Decimal
    commission_rate: Optional[Decimal] = None


class InstallmentQueryResponse(BaseModel):
    bin_number: str
    installments: list[InstallmentOption] = []


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
