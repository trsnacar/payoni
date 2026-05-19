import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, SmallInteger, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class WebhookLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "webhook_logs"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False, index=True
    )
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True, index=True
    )

    # 'inbound' = provider'dan gelen | 'outbound' = merchant'a giden
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    provider_slug: Mapped[Optional[str]] = mapped_column(String(50))

    http_method: Mapped[Optional[str]] = mapped_column(String(10))
    url: Mapped[Optional[str]] = mapped_column(String(512))
    headers: Mapped[Optional[dict]] = mapped_column(JSONB)
    payload: Mapped[Optional[dict]] = mapped_column(JSONB)
    raw_body: Mapped[Optional[str]] = mapped_column(Text)
    http_status: Mapped[Optional[int]] = mapped_column(SmallInteger)
    response_body: Mapped[Optional[str]] = mapped_column(Text)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    retry_count: Mapped[int] = mapped_column(SmallInteger, default=0)

    merchant: Mapped["Merchant"] = relationship()
    transaction: Mapped[Optional["Transaction"]] = relationship(back_populates="webhook_logs")
