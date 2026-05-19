"""
Moka kimlik doğrulama.
CheckKey: SHA256(DealerCode + username + password + "MK")
"""
import hashlib
import base64


def build_check_key(dealer_code: str, username: str, password: str) -> str:
    raw = dealer_code + username + password + "MK"
    digest = hashlib.sha256(raw.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("utf-8")


def build_dealer_auth(dealer_code: str, username: str, password: str) -> dict:
    return {
        "DealerCode": dealer_code,
        "Username": username,
        "Password": password,
        "CheckKey": build_check_key(dealer_code, username, password),
    }
