from celery import Celery
from app.config import settings

celery_app = Celery(
    "payoni",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.webhook_tasks", "app.tasks.payment_tasks", "app.tasks.email_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Istanbul",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "expire-pending-3d-transactions": {
            "task": "app.tasks.payment_tasks.expire_pending_transactions",
            "schedule": 300,  # Her 5 dakikada bir
        },
    },
)
