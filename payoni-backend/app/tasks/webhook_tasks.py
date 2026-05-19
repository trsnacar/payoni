"""
Merchant webhook fan-out: ödeme tamamlandığında merchant'ın webhook_url'ine bildirim gönderir.
Exponential backoff ile 4 deneme: 0s, 30s, 5m, 1h
"""
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone

import httpx
from celery import Task

from app.tasks.celery_app import celery_app


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=3600,
)
def send_merchant_webhook(self: Task, transaction_id: str):
    """Merchant webhook endpoint'ine HMAC imzalı bildirim gönderir."""
    import asyncio
    asyncio.run(_async_send_webhook(transaction_id))


async def _async_send_webhook(transaction_id: str):
    from app.db.session import AsyncSessionLocal
    from app.models.transaction import Transaction
    from app.models.merchant import Merchant
    from app.models.webhook_log import WebhookLog

    async with AsyncSessionLocal() as db:
        tx = await db.get(Transaction, uuid.UUID(transaction_id))
        if not tx:
            return

        merchant = await db.get(Merchant, tx.merchant_id)
        if not merchant or not merchant.webhook_url:
            return

        payload = {
            "event": "payment.success" if tx.status == "captured" else f"payment.{tx.status}",
            "transaction_id": str(tx.id),
            "amount": str(tx.amount),
            "currency": tx.currency,
            "status": tx.status,
            "created_at": tx.created_at.isoformat(),
        }

        body = json.dumps(payload, ensure_ascii=False)
        signature = ""
        if merchant.webhook_secret:
            signature = hmac.new(
                merchant.webhook_secret.encode("utf-8"),
                msg=body.encode("utf-8"),
                digestmod=hashlib.sha256,
            ).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-Payoni-Signature": signature,
            "X-Payoni-Event": payload["event"],
        }

        log = WebhookLog(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            transaction_id=tx.id,
            direction="outbound",
            http_method="POST",
            url=merchant.webhook_url,
            headers=headers,
            payload=payload,
            raw_body=body,
        )

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(merchant.webhook_url, content=body, headers=headers)
                log.http_status = resp.status_code
                log.response_body = resp.text[:2000]
                log.delivered_at = datetime.now(timezone.utc)
        except Exception as e:
            log.response_body = str(e)
            raise
        finally:
            db.add(log)
            await db.commit()
