"""
AhlPay kimlik doğrulama.
SHA256(merchant_id + order_id + amount + currency + api_secret) → hex
"""
import hashlib


def build_hash(merchant_id: str, order_id: str, amount: str, currency: str, api_secret: str) -> str:
    raw = merchant_id + order_id + amount + currency + api_secret
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
