"""Moka payment gateway."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError
from .auth import build_dealer_auth


class MokaGateway(BaseGateway):
    SANDBOX_BASE = "https://service.refmoka.com"
    PRODUCTION_BASE = "https://service.moka.com"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _dealer_auth(self) -> dict:
        return build_dealer_auth(
            self._cred("dealer_code"),
            self._cred("username"),
            self._cred("password"),
        )

    def _build_response(self, data: dict) -> GatewayResponse:
        result_code = data.get("ResultCode", "")
        approved = result_code == "Success"
        data_obj = data.get("Data") or {}
        return GatewayResponse(
            success=approved,
            gateway_tx_id=str(data_obj.get("OtherTrxCode", "") or data_obj.get("TrxCode", "")),
            gateway_ref=str(data_obj.get("VirtualPosTrxId", "")),
            error_code=result_code if not approved else None,
            error_message=data.get("ResultMessage") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        payload = {
            "PaymentDealerAuthentication": self._dealer_auth(),
            "PaymentDealerRequest": {
                "CardHolderFullName": dto.card.holder_name or "",
                "CardNumber": dto.card.number,
                "ExpMonth": dto.card.exp_month,
                "ExpYear": dto.card.exp_year,
                "CvcNumber": dto.card.cvv,
                "Amount": float(dto.amount),
                "Currency": "TL",
                "InstallmentNumber": dto.installments,
                "ClientIP": "",
                "OtherTrxCode": dto.order_id,
                "IsPoolPayment": 0,
                "IsPreAuth": 0,
                "Description": dto.description or "",
            },
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self._resolve_base_url()}/payment/v1/directpayment",
                    json=payload,
                )
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        payload = {
            "PaymentDealerAuthentication": self._dealer_auth(),
            "PaymentDealerRequest": {
                "CardHolderFullName": dto.card.holder_name or "",
                "CardNumber": dto.card.number,
                "ExpMonth": dto.card.exp_month,
                "ExpYear": dto.card.exp_year,
                "CvcNumber": dto.card.cvv,
                "Amount": float(dto.amount),
                "Currency": "TL",
                "InstallmentNumber": dto.installments,
                "ClientIP": "",
                "OtherTrxCode": dto.order_id,
                "ReturnHash": 1,
                "RedirectUrl": dto.callback_url,
                "Description": dto.description or "",
            },
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/v1/3dpayment/init",
                json=payload,
            )
        data = resp.json()
        redirect = (data.get("Data") or {}).get("Url", "")
        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            redirect_url=redirect or None,
            html_content=None,
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        raw = dto.raw_data or {}
        approved = raw.get("IsSuccessful") == "1"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=raw.get("OtherTrxCode", dto.order_id),
            gateway_ref=raw.get("TrxCode"),
            error_code=None if approved else raw.get("ResultCode"),
            error_message=None if approved else raw.get("ResultMessage"),
            raw_response=raw,
        )

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        payload = {
            "PaymentDealerAuthentication": self._dealer_auth(),
            "PaymentDealerRequest": {"TrxCode": dto.gateway_tx_id},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/v1/void", json=payload
            )
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        payload = {
            "PaymentDealerAuthentication": self._dealer_auth(),
            "PaymentDealerRequest": {
                "TrxCode": dto.gateway_tx_id,
                "RefundAmount": float(dto.amount),
            },
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/v1/refund", json=payload
            )
        return self._build_response(resp.json())

    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        return BinQueryResponse(bin=dto.bin, card_brand=None, card_type=None,
                                bank_name=None, is_commercial=None, country_code="TR")

    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        return InstallmentQueryResponse(options=[])

    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        payload = {
            "PaymentDealerAuthentication": self._dealer_auth(),
            "PaymentDealerRequest": {"TrxCode": dto.gateway_tx_id},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._resolve_base_url()}/payment/v1/getpaymentdetail", json=payload
            )
        return self._build_response(resp.json())
