from datetime import datetime
from uuid import UUID
from typing import Optional, Any

from pydantic import BaseModel


class PosAccountCreate(BaseModel):
    provider_slug: str
    display_name: Optional[str] = None
    credentials: dict  # provider'a özel credential alanları
    environment: str = "production"
    is_default: bool = False


class PosAccountUpdate(BaseModel):
    display_name: Optional[str] = None
    credentials: Optional[dict] = None
    environment: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class PosAccountResponse(BaseModel):
    id: UUID
    provider_slug: str
    display_name: Optional[str]
    is_active: bool
    is_default: bool
    environment: str
    last_tested_at: Optional[datetime]
    last_test_success: Optional[bool]
    created_at: datetime

    model_config = {"from_attributes": True}


class PosAccountTestResponse(BaseModel):
    success: bool
    message: str
    details: Optional[dict] = None
