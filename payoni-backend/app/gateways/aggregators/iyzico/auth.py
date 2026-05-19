"""
iyzico HMACSHA256 imzalama:
Authorization: IYZWSv2 base64(apiKey:{api_key}&randomKey:{rnd}&signature:{hmac})
signature = base64(HMACSHA256(randomKey + uri_path + request_body_as_string, secretKey))
"""
import base64
import hashlib
import hmac
import json
import uuid


def build_authorization_header(
    api_key: str,
    secret_key: str,
    uri_path: str,
    request_body: dict,
) -> dict:
    random_key = str(uuid.uuid4()).replace("-", "")[:8]
    body_str = json.dumps(request_body, separators=(",", ":"), ensure_ascii=False)

    signature_data = f"{random_key}{uri_path}{body_str}"
    signature = base64.b64encode(
        hmac.new(
            secret_key.encode("utf-8"),
            signature_data.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("utf-8")

    auth_value = base64.b64encode(
        f"apiKey:{api_key}&randomKey:{random_key}&signature:{signature}".encode("utf-8")
    ).decode("utf-8")

    return {
        "Authorization": f"IYZWSv2 {auth_value}",
        "x-iyzi-rnd": random_key,
        "Content-Type": "application/json",
    }
