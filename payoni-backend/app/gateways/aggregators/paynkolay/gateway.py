"""PayNKolay (Papara) payment gateway."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError


class PayNKolayGateway(BaseGateway):
    SANDBOX_BASE = "https://merchant.test.paynkolay.com/api"
    PRODUCTION_BASE = "https://merchant.paynkolay.com/api"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _headers(self) -> dict:
        return {
            "ApiKey": self._cred("api_key"),
            "SecretKey": self._cred("secret_key"),
            "Content-Type": "application/json",
        }

    def _build_response(self, data: dict) -> GatewayResponse:
        approved = data.get("succeeded") is True
        return GatewayResponse(
            success=approved,
            gateway_tx_id=data.get("data", {}).get("transactionId") if isinstance(data.get("data"), dict) else None,
            gateway_ref=data.get("data", {}).get("authCode") if isinstance(data.get("data"), dict) else None,
            error_code=None if approved else str(data.get("errorCode", "")),
            error_message=data.get("message") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        payload = {
            "referenceId": dto.order_id,
            "amount": float(dto.amount),
            "currency": dto.currency,
            "installment": dto.installments,
            "card": {
                "cardHolderName": dto.card.holder_name or "",
                "cardNumber": dto.card.number,
                "expireMonth": dto.card.exp_month,
                "expireYear": dto.card.exp_year,
                "cvv": dto.card.cvv,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{self._resolve_base_url()}/payment", json=payload, headers=self._headers())
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        payload = {
            "referenceId": dto.order_id,
            "amount": float(dto.amount),
            "currency": dto.currency,
            "installment": dto.installments,
            "returnUrl": dto.callback_url,
            "card": {
                "cardHolderName": dto.card.holder_name or "",
                "cardNumber": dto.card.number,
                "expireMonth": dto.card.exp_month,
                "expireYear": dto.card.exp_year,
                "cvv": dto.card.cvv,
            },
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self._resolve_base_url()}/payment/3d", json=payload, headers=self._headers())
        data = resp.json()
        inner = data.get("data") or {}
        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            redirect_url=inner.get("redirectUrl") if isinstance(inner, dict) else None,
            html_content=inner.get("htmlContent") if isinstance(inner, dict) else None,
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        return self._build_response({"succeeded": (dto.raw_data or {}).get("status") == "success",
                                     "data": dto.raw_data})

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/cancel",
                json={"transactionId": dto.gateway_tx_id},
                headers=self._headers(),
            )
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/refund",
                json={"transactionId": dto.gateway_tx_id, "amount": float(dto.amount)},
                headers=self._headers(),
            )
        return self._build_response(resp.json())

    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        return BinQueryResponse(bin=dto.bin, card_brand=None, card_type=None,
                                bank_name=None, is_commercial=None, country_code="TR")

    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        return InstallmentQueryResponse(options=[])

    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self._resolve_base_url()}/payment/{dto.gateway_tx_id}",
                headers=self._headers(),
            )
        return self._build_response(resp.json())
