from decimal import Decimal

import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, CancelDTO, RefundDTO, BinQueryDTO, InstallmentQueryDTO,
    TransactionQueryDTO, ThreeDCompleteDTO,
    GatewayResponse, ThreeDInitResponse, BinQueryResponse,
    InstallmentQueryResponse, InstallmentOption, TestConnectionResponse,
)
from app.gateways.exceptions import GatewayError, NetworkError
from .auth import build_authorization_header
from .serializers import (
    to_iyzico_payment, to_iyzico_3d_init, from_iyzico_response,
    to_iyzico_cancel, to_iyzico_refund,
    to_iyzico_bin_query, to_iyzico_installment_query,
)


class IyzicoGateway(BaseGateway):

    def _resolve_base_url(self) -> str:
        if self.environment == "sandbox":
            return "https://sandbox-api.iyzipay.com"
        return "https://api.iyzipay.com"

    def _headers(self, path: str, body: dict) -> dict:
        return build_authorization_header(
            api_key=self.credentials["api_key"],
            secret_key=self.credentials["secret_key"],
            uri_path=path,
            request_body=body,
        )

    async def _post(self, path: str, body: dict) -> dict:
        headers = self._headers(path, body)
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{self.base_url}{path}", json=body, headers=headers)
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            raise GatewayError(f"iyzico HTTP hata: {e.response.status_code}", raw_response={"body": e.response.text})
        except httpx.RequestError as e:
            raise NetworkError(f"iyzico bağlantı hatası: {e}")

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        path = "/payment/auth"
        body = to_iyzico_payment(dto)
        raw = await self._post(path, body)
        fields = from_iyzico_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        path = "/payment/3dsecure/initialize"
        callback_url = dto.callback_url or ""
        body = to_iyzico_3d_init(dto, callback_url)
        raw = await self._post(path, body)

        if raw.get("status") != "success":
            return ThreeDInitResponse(
                success=False,
                error_code=raw.get("errorCode"),
                error_message=raw.get("errorMessage"),
            )

        return ThreeDInitResponse(
            success=True,
            conversation_id=raw.get("conversationId"),
            html_content=raw.get("threeDSHtmlContent"),  # Base64 encoded HTML
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        path = "/payment/3dsecure/auth"
        body = {
            "locale": "tr",
            "conversationId": dto.order_id,
            "paymentId": dto.provider_data.get("paymentId", ""),
            "conversationData": dto.provider_data.get("conversationData", ""),
        }
        raw = await self._post(path, body)
        fields = from_iyzico_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        path = "/payment/cancel"
        body = to_iyzico_cancel(dto)
        raw = await self._post(path, body)
        fields = from_iyzico_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        path = "/payment/refund"
        body = to_iyzico_refund(dto)
        raw = await self._post(path, body)
        fields = from_iyzico_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        path = "/payment/bin/check"
        body = to_iyzico_bin_query(dto)
        raw = await self._post(path, body)

        return BinQueryResponse(
            bin_number=dto.bin_number,
            card_brand=raw.get("cardType"),
            card_type=raw.get("cardAssociation"),
            bank_name=raw.get("bankName"),
            is_commercial=raw.get("commercial") == 1,
        )

    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        path = "/payment/iyzipos/installment"
        body = to_iyzico_installment_query(dto)
        raw = await self._post(path, body)

        options = []
        for item in raw.get("installmentDetails", [{}])[0].get("installmentPrices", []):
            options.append(InstallmentOption(
                count=item.get("installmentNumber", 1),
                monthly_amount=Decimal(str(item.get("installmentPrice", 0))),
                total_amount=Decimal(str(item.get("totalPrice", 0))),
            ))

        return InstallmentQueryResponse(bin_number=dto.bin_number, installments=options)

    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        path = "/payment/detail"
        body = {"locale": "tr", "paymentId": dto.gateway_tx_id}
        raw = await self._post(path, body)
        fields = from_iyzico_response(raw)
        return GatewayResponse(**fields)

    async def test_connection(self) -> TestConnectionResponse:
        try:
            await self.bin_query(BinQueryDTO(bin_number="415956"))
            return TestConnectionResponse(success=True, message="iyzico bağlantısı başarılı")
        except Exception as e:
            return TestConnectionResponse(success=False, message=f"iyzico hatası: {e}")
