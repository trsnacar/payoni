"""AhlPay payment gateway."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError
from .auth import build_hash


class AhlPayGateway(BaseGateway):
    SANDBOX_BASE = "https://sandbox.ahlpay.com.tr/api/v1"
    PRODUCTION_BASE = "https://api.ahlpay.com.tr/api/v1"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _build_response(self, data: dict) -> GatewayResponse:
        approved = data.get("resultCode") == "00" or data.get("success") is True
        return GatewayResponse(
            success=approved,
            gateway_tx_id=data.get("transactionId") or data.get("orderId"),
            gateway_ref=data.get("authCode"),
            error_code=data.get("resultCode") if not approved else None,
            error_message=data.get("resultMessage") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        hash_val = build_hash(
            self._cred("merchant_id"), dto.order_id,
            str(dto.amount), dto.currency, self._cred("api_secret")
        )
        payload = {
            "merchantId": self._cred("merchant_id"),
            "orderId": dto.order_id,
            "amount": str(dto.amount),
            "currency": dto.currency,
            "installment": str(dto.installments),
            "cardNumber": dto.card.number,
            "cardExpiry": f"{dto.card.exp_month}{dto.card.exp_year}",
            "cardCvv": dto.card.cvv,
            "cardHolder": dto.card.holder_name or "",
            "hash": hash_val,
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{self._resolve_base_url()}/payment", json=payload)
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        hash_val = build_hash(
            self._cred("merchant_id"), dto.order_id,
            str(dto.amount), dto.currency, self._cred("api_secret")
        )
        payload = {
            "merchantId": self._cred("merchant_id"),
            "orderId": dto.order_id,
            "amount": str(dto.amount),
            "currency": dto.currency,
            "installment": str(dto.installments),
            "cardNumber": dto.card.number,
            "cardExpiry": f"{dto.card.exp_month}{dto.card.exp_year}",
            "cardCvv": dto.card.cvv,
            "cardHolder": dto.card.holder_name or "",
            "hash": hash_val,
            "returnUrl": dto.callback_url,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self._resolve_base_url()}/payment/3d", json=payload)
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
                f"{self._resolve_base_url()}/void",
                json={"merchantId": self._cred("merchant_id"), "transactionId": dto.gateway_tx_id},
            )
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/refund",
                json={
                    "merchantId": self._cred("merchant_id"),
                    "transactionId": dto.gateway_tx_id,
                    "amount": str(dto.amount),
                },
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
                f"{self._resolve_base_url()}/query",
                json={"merchantId": self._cred("merchant_id"), "transactionId": dto.gateway_tx_id},
            )
        return self._build_response(resp.json())
