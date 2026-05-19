"""
Sipay kimlik doğrulama.
Her istekte app_id + app_secret ile token alınır (önbelleklenebilir).
"""
import hashlib
import time


def build_hash(app_id: str, app_secret: str, timestamp: str) -> str:
    """SHA256(app_id + app_secret + timestamp) → hex"""
    raw = app_id + app_secret + timestamp
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_token_payload(app_id: str, app_secret: str) -> dict:
    timestamp = str(int(time.time()))
    return {
        "app_id": app_id,
        "app_secret": app_secret,
        "hash": build_hash(app_id, app_secret, timestamp),
        "timestamp": timestamp,
    }
