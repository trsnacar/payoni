import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, CancelDTO, RefundDTO, BinQueryDTO, InstallmentQueryDTO,
    TransactionQueryDTO, ThreeDCompleteDTO,
    GatewayResponse, ThreeDInitResponse, BinQueryResponse,
    InstallmentQueryResponse, TestConnectionResponse,
)
from app.gateways.exceptions import GatewayError, NetworkError
from .auth import build_signature, build_headers
from .serializers import (
    generate_conversation_id, to_morpara_payment, to_morpara_3d_init,
    from_morpara_response,
)


class MorParaGateway(BaseGateway):

    def _resolve_base_url(self) -> str:
        if self.environment == "sandbox":
            return "https://finagopay-pf-api-gateway.prp.morpara.com"
        return "https://sale-gateway.morpara.com"

    def _sign(self, payload: dict) -> str:
        values = list(payload.values())
        return build_signature(values, self.credentials.get("client_secret", ""))

    async def _post(self, path: str, payload: dict) -> dict:
        signature = self._sign(payload)
        headers = build_headers(
            client_id=self.credentials.get("client_id", ""),
            signature=signature,
        )
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{self.base_url}{path}", json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            raise GatewayError(f"MorPara HTTP hata: {e.response.status_code}")
        except httpx.RequestError as e:
            raise NetworkError(f"MorPara bağlantı hatası: {e}")

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        conversation_id = generate_conversation_id()
        payload = to_morpara_payment(dto, conversation_id)
        raw = await self._post("/api/payment/non3d", payload)
        fields = from_morpara_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        conversation_id = generate_conversation_id()
        callback_url = dto.callback_url or ""
        payload = to_morpara_3d_init(dto, conversation_id, callback_url)
        raw = await self._post("/api/payment/init3d", payload)

        if not raw.get("IsSuccess", False):
            return ThreeDInitResponse(
                success=False,
                error_message=raw.get("ErrorMessage"),
            )

        return ThreeDInitResponse(
            success=True,
            conversation_id=conversation_id,
            redirect_url=raw.get("RedirectUrl"),
            html_content=raw.get("HtmlContent"),
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        payload = {
            "ConversationId": dto.provider_data.get("ConversationId", dto.order_id),
            "PaymentId": dto.provider_data.get("PaymentId", ""),
        }
        raw = await self._post("/api/payment/auth3d", payload)
        fields = from_morpara_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        payload = {
            "OrderId": dto.order_id,
            "TransactionId": dto.gateway_tx_id,
        }
        raw = await self._post("/api/payment/cancel", payload)
        fields = from_morpara_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        payload = {
            "OrderId": dto.order_id,
            "TransactionId": dto.gateway_tx_id,
            "Amount": str(dto.amount),
        }
        raw = await self._post("/api/payment/refund", payload)
        fields = from_morpara_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        payload = {"BinNumber": dto.bin_number}
        raw = await self._post("/api/card/bincheck", payload)
        return BinQueryResponse(
            bin_number=dto.bin_number,
            card_brand=raw.get("CardBrand"),
            card_type=raw.get("CardType"),
            bank_name=raw.get("BankName"),
        )

    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        payload = {"BinNumber": dto.bin_number, "Amount": str(dto.amount)}
        raw = await self._post("/api/payment/installment", payload)
        return InstallmentQueryResponse(bin_number=dto.bin_number)

    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        payload = {"TransactionId": dto.gateway_tx_id}
        raw = await self._post("/api/payment/query", payload)
        fields = from_morpara_response(raw)
        return GatewayResponse(**fields)

    async def test_connection(self) -> TestConnectionResponse:
        try:
            required = ["client_id", "client_secret"]
            missing = [k for k in required if not self.credentials.get(k)]
            if missing:
                return TestConnectionResponse(success=False, message=f"Eksik alan: {', '.join(missing)}")
            await self.bin_query(BinQueryDTO(bin_number="415956"))
            return TestConnectionResponse(success=True, message="MorPara bağlantısı başarılı")
        except Exception as e:
            return TestConnectionResponse(success=False, message=str(e))
