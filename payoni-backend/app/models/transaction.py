import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Boolean, Numeric, ForeignKey, Text, SmallInteger
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Transaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "transactions"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False, index=True
    )
    pos_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pos_accounts.id"), nullable=False
    )
    payment_link_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payment_links.id"), nullable=True
    )
    widget_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("widgets.id"), nullable=True
    )

    # Finansal
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="TRY")
    installments: Mapped[int] = mapped_column(SmallInteger, default=1)

    # Kart (maskelenmiş, tam numara asla saklanmaz)
    card_last4: Mapped[Optional[str]] = mapped_column(String(4))
    card_holder: Mapped[Optional[str]] = mapped_column(String(100))
    card_brand: Mapped[Optional[str]] = mapped_column(String(30))
    bin_number: Mapped[Optional[str]] = mapped_column(String(6))

    # Durum
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)
    gateway_tx_id: Mapped[Optional[str]] = mapped_column(String(255))
    gateway_ref: Mapped[Optional[str]] = mapped_column(String(255))
    gateway_response: Mapped[Optional[dict]] = mapped_column(JSONB)

    # 3D Secure
    is_3d: Mapped[bool] = mapped_column(Boolean, default=False)
    three_d_status: Mapped[Optional[str]] = mapped_column(String(20))
    three_d_md: Mapped[Optional[str]] = mapped_column(Text, index=True)

    # Müşteri
    customer_email: Mapped[Optional[str]] = mapped_column(String(255))
    customer_name: Mapped[Optional[str]] = mapped_column(String(100))
    customer_ip: Mapped[Optional[str]] = mapped_column(String(45))

    # Meta
    description: Mapped[Optional[str]] = mapped_column(Text)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, default={})
    error_code: Mapped[Optional[str]] = mapped_column(String(50))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    refunded_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)

    # Relationships
    merchant: Mapped["Merchant"] = relationship(back_populates="transactions")
    pos_account: Mapped["PosAccount"] = relationship(back_populates="transactions")
    payment_link: Mapped[Optional["PaymentLink"]] = relationship(back_populates="transactions")
    widget: Mapped[Optional["Widget"]] = relationship(back_populates="transactions")
    attempts: Mapped[list["PaymentAttempt"]] = relationship(back_populates="transaction", cascade="all, delete-orphan")
    webhook_logs: Mapped[list["WebhookLog"]] = relationship(back_populates="transaction")
