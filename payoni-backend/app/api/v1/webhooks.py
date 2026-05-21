from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Request, Response, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.dependencies import get_db, get_current_merchant
from app.models.merchant import Merchant
from app.models.webhook_log import WebhookLog
from app.services.webhook_service import WebhookService, verify_signature

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/{provider_slug}/callback")
async def provider_callback(
    provider_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Provider'dan gelen 3D callback ve bildirimler."""
    raw_body = await request.body()
    body_text = raw_body.decode("utf-8", errors="replace")

    try:
        payload = await request.json()
    except Exception:
        from urllib.parse import parse_qs
        parsed = parse_qs(body_text)
        payload = {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}

    headers_dict = dict(request.headers)
    verified = verify_signature(provider_slug, raw_body, headers_dict)

    service = WebhookService(db)
    await service.handle_inbound(provider_slug, payload, raw_body=body_text, headers=headers_dict, verified=verified)

    return Response(content="OK", status_code=200)


@router.post("/logs/{log_id}/retry")
async def retry_webhook(
    log_id: UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    """Başarısız outbound webhook'u yeniden gönderir."""
    result = await db.execute(
        select(WebhookLog).where(
            WebhookLog.id == log_id,
            WebhookLog.merchant_id == merchant.id,
            WebhookLog.direction == "outbound",
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Webhook log bulunamadı")

    if log.transaction_id:
        from app.tasks.webhook_tasks import send_merchant_webhook
        send_merchant_webhook.delay(str(log.transaction_id))

    return {"message": "Webhook yeniden gönderim kuyruğa alındı"}


@router.get("/logs")
async def list_webhook_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    direction: Optional[str] = Query(None, regex="^(inbound|outbound)$"),
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    """Webhook log listesi (inbound + outbound)."""
    q = (
        select(WebhookLog)
        .where(WebhookLog.merchant_id == merchant.id)
        .order_by(desc(WebhookLog.created_at))
    )
    if direction:
        q = q.where(WebhookLog.direction == direction)

    offset = (page - 1) * per_page
    result = await db.execute(q.offset(offset).limit(per_page))
    logs = result.scalars().all()

    count_q = select(func.count()).where(WebhookLog.merchant_id == merchant.id)
    if direction:
        count_q = count_q.where(WebhookLog.direction == direction)
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    return {
        "items": [
            {
                "id": str(log.id),
                "direction": log.direction,
                "provider_slug": log.provider_slug,
                "transaction_id": str(log.transaction_id) if log.transaction_id else None,
                "http_status": log.http_status,
                "retry_count": log.retry_count,
                "url": log.url,
                "payload": log.payload,
                "response_body": log.response_body,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
