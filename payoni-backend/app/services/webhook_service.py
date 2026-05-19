"""
Provider'dan gelen webhook'ları normalleştirir ve 3D callback'lerini tamamlar.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.webhook_log import WebhookLog
import uuid

# NestPay protokolü kullanan tüm banka slug'ları
_NESTPAY_PROVIDERS = {
    "garanti", "akbank", "isbank", "vakifbank", "yapikredi", "denizbank",
    "halkbank", "qnb_finansbank", "ziraat", "sekerbank", "teb", "ing",
    "anadolubank", "alternatif_bank", "hsbc", "odeabank", "fibabanka",
    "albaraka", "kuveytturk", "vakif_katilim", "ziraat_katilim",
}


class WebhookService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def handle_inbound(self, provider_slug: str, payload: dict, raw_body: str = ""):
        """Provider'dan gelen inbound webhook'ı işler."""
        normalized = self._normalize(provider_slug, payload)
        transaction = await self._find_transaction(provider_slug, payload)

        # BUG-4 FIX: Transaction bulunamazsa log kaydetme, sessizce dön
        if not transaction:
            return

        # Log kaydet
        log = WebhookLog(
            id=uuid.uuid4(),
            merchant_id=transaction.merchant_id,
            transaction_id=transaction.id,
            direction="inbound",
            provider_slug=provider_slug,
            http_method="POST",
            payload=normalized,
            raw_body=raw_body,
        )
        self.db.add(log)

        if normalized.get("event_type") in ("payment_success", "3d_complete"):
            await self._complete_3d(transaction, payload, provider_slug)

        await self.db.commit()

    def _normalize(self, provider_slug: str, payload: dict) -> dict:
        """Provider'a özel payload'ı standart formata çevirir."""
        # BUG-3 FIX: NestPay bankalarını aynı normalizer'a yönlendir
        if provider_slug in _NESTPAY_PROVIDERS:
            return self._normalize_nestpay(payload)

        normalizers = {
            "iyzico": self._normalize_iyzico,
            "paytr": self._normalize_paytr,
            "morpara": self._normalize_morpara,
        }
        normalizer = normalizers.get(provider_slug, self._normalize_generic)
        return normalizer(payload)

    def _normalize_nestpay(self, payload: dict) -> dict:
        """NestPay (Asseco) 3D callback normalizer.
        mdStatus: 1=tam doğrulama, 2/3/4=yarı doğrulama, 0/5-9=hata
        oid: Payoni tarafından gönderilen order_id (= transaction.id)
        """
        md_status = str(payload.get("mdStatus", "0"))
        success = md_status in ("1", "2", "3", "4")
        return {
            "event_type": "payment_success" if success else "payment_failed",
            "conversation_id": payload.get("oid"),  # NestPay oid = transaction.id
            "status": "success" if success else "failed",
            "md_status": md_status,
            "auth_code": payload.get("AuthCode"),
            "error_msg": payload.get("ErrMsg") or payload.get("mdErrorMsg"),
        }

    def _normalize_iyzico(self, payload: dict) -> dict:
        status = payload.get("status", "")
        return {
            "event_type": "payment_success" if status == "success" else "payment_failed",
            "transaction_id": payload.get("paymentId"),
            "conversation_id": payload.get("conversationId"),
            "status": status,
            "amount": payload.get("price"),
        }

    def _normalize_paytr(self, payload: dict) -> dict:
        status = payload.get("status", "")
        return {
            "event_type": "payment_success" if status == "success" else "payment_failed",
            "transaction_id": payload.get("payment_id"),
            "conversation_id": payload.get("merchant_oid"),
            "status": status,
        }

    def _normalize_morpara(self, payload: dict) -> dict:
        status = payload.get("Status", payload.get("status", ""))
        success = payload.get("IsSuccess", status == "success")
        return {
            "event_type": "payment_success" if success else "payment_failed",
            "transaction_id": payload.get("TransactionId") or payload.get("PaymentId"),
            "conversation_id": payload.get("ConversationId"),
            "status": "success" if success else "failed",
        }

    def _normalize_generic(self, payload: dict) -> dict:
        return {"event_type": "unknown", "raw": payload}

    async def _find_transaction(self, provider_slug: str, payload: dict):
        """Callback verisinden transaction'ı bulur (three_d_md ile)."""
        md_map = {
            "iyzico": lambda p: p.get("conversationId"),
            "paytr": lambda p: p.get("merchant_oid"),
            "morpara": lambda p: p.get("ConversationId"),
        }
        # NestPay bankalarında conversation_id = oid
        if provider_slug in _NESTPAY_PROVIDERS:
            md_map[provider_slug] = lambda p: p.get("oid")

        get_md = md_map.get(provider_slug, lambda p: None)
        md = get_md(payload)

        if not md:
            return None

        # three_d_md ile ara (3D akışında set edilmiş)
        result = await self.db.execute(
            select(Transaction).where(Transaction.three_d_md == md)
        )
        tx = result.scalar_one_or_none()

        if not tx:
            # order_id direkt UUID olabilir (NestPay oid = transaction.id)
            try:
                tx_id = uuid.UUID(str(md))
                result = await self.db.execute(
                    select(Transaction).where(Transaction.id == tx_id)
                )
                tx = result.scalar_one_or_none()
            except (ValueError, AttributeError):
                pass

        return tx

    async def _complete_3d(self, transaction: Transaction, payload: dict, provider_slug: str):
        """3D callback'ini gateway ile tamamlar ve transaction'ı günceller."""
        from app.models.pos_account import PosAccount
        from app.core.encryption import decrypt_credentials
        from app.gateways.factory import GatewayFactory
        from app.gateways.dto import ThreeDCompleteDTO

        pos = await self.db.get(PosAccount, transaction.pos_account_id)
        if not pos:
            return

        credentials = decrypt_credentials(pos.credentials_enc, pos.iv)
        gateway = GatewayFactory.create(pos.provider_slug, credentials, pos.environment)

        dto = ThreeDCompleteDTO(
            order_id=str(transaction.id),
            provider_data=payload,
        )
        result = await gateway.sale_3d_complete(dto)

        transaction.three_d_status = "success" if result.success else "failed"
        if result.success:
            transaction.status = "captured"
            transaction.gateway_tx_id = result.gateway_tx_id
            transaction.gateway_ref = result.gateway_ref
        else:
            transaction.status = "failed"
            transaction.error_code = result.error_code
            transaction.error_message = result.error_message

        # BUG-2 FIX: 3D tamamlandıktan sonra merchant'a webhook gönder
        if result.success:
            try:
                from app.tasks.webhook_tasks import send_merchant_webhook
                send_merchant_webhook.delay(str(transaction.id))
            except Exception:
                pass  # Webhook başarısızlığı ödemeyi etkilemez
