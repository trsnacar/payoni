"""
MorPara SHA256 imzalama:
Tüm request alanlarının değerlerini sırası ile birleştir + API key → SHA256 → Base64
"""
import base64
import hashlib


def build_signature(field_values: list[str], api_key: str) -> str:
    combined = "".join(str(v) for v in field_values) + api_key
    digest = hashlib.sha256(combined.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("utf-8").upper()


def build_headers(client_id: str, signature: str) -> dict:
    return {
        "Content-Type": "application/json",
        "ClientId": client_id,
        "Authorization": f"Bearer {signature}",
    }
