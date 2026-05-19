import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Merchant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "merchants"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    tax_id: Mapped[Optional[str]] = mapped_column(String(20))
    phone: Mapped[Optional[str]] = mapped_column(String(20))

    webhook_url: Mapped[Optional[str]] = mapped_column(String(512))
    webhook_secret: Mapped[Optional[str]] = mapped_column(String(128))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    plan: Mapped[str] = mapped_column(String(50), default="free")

    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    api_keys: Mapped[List["ApiKey"]] = relationship(back_populates="merchant", cascade="all, delete-orphan")
    pos_accounts: Mapped[List["PosAccount"]] = relationship(back_populates="merchant", cascade="all, delete-orphan")
    transactions: Mapped[List["Transaction"]] = relationship(back_populates="merchant")
    payment_links: Mapped[List["PaymentLink"]] = relationship(back_populates="merchant", cascade="all, delete-orphan")
    widgets: Mapped[List["Widget"]] = relationship(back_populates="merchant", cascade="all, delete-orphan")
