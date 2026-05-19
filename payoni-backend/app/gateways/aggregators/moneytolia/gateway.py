"""Moneytolia payment gateway — API key header auth."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError


class MoneytoliaGateway(BaseGateway):
    SANDBOX_BASE = "https://sandbox.moneytolia.com/api/v1"
    PRODUCTION_BASE = "https://api.moneytolia.com/api/v1"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _headers(self) -> dict:
        return {
            "X-API-KEY": self._cred("api_key"),
            "X-API-SECRET": self._cred("api_secret"),
            "Content-Type": "application/json",
        }

    def _build_response(self, data: dict) -> GatewayResponse:
        approved = data.get("success") is True or data.get("status") == "APPROVED"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=data.get("transactionId") or data.get("id"),
            gateway_ref=data.get("authCode"),
            error_code=data.get("errorCode") if not approved else None,
            error_message=data.get("errorMessage") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        payload = {
            "orderId": dto.order_id,
            "amount": float(dto.amount),
            "currency": dto.currency,
            "installment": dto.installments,
            "card": {
                "holderName": dto.card.holder_name or "",
                "number": dto.card.number,
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
            "orderId": dto.order_id,
            "amount": float(dto.amount),
            "currency": dto.currency,
            "installment": dto.installments,
            "returnUrl": dto.callback_url,
            "card": {
                "holderName": dto.card.holder_name or "",
                "number": dto.card.number,
                "expireMonth": dto.card.exp_month,
                "expireYear": dto.card.exp_year,
                "cvv": dto.card.cvv,
            },
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self._resolve_base_url()}/payment/3d", json=payload, headers=self._headers())
        data = resp.json()
        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            redirect_url=data.get("redirectUrl"),
            html_content=data.get("htmlContent"),
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        return self._build_response(dto.raw_data or {})

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/{dto.gateway_tx_id}/cancel",
                headers=self._headers(),
            )
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/{dto.gateway_tx_id}/refund",
                json={"amount": float(dto.amount)},
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
