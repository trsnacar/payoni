"""Payoni DTO <-> MorPara API alan eşlemesi."""
import uuid
from decimal import Decimal
from app.gateways.dto import SaleDTO


def generate_conversation_id() -> str:
    """Tam olarak 20 alfanümerik karakter (MorPara zorunluluğu)."""
    return uuid.uuid4().hex[:20].upper()


def to_morpara_payment(dto: SaleDTO, conversation_id: str) -> dict:
    return {
        "ConversationId": conversation_id,
        "OrderId": dto.order_id,
        "Amount": str(dto.amount),
        "Currency": dto.currency,
        "Installment": dto.installments,
        "CardHolderName": dto.card.holder_name,
        "CardNumber": dto.card.number,
        "ExpireMonth": dto.card.exp_month,
        "ExpireYear": dto.card.exp_year,
        "Cvc": dto.card.cvv,
        "Email": dto.customer.email,
        "Name": dto.customer.name,
        "Phone": dto.customer.phone or "",
        "IdentityNumber": dto.customer.identity_number or "11111111111",
        "IpAddress": dto.customer.ip or "127.0.0.1",
        "Description": dto.description or "",
    }


def to_morpara_3d_init(dto: SaleDTO, conversation_id: str, callback_url: str) -> dict:
    payload = to_morpara_payment(dto, conversation_id)
    payload["CallbackUrl"] = callback_url
    return payload


def from_morpara_response(raw: dict, order_id: str = None):
    success = raw.get("IsSuccess", False) or raw.get("Status") == "success"
    return {
        "success": success,
        "gateway_tx_id": raw.get("TransactionId") or raw.get("Id"),
        "gateway_ref": raw.get("ConversationId") or order_id,
        "error_code": str(raw.get("ErrorCode", "")) if not success else None,
        "error_message": raw.get("ErrorMessage") or raw.get("Message") if not success else None,
        "raw_response": raw,
    }
