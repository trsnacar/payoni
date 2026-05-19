import uuid
from typing import Optional

from sqlalchemy import String, SmallInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class PaymentAttempt(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payment_attempts"

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pos_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pos_accounts.id"), nullable=False
    )
    attempt_number: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    status: Mapped[Optional[str]] = mapped_column(String(30))
    gateway_response: Mapped[Optional[dict]] = mapped_column(JSONB)
    error_code: Mapped[Optional[str]] = mapped_column(String(50))

    transaction: Mapped["Transaction"] = relationship(back_populates="attempts")
