"""
Ana ödeme orkestrasyon servisi.
POS seç → credential çöz → gateway oluştur → işlemi yürüt → kaydet → webhook tetikle.
"""
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.merchant import Merchant
from app.models.pos_account import PosAccount
from app.models.transaction import Transaction
from app.models.payment_attempt import PaymentAttempt
from app.schemas.payment import ChargeRequest, ChargeResponse, RefundRequest
from app.gateways.factory import GatewayFactory
from app.gateways.dto import SaleDTO, CardDTO, CustomerDTO, CancelDTO, RefundDTO, BinQueryDTO, InstallmentQueryDTO
from app.core.encryption import decrypt_credentials
from app.core.exceptions import NotFoundException, PaymentException, ValidationException


def _detect_card_brand(number: str) -> Optional[str]:
    """Kart numarasının ilk hanelerine göre marka tahmini."""
    n = number.replace(" ", "")
    if n.startswith("4"):
        return "Visa"
    if n[:2] in ("34", "37"):
        return "Amex"
    first2 = int(n[:2]) if len(n) >= 2 else 0
    first4 = int(n[:4]) if len(n) >= 4 else 0
    if 51 <= first2 <= 55 or 2221 <= first4 <= 2720:
        return "Mastercard"
    # Troy: 65 ile başlayan veya 9792 prefix
    if n.startswith("65") or n.startswith("9792"):
        return "Troy"
    return None


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def charge(
        self,
        merchant: Merchant,
        req: ChargeRequest,
        customer_ip: Optional[str] = None,
        widget_id: Optional[uuid.UUID] = None,
        payment_link_id: Optional[uuid.UUID] = None,
    ) -> ChargeResponse:
        pos = await self._resolve_pos(merchant.id, req.pos_account_id)
        credentials = decrypt_credentials(pos.credentials_enc, pos.iv)
        gateway = GatewayFactory.create(pos.provider_slug, credentials, pos.environment)

        # Komisyon metadata hesapla
        commission_meta: dict = {}
        pos_rates: dict = pos.commission_rates or {}
        installment_key = str(req.installments)
        if pos_rates and installment_key in pos_rates:
            rate = float(pos_rates[installment_key])
            commission_meta["commission_rate"] = rate
            commission_meta["commission_passthrough"] = bool(getattr(req, "commission_passthrough", False))
            if rate > 0:
                gross = float(req.amount) / (1 - rate / 100)
                commission_meta["gross_amount"] = round(gross, 2)
                commission_meta["net_amount"] = float(req.amount)
                commission_meta["commission_amount"] = round(gross - float(req.amount), 2)

        # Transaction oluştur
        tx = Transaction(
            id=uuid.uuid4(),
            merchant_id=merchant.id,
            pos_account_id=pos.id,
            widget_id=widget_id,
            payment_link_id=payment_link_id,
            amount=req.amount,
            currency=req.currency,
            installments=req.installments,
            card_last4=req.card.number[-4:] if req.card.number else None,
            card_holder=req.card.holder_name,
            card_brand=_detect_card_brand(req.card.number) if req.card.number else None,
            bin_number=req.card.number[:6] if req.card.number else None,
            is_3d=req.use_3d,
            customer_email=req.customer.email,
            customer_name=req.customer.name,
            customer_ip=customer_ip or req.customer.ip,
            description=req.description,
            status="pending",
            metadata_=commission_meta if commission_meta else None,
        )
        self.db.add(tx)
        await self.db.flush()  # ID almak için

        dto = SaleDTO(
            order_id=str(tx.id),
            amount=req.amount,
            currency=req.currency,
            installments=req.installments,
            card=CardDTO(**req.card.model_dump()),
            customer=CustomerDTO(**req.customer.model_dump()),
            callback_url=req.callback_url,
            description=req.description,
        )

        attempt = PaymentAttempt(
            id=uuid.uuid4(),
            transaction_id=tx.id,
            pos_account_id=pos.id,
            attempt_number=1,
        )
        self.db.add(attempt)

        if req.use_3d:
            result = await gateway.sale_3d_init(dto)
            if result.success:
                tx.status = "pending"
                tx.three_d_md = result.conversation_id
                attempt.status = "3d_pending"
            else:
                tx.status = "failed"
                tx.error_message = result.error_message
                attempt.status = "failed"

            await self.db.commit()
            return ChargeResponse(
                transaction_id=tx.id,
                status=tx.status,
                redirect_url=result.redirect_url,
                html_content=result.html_content,
                message=result.error_message if not result.success else None,
            )
        else:
            result = await gateway.sale(dto)
            if result.success:
                tx.status = "captured"
                tx.gateway_tx_id = result.gateway_tx_id
                tx.gateway_ref = result.gateway_ref
                tx.gateway_response = result.raw_response
                attempt.status = "success"
                attempt.gateway_response = result.raw_response
            else:
                tx.status = "failed"
                tx.error_code = result.error_code
                tx.error_message = result.error_message
                tx.gateway_response = result.raw_response
                attempt.status = "failed"
                attempt.error_code = result.error_code

            await self.db.commit()

            if result.success:
                await self._trigger_webhook(tx)

            return ChargeResponse(
                transaction_id=tx.id,
                status=tx.status,
                gateway_tx_id=result.gateway_tx_id,
                message=result.error_message if not result.success else "Ödeme başarılı",
            )

    async def cancel(self, merchant: Merchant, transaction_id: uuid.UUID) -> ChargeResponse:
        tx = await self._get_tx_or_404(merchant.id, transaction_id)
        if tx.status not in ("captured", "authorized", "pending"):
            raise ValidationException("Sadece pending/captured/authorized işlemler iptal edilebilir")

        pos = await self.db.get(PosAccount, tx.pos_account_id)
        credentials = decrypt_credentials(pos.credentials_enc, pos.iv)
        gateway = GatewayFactory.create(pos.provider_slug, credentials, pos.environment)

        dto = CancelDTO(
            order_id=str(tx.id),
            gateway_tx_id=tx.gateway_tx_id or "",
            amount=tx.amount,
        )
        result = await gateway.cancel(dto)
        tx.status = "cancelled" if result.success else tx.status
        tx.gateway_response = result.raw_response
        await self.db.commit()

        return ChargeResponse(transaction_id=tx.id, status=tx.status)

    async def refund(self, merchant: Merchant, transaction_id: uuid.UUID, req: RefundRequest) -> ChargeResponse:
        tx = await self._get_tx_or_404(merchant.id, transaction_id)
        if tx.status != "captured":
            raise ValidationException("Sadece captured işlemler iade edilebilir")

        refund_amount = req.amount or tx.amount
        if refund_amount > (tx.amount - tx.refunded_amount):
            raise ValidationException("İade tutarı ödeme tutarını aşamaz")

        pos = await self.db.get(PosAccount, tx.pos_account_id)
        credentials = decrypt_credentials(pos.credentials_enc, pos.iv)
        gateway = GatewayFactory.create(pos.provider_slug, credentials, pos.environment)

        dto = RefundDTO(
            order_id=str(tx.id),
            gateway_tx_id=tx.gateway_tx_id or "",
            amount=refund_amount,
            reason=req.reason,
        )
        result = await gateway.refund(dto)

        if result.success:
            tx.refunded_amount += refund_amount
            if tx.refunded_amount >= tx.amount:
                tx.status = "refunded"

        await self.db.commit()
        return ChargeResponse(transaction_id=tx.id, status=tx.status)

    async def bin_query(self, merchant: Merchant, bin_number: str, pos_account_id: Optional[uuid.UUID] = None):
        pos = await self._resolve_pos(merchant.id, pos_account_id)
        credentials = decrypt_credentials(pos.credentials_enc, pos.iv)
        gateway = GatewayFactory.create(pos.provider_slug, credentials, pos.environment)
        return await gateway.bin_query(BinQueryDTO(bin_number=bin_number))

    async def installment_query(
        self, merchant: Merchant, bin_number: str, amount: float, pos_account_id: Optional[uuid.UUID] = None
    ):
        from app.gateways.dto import InstallmentOption
        pos = await self._resolve_pos(merchant.id, pos_account_id)
        credentials = decrypt_credentials(pos.credentials_enc, pos.iv)
        gateway = GatewayFactory.create(pos.provider_slug, credentials, pos.environment)
        result = await gateway.installment_query(
            InstallmentQueryDTO(bin_number=bin_number, amount=Decimal(str(amount)))
        )

        # POS'ta tanımlı komisyon oranları varsa gateway'den geleni override et ve gross tutarları hesapla
        pos_rates: dict = pos.commission_rates or {}
        if pos_rates:
            net = Decimal(str(amount))
            enriched = []
            for opt in result.installments:
                rate_str = str(opt.count)
                if rate_str in pos_rates:
                    rate = Decimal(str(pos_rates[rate_str]))
                    opt = opt.model_copy(update={"commission_rate": rate})
                if opt.commission_rate is not None and opt.commission_rate > 0:
                    divisor = Decimal("1") - opt.commission_rate / Decimal("100")
                    gross = (net / divisor).quantize(Decimal("0.01"))
                    gross_monthly = (gross / opt.count).quantize(Decimal("0.01"))
                    opt = opt.model_copy(update={"gross_amount": gross, "gross_monthly": gross_monthly})
                enriched.append(opt)
            result = result.model_copy(update={"installments": enriched})

        return result

    async def _resolve_pos(self, merchant_id: uuid.UUID, pos_account_id: Optional[uuid.UUID]) -> PosAccount:
        if pos_account_id:
            result = await self.db.execute(
                select(PosAccount).where(
                    PosAccount.id == pos_account_id,
                    PosAccount.merchant_id == merchant_id,
                    PosAccount.is_active == True,
                    PosAccount.deleted_at == None,
                )
            )
            pos = result.scalar_one_or_none()
            if not pos:
                raise NotFoundException("POS hesabı bulunamadı")
            return pos

        # Default POS'u bul
        result = await self.db.execute(
            select(PosAccount).where(
                PosAccount.merchant_id == merchant_id,
                PosAccount.is_default == True,
                PosAccount.is_active == True,
                PosAccount.deleted_at == None,
            )
        )
        pos = result.scalar_one_or_none()
        if not pos:
            # Default yoksa herhangi aktif POS
            result = await self.db.execute(
                select(PosAccount).where(
                    PosAccount.merchant_id == merchant_id,
                    PosAccount.is_active == True,
                    PosAccount.deleted_at == None,
                ).limit(1)
            )
            pos = result.scalar_one_or_none()

        if not pos:
            raise NotFoundException("Aktif POS hesabı bulunamadı. Lütfen önce bir POS hesabı ekleyin.")
        return pos

    async def _get_tx_or_404(self, merchant_id: uuid.UUID, transaction_id: uuid.UUID) -> Transaction:
        result = await self.db.execute(
            select(Transaction).where(
                Transaction.id == transaction_id,
                Transaction.merchant_id == merchant_id,
            )
        )
        tx = result.scalar_one_or_none()
        if not tx:
            raise NotFoundException("İşlem bulunamadı")
        return tx

    async def _trigger_webhook(self, tx: Transaction):
        """Celery task'ı tetikler — merchant webhook_url'e bildirim gönderir."""
        try:
            from app.tasks.webhook_tasks import send_merchant_webhook
            send_merchant_webhook.delay(str(tx.id))
        except Exception:
            pass  # Webhook başarısızlığı ödemeyi etkilemez
