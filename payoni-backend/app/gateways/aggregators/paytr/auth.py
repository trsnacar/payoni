"""
PayTR hash hesaplama:
merchant_key, merchant_salt, merchant_id kombinasyonuyla hash üretilir.
"""
import base64
import hashlib
import hmac


def calculate_hash(
    merchant_id: str,
    user_ip: str,
    merchant_oid: str,
    email: str,
    payment_amount: str,
    currency: str,
    test_mode: str,
    non_3d: str,
    merchant_key: str,
    merchant_salt: str,
) -> str:
    hash_str = (
        merchant_id + user_ip + merchant_oid + email +
        payment_amount + currency + test_mode + non_3d +
        merchant_salt
    )
    return base64.b64encode(
        hmac.new(
            merchant_key.encode("utf-8"),
            hash_str.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("utf-8")
