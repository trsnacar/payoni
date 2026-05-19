"""Tami payment gateway — Bearer token auth."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError


class TamiGateway(BaseGateway):
    SANDBOX_BASE = "https://sandbox.tami.com.tr/api"
    PRODUCTION_BASE = "https://api.tami.com.tr/api"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._cred('api_key')}",
            "Content-Type": "application/json",
        }

    def _build_response(self, data: dict) -> GatewayResponse:
        approved = data.get("success") is True or data.get("status") == "approved"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=data.get("transaction_id") or data.get("id"),
            gateway_ref=data.get("auth_code"),
            error_code=data.get("error_code") if not approved else None,
            error_message=data.get("error_message") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        payload = {
            "amount": float(dto.amount),
            "currency": dto.currency,
            "installment": dto.installments,
            "order_id": dto.order_id,
            "card": {
                "holder_name": dto.card.holder_name or "",
                "number": dto.card.number,
                "exp_month": dto.card.exp_month,
                "exp_year": dto.card.exp_year,
                "cvv": dto.card.cvv,
            },
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{self._resolve_base_url()}/charge", json=payload, headers=self._headers())
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        payload = {
            "amount": float(dto.amount),
            "currency": dto.currency,
            "installment": dto.installments,
            "order_id": dto.order_id,
            "callback_url": dto.callback_url,
            "card": {
                "holder_name": dto.card.holder_name or "",
                "number": dto.card.number,
                "exp_month": dto.card.exp_month,
                "exp_year": dto.card.exp_year,
                "cvv": dto.card.cvv,
            },
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self._resolve_base_url()}/charge/3d", json=payload, headers=self._headers())
        data = resp.json()
        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            redirect_url=data.get("redirect_url"),
            html_content=data.get("html_content"),
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        raw = dto.raw_data or {}
        return self._build_response(raw)

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/void",
                json={"transaction_id": dto.gateway_tx_id},
                headers=self._headers(),
            )
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/refund",
                json={"transaction_id": dto.gateway_tx_id, "amount": float(dto.amount)},
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
                f"{self._resolve_base_url()}/transactions/{dto.gateway_tx_id}",
                headers=self._headers(),
            )
        return self._build_response(resp.json())
