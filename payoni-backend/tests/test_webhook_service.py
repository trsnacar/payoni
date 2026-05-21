"""WebhookService HMAC doğrulama testleri."""
import hashlib
import hmac
import base64
import pytest

from app.services.webhook_service import verify_signature


def test_iyzico_valid_signature():
    secret = "test-secret-key"
    body = b'{"status":"success","paymentId":"123"}'
    sig = base64.b64encode(
        hmac.new(secret.encode(), body, hashlib.sha256).digest()
    ).decode()
    assert verify_signature(
        "iyzico",
        body,
        {"x-iyz-signature": sig},
        {"secret_key": secret},
    ) is True


def test_iyzico_invalid_signature():
    body = b'{"status":"success"}'
    assert verify_signature(
        "iyzico",
        body,
        {"x-iyz-signature": "invalid-sig"},
        {"secret_key": "real-secret"},
    ) is False


def test_iyzico_missing_credentials_allows():
    """Credential yoksa (test ortamı) doğrulama geçer."""
    body = b'{"status":"success"}'
    result = verify_signature("iyzico", body, {}, None)
    assert result is True


def test_unknown_provider_allows():
    """Bilinmeyen provider için imza kontrolü yapılmaz (True döner)."""
    result = verify_signature("unknown_bank", b"payload", {}, None)
    assert result is True


def test_paytr_allows():
    """PayTR için şimdilik True dönmeli (TODO)."""
    result = verify_signature("paytr", b"data", {"hash": "abc"}, None)
    assert result is True
