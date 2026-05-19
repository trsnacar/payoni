from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional

from pydantic import BaseModel


class TransactionResponse(BaseModel):
    id: UUID
    amount: Decimal
    currency: str
    installments: int
    status: str
    card_last4: Optional[str]
    card_brand: Optional[str]
    card_holder: Optional[str]
    customer_email: Optional[str]
    customer_name: Optional[str]
    is_3d: bool
    three_d_status: Optional[str]
    gateway_tx_id: Optional[str]
    gateway_ref: Optional[str]
    error_code: Optional[str]
    error_message: Optional[str]
    refunded_amount: Decimal
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    per_page: int
