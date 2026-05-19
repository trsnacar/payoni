import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_merchant
from app.core.exceptions import NotFoundException
from app.models.merchant import Merchant
from app.models.widget import Widget
from app.schemas.widget import WidgetCreate, WidgetUpdate, WidgetResponse, WidgetSnippetResponse
from app.config import settings

router = APIRouter(prefix="/widgets", tags=["Widgets"])


def _build_snippet(widget_id: str, amount: str, frontend_url: str) -> str:
    return f"""<!-- Payoni Ödeme Widgetı -->
<div id="payoni-widget-{widget_id}" data-payoni-widget="{widget_id}" data-payoni-amount="{amount}"></div>
<script>
  (function() {{
    var s = document.createElement('script');
    s.src = '{frontend_url}/embed.js';
    s.async = true;
    s.onload = function() {{ window.Payoni && window.Payoni.init(); }};
    document.head.appendChild(s);
  }})();
</script>
<!-- Opsiyonel: ödeme tamamlandığında bildirim alın -->
<script>
  window.addEventListener('message', function(e) {{
    if (e.data && e.data.type === 'payoni:success') {{
      console.log('Ödeme başarılı, işlem ID:', e.data.txId);
    }}
  }});
</script>"""


@router.get("", response_model=list[WidgetResponse])
async def list_widgets(
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Widget)
        .where(Widget.merchant_id == merchant.id)
        .order_by(Widget.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=WidgetResponse, status_code=201)
async def create_widget(
    body: WidgetCreate,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    rules = [r.model_dump() for r in body.installment_rules]
    # UUID'leri string'e çevir (JSONB için)
    for rule in rules:
        rule["pos_account_id"] = str(rule["pos_account_id"])

    widget = Widget(
        id=uuid.uuid4(),
        merchant_id=merchant.id,
        name=body.name,
        preferred_pos_id=body.preferred_pos_id,
        allowed_origins=body.allowed_origins,
        theme=body.theme,
        amount=body.amount,
        allow_installments=body.allow_installments,
        installment_rules=rules,
    )
    db.add(widget)
    await db.commit()
    await db.refresh(widget)
    return widget


@router.get("/{widget_id}", response_model=WidgetResponse)
async def get_widget(
    widget_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    return await _get_widget_or_404(widget_id, merchant.id, db)


@router.put("/{widget_id}", response_model=WidgetResponse)
async def update_widget(
    widget_id: uuid.UUID,
    body: WidgetUpdate,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    widget = await _get_widget_or_404(widget_id, merchant.id, db)
    update_data = body.model_dump(exclude_none=True)

    # installment_rules UUID'lerini string'e çevir
    if "installment_rules" in update_data:
        rules = update_data["installment_rules"]
        for rule in rules:
            if hasattr(rule.get("pos_account_id"), "hex"):
                rule["pos_account_id"] = str(rule["pos_account_id"])

    for field, value in update_data.items():
        setattr(widget, field, value)

    await db.commit()
    await db.refresh(widget)
    return widget


@router.delete("/{widget_id}", status_code=204)
async def delete_widget(
    widget_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    widget = await _get_widget_or_404(widget_id, merchant.id, db)
    await db.delete(widget)
    await db.commit()


@router.get("/{widget_id}/snippet", response_model=WidgetSnippetResponse)
async def get_widget_snippet(
    widget_id: uuid.UUID,
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    widget = await _get_widget_or_404(widget_id, merchant.id, db)
    amount_str = str(widget.amount) if widget.amount else ""
    snippet = _build_snippet(str(widget.id), amount_str, settings.FRONTEND_URL)
    return WidgetSnippetResponse(widget_id=widget.id, snippet=snippet)


async def _get_widget_or_404(widget_id: uuid.UUID, merchant_id: uuid.UUID, db: AsyncSession) -> Widget:
    result = await db.execute(
        select(Widget).where(Widget.id == widget_id, Widget.merchant_id == merchant_id)
    )
    widget = result.scalar_one_or_none()
    if not widget:
        raise NotFoundException("Widget bulunamadı")
    return widget
