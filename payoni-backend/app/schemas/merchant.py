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
    is_active: bool
    is_verified: bool
    plan: str
    webhook_url: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class MerchantUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    tax_id: Optional[str] = None


class WebhookSettingsRequest(BaseModel):
    webhook_url: str
    webhook_secret: str
