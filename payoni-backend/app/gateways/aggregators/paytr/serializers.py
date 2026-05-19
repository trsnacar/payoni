"""Payoni DTO <-> PayTR API alan eşlemesi."""
import base64
import json
from decimal import Decimal
from app.gateways.dto import SaleDTO


def to_paytr_iframe_token(
    dto: SaleDTO,
    merchant_id: str,
    merchant_key: str,
    merchant_salt: str,
    merchant_ok_url: str,
    merchant_fail_url: str,
    test_mode: int = 0,
) -> dict:
    user_basket = base64.b64encode(
        json.dumps([
            [dto.description or "Ödeme", str(dto.amount), 1]
        ]).encode("utf-8")
    ).decode("utf-8")

    amount_kurus = str(int(dto.amount * 100))

    return {
        "merchant_id": merchant_id,
        "user_ip": dto.customer.ip or "127.0.0.1",
        "merchant_oid": dto.order_id,
        "email": dto.customer.email,
        "payment_amount": amount_kurus,
        "currency": dto.currency,
        "test_mode": str(test_mode),
        "non_3d": "0",
        "merchant_ok_url": merchant_ok_url,
        "merchant_fail_url": merchant_fail_url,
        "user_name": dto.customer.name,
        "user_address": dto.customer.address or "Türkiye",
        "user_phone": dto.customer.phone or "05000000000",
        "user_basket": user_basket,
        "debug_on": "0",
        "max_installment": str(dto.installments) if dto.installments > 1 else "0",
        "lang": "tr",
    }


def from_paytr_response(raw: dict, order_id: str = None):
    success = raw.get("status") == "success"
    return {
        "success": success,
        "gateway_tx_id": raw.get("payment_id"),
        "gateway_ref": order_id,
        "error_code": raw.get("failed_reason_code"),
        "error_message": raw.get("failed_reason_msg"),
        "raw_response": raw,
    }
