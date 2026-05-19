"""Paratika (Asseco) payment gateway."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError
from .auth import build_headers


class ParatikaGateway(BaseGateway):
    SANDBOX_BASE = "https://test.paratika.com.tr/paratika/api/v2"
    PRODUCTION_BASE = "https://post.paratika.com.tr/paratika/api/v2"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _headers(self) -> dict:
        return build_headers(self._cred("merchant_id"), self._cred("api_key"))

    def _build_response(self, data: dict) -> GatewayResponse:
        approved = data.get("responseCode") == "00"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=data.get("pgTranId"),
            gateway_ref=data.get("authCode"),
            error_code=data.get("responseCode") if not approved else None,
            error_message=data.get("responseMsg") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        payload = {
            "MERCHANTPAYMENTID": dto.order_id,
            "AMOUNT": str(dto.amount),
            "CURRENCY": dto.currency,
            "INSTALLMENT": str(dto.installments),
            "CARDPAN": dto.card.number,
            "CARDEXPIRY": f"{dto.card.exp_month}/{dto.card.exp_year}",
            "CARDCVV": dto.card.cvv,
            "CARDHOLDERNAME": dto.card.holder_name or "",
            "SESSIONTYPE": "PAYWITHOUTPAGE",
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self._resolve_base_url()}/sale",
                    data=payload,
                    headers=self._headers(),
                )
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        payload = {
            "MERCHANTPAYMENTID": dto.order_id,
            "AMOUNT": str(dto.amount),
            "CURRENCY": dto.currency,
            "INSTALLMENT": str(dto.installments),
            "CARDPAN": dto.card.number,
            "CARDEXPIRY": f"{dto.card.exp_month}/{dto.card.exp_year}",
            "CARDCVV": dto.card.cvv,
            "CARDHOLDERNAME": dto.card.holder_name or "",
            "SESSIONTYPE": "PAYHOSTEDPAGE",
            "RETURNURL": dto.callback_url,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/sale3d",
                data=payload,
                headers=self._headers(),
            )
        data = resp.json()
        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            redirect_url=data.get("redirectUrl"),
            html_content=None,
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        raw = dto.raw_data or {}
        approved = raw.get("responseCode") == "00"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=raw.get("pgTranId", dto.order_id),
            gateway_ref=raw.get("authCode"),
            error_code=None if approved else raw.get("responseCode"),
            error_message=None if approved else raw.get("responseMsg"),
            raw_response=raw,
        )

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/void",
                data={"PGTRANID": dto.gateway_tx_id},
                headers=self._headers(),
            )
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/refund",
                data={"PGTRANID": dto.gateway_tx_id, "AMOUNT": str(dto.amount)},
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
            resp = await client.post(
                f"{self._resolve_base_url()}/querytransaction",
                data={"PGTRANID": dto.gateway_tx_id},
                headers=self._headers(),
            )
        return self._build_response(resp.json())
