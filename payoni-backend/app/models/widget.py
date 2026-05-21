import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Boolean, Numeric, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Widget(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "widgets"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    preferred_pos_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pos_accounts.id"), nullable=True
    )

    # Sadece bu origin'lerden gelen istekler kabul edilir
    allowed_origins: Mapped[Optional[list]] = mapped_column(ARRAY(String), default=[])

    theme: Mapped[Optional[dict]] = mapped_column(JSONB, default={})
    # NULL = embed parametresinden alınır
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2))
    allow_installments: Mapped[bool] = mapped_column(Boolean, default=True)
    commission_passthrough: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Taksit yönlendirme kuralları
    # Format: [{"pos_account_id": "uuid", "installments": [1, 2, 3]}]
    installment_rules: Mapped[Optional[list]] = mapped_column(JSONB, default=[])

    merchant: Mapped["Merchant"] = relationship(back_populates="widgets")
    preferred_pos: Mapped[Optional["PosAccount"]] = relationship(foreign_keys=[preferred_pos_id])
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="widget")
