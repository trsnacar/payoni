"""
Payten (eski Masterpass/MSU) kimlik doğrulama.
Basic Auth: base64(client_id:client_secret)
"""
import base64


def build_basic_auth(client_id: str, client_secret: str) -> str:
    credentials = f"{client_id}:{client_secret}"
    return "Basic " + base64.b64encode(credentials.encode("utf-8")).decode("utf-8")


def build_headers(client_id: str, client_secret: str) -> dict:
    return {
        "Authorization": build_basic_auth(client_id, client_secret),
        "Content-Type": "application/json",
    }
