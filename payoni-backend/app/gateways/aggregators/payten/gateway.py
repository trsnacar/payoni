"""Payten (MSU) payment gateway."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError
from .auth import build_headers


class PaytenGateway(BaseGateway):
    SANDBOX_BASE = "https://test.payten.com.tr/api/v1"
    PRODUCTION_BASE = "https://api.payten.com.tr/api/v1"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _headers(self) -> dict:
        return build_headers(self._cred("client_id"), self._cred("client_secret"))

    def _build_response(self, data: dict) -> GatewayResponse:
        approved = data.get("status") == "APPROVED"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=data.get("transactionId"),
            gateway_ref=data.get("authCode"),
            error_code=data.get("errorCode") if not approved else None,
            error_message=data.get("errorMessage") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        payload = {
            "amount": int(float(dto.amount) * 100),
            "currency": dto.currency,
            "installment": dto.installments,
            "orderId": dto.order_id,
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
                resp = await client.post(
                    f"{self._resolve_base_url()}/payment",
                    json=payload,
                    headers=self._headers(),
                )
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        payload = {
            "amount": int(float(dto.amount) * 100),
            "currency": dto.currency,
            "installment": dto.installments,
            "orderId": dto.order_id,
            "callbackUrl": dto.callback_url,
            "card": {
                "holderName": dto.card.holder_name or "",
                "number": dto.card.number,
                "expireMonth": dto.card.exp_month,
                "expireYear": dto.card.exp_year,
                "cvv": dto.card.cvv,
            },
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/3d",
                json=payload,
                headers=self._headers(),
            )
        data = resp.json()
        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            redirect_url=data.get("redirectUrl"),
            html_content=data.get("htmlContent"),
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        raw = dto.raw_data or {}
        approved = raw.get("status") == "APPROVED"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=raw.get("transactionId", dto.order_id),
            gateway_ref=raw.get("authCode"),
            error_code=None if approved else raw.get("errorCode"),
            error_message=None if approved else raw.get("errorMessage"),
            raw_response=raw,
        )

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
                json={"amount": int(float(dto.amount) * 100)},
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
