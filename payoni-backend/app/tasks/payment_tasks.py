"""
Ödeme ile ilgili periyodik görevler.
- expire_pending_transactions: 30 dakika sonra hâlâ pending kalan işlemleri expired olarak işaretle
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.tasks.celery_app import celery_app


@celery_app.task
def expire_pending_transactions():
    """30 dakikayı geçen pending/3d_pending işlemleri expired yapar."""
    import asyncio
    asyncio.run(_async_expire())


async def _async_expire():
    from sqlalchemy import select, update
    from app.db.session import AsyncSessionLocal
    from app.models.transaction import Transaction

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Transaction).where(
                Transaction.status == "pending",
                Transaction.is_3d == True,
                Transaction.created_at < cutoff,
            )
        )
        expired = result.scalars().all()
        for tx in expired:
            tx.status = "failed"
            tx.error_message = "3D Secure süresi doldu"
        if expired:
            await db.commit()
