"""iPara payment gateway."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError
from .auth import build_hash


class IParaGateway(BaseGateway):
    SANDBOX_BASE = "https://test.ipara.com/rest"
    PRODUCTION_BASE = "https://api.ipara.com/rest"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "APIPublicKey": self._cred("public_key"),
        }

    def _build_response(self, data: dict) -> GatewayResponse:
        approved = data.get("result") == "1" or data.get("responseCode") == "00"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=data.get("orderId"),
            gateway_ref=data.get("authCode"),
            error_code=data.get("responseCode") if not approved else None,
            error_message=data.get("errorMessage") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        hash_val = build_hash(
            private_key=self._cred("private_key"),
            client_id=self._cred("public_key"),
            order_id=dto.order_id,
            amount=str(int(float(dto.amount) * 100)),
            ok_url="",
            fail_url="",
            card_number=dto.card.number,
            exp_year=dto.card.exp_year,
            exp_month=dto.card.exp_month,
            cvv=dto.card.cvv,
            card_holder=dto.card.holder_name or "",
        )
        payload = {
            "orderId": dto.order_id,
            "amount": str(int(float(dto.amount) * 100)),
            "currency": "0",
            "installment": str(dto.installments),
            "cardHolderName": dto.card.holder_name or "",
            "cardNumber": dto.card.number,
            "expireMonth": dto.card.exp_month,
            "expireYear": dto.card.exp_year,
            "cvc": dto.card.cvv,
            "hash": hash_val,
            "mode": "P",
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self._resolve_base_url()}/payment/auth",
                    json=payload,
                    headers=self._headers(),
                )
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        hash_val = build_hash(
            private_key=self._cred("private_key"),
            client_id=self._cred("public_key"),
            order_id=dto.order_id,
            amount=str(int(float(dto.amount) * 100)),
            ok_url=dto.callback_url + "?result=success",
            fail_url=dto.callback_url + "?result=fail",
            card_number=dto.card.number,
            exp_year=dto.card.exp_year,
            exp_month=dto.card.exp_month,
            cvv=dto.card.cvv,
            card_holder=dto.card.holder_name or "",
        )
        payload = {
            "orderId": dto.order_id,
            "amount": str(int(float(dto.amount) * 100)),
            "currency": "0",
            "installment": str(dto.installments),
            "cardHolderName": dto.card.holder_name or "",
            "cardNumber": dto.card.number,
            "expireMonth": dto.card.exp_month,
            "expireYear": dto.card.exp_year,
            "cvc": dto.card.cvv,
            "okUrl": dto.callback_url + "?result=success",
            "failUrl": dto.callback_url + "?result=fail",
            "hash": hash_val,
            "mode": "P",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/threeds/auth",
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
        approved = raw.get("result") == "1"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=raw.get("orderId", dto.order_id),
            gateway_ref=raw.get("authCode"),
            error_code=None if approved else raw.get("responseCode"),
            error_message=None if approved else raw.get("errorMessage"),
            raw_response=raw,
        )

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/cancel",
                json={"orderId": dto.gateway_tx_id},
                headers=self._headers(),
            )
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/refund",
                json={"orderId": dto.gateway_tx_id, "amount": str(int(float(dto.amount) * 100))},
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
                f"{self._resolve_base_url()}/payment/detail",
                json={"orderId": dto.gateway_tx_id},
                headers=self._headers(),
            )
        return self._build_response(resp.json())
