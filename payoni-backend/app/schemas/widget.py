from decimal import Decimal
from uuid import UUID
from typing import Optional

from pydantic import BaseModel


class InstallmentRule(BaseModel):
    pos_account_id: UUID
    installments: list[int]  # e.g. [1, 2, 3] or [6, 9, 12]


class WidgetCreate(BaseModel):
    name: str
    preferred_pos_id: Optional[UUID] = None
    allowed_origins: list[str] = []
    theme: dict = {}
    amount: Optional[Decimal] = None
    allow_installments: bool = True
    commission_passthrough: bool = False
    installment_rules: list[InstallmentRule] = []


class WidgetUpdate(BaseModel):
    name: Optional[str] = None
    preferred_pos_id: Optional[UUID] = None
    allowed_origins: Optional[list[str]] = None
    theme: Optional[dict] = None
    amount: Optional[Decimal] = None
    is_active: Optional[bool] = None
    allow_installments: Optional[bool] = None
    commission_passthrough: Optional[bool] = None
    installment_rules: Optional[list[InstallmentRule]] = None


class WidgetResponse(BaseModel):
    id: UUID
    name: str
    preferred_pos_id: Optional[UUID]
    allowed_origins: Optional[list[str]]
    theme: Optional[dict]
    amount: Optional[Decimal]
    allow_installments: bool
    commission_passthrough: bool
    is_active: bool
    installment_rules: Optional[list[dict]]

    model_config = {"from_attributes": True}


class WidgetSnippetResponse(BaseModel):
    widget_id: UUID
    snippet: str
