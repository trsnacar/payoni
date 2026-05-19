"""Payoni DTO <-> iyzico JSON alan eşlemesi."""
from decimal import Decimal
from app.gateways.dto import SaleDTO, CancelDTO, RefundDTO, BinQueryDTO, InstallmentQueryDTO


def to_iyzico_payment(dto: SaleDTO, locale: str = "tr") -> dict:
    return {
        "locale": locale,
        "conversationId": dto.order_id,
        "price": str(dto.amount),
        "paidPrice": str(dto.amount),
        "currency": dto.currency,
        "installment": dto.installments,
        "basketId": dto.order_id,
        "paymentGroup": "PRODUCT",
        "paymentCard": {
            "cardHolderName": dto.card.holder_name,
            "cardNumber": dto.card.number,
            "expireMonth": dto.card.exp_month,
            "expireYear": dto.card.exp_year,
            "cvc": dto.card.cvv,
            "registerCard": "0",
        },
        "buyer": {
            "id": dto.customer.email,
            "name": dto.customer.name.split()[0] if dto.customer.name else "",
            "surname": " ".join(dto.customer.name.split()[1:]) if len(dto.customer.name.split()) > 1 else dto.customer.name,
            "gsmNumber": dto.customer.phone or "",
            "email": dto.customer.email,
            "identityNumber": dto.customer.identity_number or "11111111111",
            "registrationAddress": dto.customer.address or "Türkiye",
            "ip": dto.customer.ip or "127.0.0.1",
            "city": dto.customer.city or "Istanbul",
            "country": dto.customer.country,
        },
        "shippingAddress": {
            "contactName": dto.customer.name,
            "city": dto.customer.city or "Istanbul",
            "country": dto.customer.country,
            "address": dto.customer.address or "Türkiye",
        },
        "billingAddress": {
            "contactName": dto.customer.name,
            "city": dto.customer.city or "Istanbul",
            "country": dto.customer.country,
            "address": dto.customer.address or "Türkiye",
        },
        "basketItems": [
            {
                "id": dto.order_id,
                "name": dto.description or "Ödeme",
                "category1": "Genel",
                "itemType": "VIRTUAL",
                "price": str(dto.amount),
            }
        ],
    }


def to_iyzico_3d_init(dto: SaleDTO, callback_url: str, locale: str = "tr") -> dict:
    payload = to_iyzico_payment(dto, locale)
    payload["callbackUrl"] = callback_url
    return payload


def from_iyzico_response(raw: dict, order_id: str = None):
    """Normalizes iyzico response to GatewayResponse fields."""
    status = raw.get("status", "")
    success = status == "success"
    return {
        "success": success,
        "gateway_tx_id": raw.get("paymentId"),
        "gateway_ref": raw.get("conversationId") or order_id,
        "error_code": raw.get("errorCode"),
        "error_message": raw.get("errorMessage"),
        "raw_response": raw,
    }


def to_iyzico_cancel(dto: CancelDTO) -> dict:
    return {
        "locale": "tr",
        "conversationId": dto.order_id,
        "paymentId": dto.gateway_tx_id,
        "ip": "127.0.0.1",
    }


def to_iyzico_refund(dto: RefundDTO) -> dict:
    return {
        "locale": "tr",
        "conversationId": dto.order_id,
        "paymentTransactionId": dto.gateway_tx_id,
        "price": str(dto.amount),
        "currency": "TRY",
        "ip": "127.0.0.1",
    }


def to_iyzico_bin_query(dto: BinQueryDTO) -> dict:
    return {"locale": "tr", "binNumber": dto.bin_number}


def to_iyzico_installment_query(dto: InstallmentQueryDTO) -> dict:
    return {
        "locale": "tr",
        "binNumber": dto.bin_number,
        "price": str(dto.amount),
    }
