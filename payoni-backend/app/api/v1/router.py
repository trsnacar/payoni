from fastapi import APIRouter

from app.api.v1 import auth, merchants, pos_accounts, payments, transactions, payment_links, widgets, analytics, api_keys, webhooks

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(merchants.router)
router.include_router(pos_accounts.router)
router.include_router(payments.router)
router.include_router(transactions.router)
router.include_router(payment_links.router)
router.include_router(widgets.router)
router.include_router(analytics.router)
router.include_router(api_keys.router)
router.include_router(webhooks.router)
