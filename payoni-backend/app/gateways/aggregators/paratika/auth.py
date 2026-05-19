"""
Paratika (Asseco) kimlik doğrulama.
HMAC-SHA256 imzası: base64(HMACSHA256(merchant_id + amount + currency + order_id + timestamp, secret_key))
"""
import hmac
import hashlib
import base64
import time


def build_hash(merchant_id: str, amount: str, currency: str, order_id: str, secret_key: str) -> str:
    timestamp = str(int(time.time() * 1000))
    raw = f"{merchant_id}{amount}{currency}{order_id}{timestamp}"
    sig = hmac.new(secret_key.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(sig).decode("utf-8"), timestamp


def build_headers(merchant_id: str, api_key: str) -> dict:
    return {
        "Content-Type": "application/json",
        "merchant-id": merchant_id,
        "api-key": api_key,
    }
