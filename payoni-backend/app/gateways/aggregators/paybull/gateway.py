"""PayBull payment gateway — Sipay altyapısı üzerine kurulu, aynı API formatını kullanır."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError
from app.gateways.aggregators.sipay.auth import build_token_payload


class PayBullGateway(BaseGateway):
    SANDBOX_BASE = "https://test-payment.paybull.com/ccpayment"
    PRODUCTION_BASE = "https://payment.paybull.com/ccpayment"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    async def _get_token(self) -> str:
        payload = build_token_payload(self._cred("app_id"), self._cred("app_secret"))
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(f"{self._resolve_base_url()}/api/token", json=payload)
        return resp.json().get("data", {}).get("token", "")

    def _build_response(self, data: dict) -> GatewayResponse:
        approved = str(data.get("status_code", "")) == "100"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=str(data.get("invoice_id", "")),
            gateway_ref=data.get("order_no"),
            error_code=str(data.get("status_code", "")) if not approved else None,
            error_message=data.get("status_description") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        token = await self._get_token()
        payload = {
            "cc_holder_name": dto.card.holder_name or "",
            "cc_no": dto.card.number,
            "expiry_month": dto.card.exp_month,
            "expiry_year": dto.card.exp_year,
            "cvv": dto.card.cvv,
            "currency_code": dto.currency,
            "installments_number": dto.installments,
            "invoice_id": dto.order_id,
            "total": float(dto.amount),
            "merchant_key": self._cred("merchant_key"),
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self._resolve_base_url()}/api/paySmart2D",
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                )
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        token = await self._get_token()
        payload = {
            "cc_holder_name": dto.card.holder_name or "",
            "cc_no": dto.card.number,
            "expiry_month": dto.card.exp_month,
            "expiry_year": dto.card.exp_year,
            "cvv": dto.card.cvv,
            "currency_code": dto.currency,
            "installments_number": dto.installments,
            "invoice_id": dto.order_id,
            "total": float(dto.amount),
            "merchant_key": self._cred("merchant_key"),
            "cancel_url": dto.callback_url + "?result=fail",
            "return_url": dto.callback_url + "?result=success",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/api/paySmart3D",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
        data = resp.json()
        inner = data.get("data") or {}
        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            html_content=inner.get("html_content") if isinstance(inner, dict) else None,
            redirect_url=inner.get("redirect_url") if isinstance(inner, dict) else None,
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        return self._build_response(dto.raw_data or {})

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/api/cancelPayment",
                json={"invoice_id": dto.gateway_tx_id, "merchant_key": self._cred("merchant_key")},
                headers={"Authorization": f"Bearer {token}"},
            )
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/api/refundPayment",
                json={"invoice_id": dto.gateway_tx_id, "amount": float(dto.amount),
                      "merchant_key": self._cred("merchant_key")},
                headers={"Authorization": f"Bearer {token}"},
            )
        return self._build_response(resp.json())

    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        return BinQueryResponse(bin=dto.bin, card_brand=None, card_type=None,
                                bank_name=None, is_commercial=None, country_code="TR")

    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        return InstallmentQueryResponse(options=[])

    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        token = await self._get_token()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/api/getPaymentStatus",
                json={"invoice_id": dto.gateway_tx_id, "merchant_key": self._cred("merchant_key")},
                headers={"Authorization": f"Bearer {token}"},
            )
        return self._build_response(resp.json())
