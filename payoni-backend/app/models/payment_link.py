import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Boolean, Numeric, ForeignKey, Text, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class PaymentLink(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payment_links"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True
    )

    short_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)

    # NULL = müşteri tutarı girer
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="TRY")
    min_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    max_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))

    preferred_pos_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pos_accounts.id"), nullable=True
    )

    allow_installments: Mapped[bool] = mapped_column(Boolean, default=True)
    max_uses: Mapped[Optional[int]] = mapped_column(Integer)
    use_count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    redirect_url: Mapped[Optional[str]] = mapped_column(String(512))
    custom_fields: Mapped[Optional[list]] = mapped_column(JSONB, default=[])

    merchant: Mapped["Merchant"] = relationship(back_populates="payment_links")
    preferred_pos: Mapped[Optional["PosAccount"]] = relationship(foreign_keys=[preferred_pos_id])
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="payment_link")
