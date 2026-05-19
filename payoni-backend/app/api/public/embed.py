import uuid
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.merchant import Merchant
from app.models.pos_account import PosAccount
from app.models.widget import Widget
from app.schemas.payment import CardInput, CustomerInput, ChargeResponse
from app.services.payment_service import PaymentService
from app.core.exceptions import NotFoundException, ForbiddenException
from app.config import settings

router = APIRouter(prefix="/embed", tags=["Embed Widget"])


class EmbedChargeRequest(BaseModel):
    """Widget üzerinden ödeme — pos_account_id sunucu tarafında çözülür."""
    amount: Decimal
    installments: int = 1
    currency: str = "TRY"
    card: CardInput
    customer: CustomerInput
    description: Optional[str] = None
    use_3d: bool = True
    callback_url: Optional[str] = None


@router.get("/{widget_id}", response_class=HTMLResponse)
async def get_embed_page(
    widget_id: uuid.UUID,
    amount: Optional[Decimal] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Widget).where(Widget.id == widget_id, Widget.is_active == True)
    )
    widget = result.scalar_one_or_none()
    if not widget:
        raise NotFoundException("Widget bulunamadı")

    effective_amount = amount or widget.amount
    theme = widget.theme or {}
    primary_color = theme.get("primaryColor", "#6366f1")

    # İzin verilen taksit seçeneklerini kurallardan çıkar
    allowed_installments = _get_allowed_installments(widget)

    html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ödeme</title>
  <style>body {{ margin: 0; font-family: system-ui; }}</style>
</head>
<body>
  <div id="embed-root"
    data-widget-id="{widget_id}"
    data-amount="{effective_amount or ''}"
    data-primary-color="{primary_color}"
    data-allow-installments="{str(widget.allow_installments).lower()}"
    data-installments="{','.join(str(i) for i in allowed_installments)}"
    data-api-base="/api/v1">
  </div>
  <script src="{settings.FRONTEND_URL}/embed-app.js"></script>
</body>
</html>"""
    return HTMLResponse(content=html)


@router.post("/{widget_id}/charge", response_model=ChargeResponse)
async def charge_via_widget(
    widget_id: uuid.UUID,
    body: EmbedChargeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Widget üzerinden ödeme — POS installment kurallarından otomatik seçilir."""
    result = await db.execute(
        select(Widget).where(Widget.id == widget_id, Widget.is_active == True)
    )
    widget = result.scalar_one_or_none()
    if not widget:
        raise NotFoundException("Widget bulunamadı")

    # Origin kontrolü
    origin = request.headers.get("origin", "")
    allowed = widget.allowed_origins or []
    if allowed and origin not in allowed:
        raise ForbiddenException(f"Bu origin izinli değil: {origin}")

    merchant = await db.get(Merchant, widget.merchant_id)
    if not merchant or not merchant.is_active:
        raise NotFoundException("Merchant bulunamadı")

    # Tutarı widget'tan veya parametreden al
    effective_amount = widget.amount or body.amount

    # POS'u installment kurallarına göre çöz
    pos = await _resolve_pos_for_installments(widget, body.installments, db)

    from app.schemas.payment import ChargeRequest
    charge_req = ChargeRequest(
        pos_account_id=pos.id,
        amount=effective_amount,
        currency=body.currency,
        installments=body.installments,
        card=body.card,
        customer=body.customer,
        description=body.description,
        use_3d=body.use_3d,
        callback_url=body.callback_url,
    )

    service = PaymentService(db)
    customer_ip = request.client.host if request.client else None
    return await service.charge(merchant, charge_req, customer_ip=customer_ip, widget_id=widget_id)


def _get_allowed_installments(widget: Widget) -> list[int]:
    """Widget'ın taksit kurallarından izin verilen tüm taksit sayılarını döner."""
    if not widget.allow_installments:
        return [1]
    rules = widget.installment_rules or []
    if not rules:
        # Kural yoksa preferred_pos varsa 1-12 arası, yoksa sadece 1
        if widget.preferred_pos_id:
            return [1, 2, 3, 6, 9, 12]
        return [1]
    installments = set()
    for rule in rules:
        installments.update(rule.get("installments", []))
    return sorted(installments)


async def _resolve_pos_for_installments(
    widget: Widget, installments: int, db: AsyncSession
) -> PosAccount:
    """Taksit sayısına göre installment_rules'dan doğru POS'u seç."""
    rules = widget.installment_rules or []
    for rule in rules:
        if installments in rule.get("installments", []):
            pos_id = UUID(rule["pos_account_id"])
            pos = await db.get(PosAccount, pos_id)
            if pos and pos.is_active:
                return pos

    # Kurala uyan yoksa preferred_pos_id
    if widget.preferred_pos_id:
        pos = await db.get(PosAccount, widget.preferred_pos_id)
        if pos and pos.is_active:
            return pos

    # Son çare: merchant'ın default POS'u
    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(PosAccount).where(
            PosAccount.merchant_id == widget.merchant_id,
            PosAccount.is_active == True,
            PosAccount.is_default == True,
        )
    )
    pos = result.scalar_one_or_none()
    if not pos:
        result = await db.execute(
            sa_select(PosAccount).where(
                PosAccount.merchant_id == widget.merchant_id,
                PosAccount.is_active == True,
            ).limit(1)
        )
        pos = result.scalar_one_or_none()

    if not pos:
        raise NotFoundException("Aktif POS hesabı bulunamadı")
    return pos
