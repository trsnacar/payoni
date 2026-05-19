import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, CancelDTO, RefundDTO, BinQueryDTO, InstallmentQueryDTO,
    TransactionQueryDTO, ThreeDCompleteDTO,
    GatewayResponse, ThreeDInitResponse, BinQueryResponse,
    InstallmentQueryResponse, TestConnectionResponse,
)
from app.gateways.exceptions import GatewayError, NetworkError
from .auth import calculate_hash
from .serializers import to_paytr_iframe_token, from_paytr_response


class PayTRGateway(BaseGateway):

    def _resolve_base_url(self) -> str:
        # PayTR'da sandbox test_mode=1 ile aynı URL'den sağlanır
        return "https://www.paytr.com"

    def _is_test(self) -> int:
        return 1 if self.environment == "sandbox" else 0

    async def _post_form(self, path: str, data: dict) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{self.base_url}{path}", data=data)
                resp.raise_for_status()
                return resp.json()
        except httpx.HTTPStatusError as e:
            raise GatewayError(f"PayTR HTTP hata: {e.response.status_code}")
        except httpx.RequestError as e:
            raise NetworkError(f"PayTR bağlantı hatası: {e}")

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        # PayTR iframe tabanlı çalışır; direkt kart ile ödeme için Direct API gerekir
        # Burada iFrame token üretiyoruz — Direct API ayrıca aktive edilmesi gerekir
        return await self._iframe_init(dto)

    async def _iframe_init(self, dto: SaleDTO) -> GatewayResponse:
        merchant_id = self.credentials.get("merchant_id", "")
        merchant_key = self.credentials.get("merchant_key", "")
        merchant_salt = self.credentials.get("merchant_salt", "")

        ok_url = dto.callback_url or "https://payoni.com/payment/success"
        fail_url = dto.callback_url or "https://payoni.com/payment/fail"

        payload = to_paytr_iframe_token(
            dto, merchant_id, merchant_key, merchant_salt,
            ok_url, fail_url, self._is_test()
        )

        amount_kurus = str(int(dto.amount * 100))
        hash_str = (
            merchant_id + payload["user_ip"] + dto.order_id + dto.customer.email +
            amount_kurus + dto.currency + str(self._is_test()) + "0" + merchant_salt
        )
        import base64, hashlib, hmac
        payload["paytr_token"] = base64.b64encode(
            hmac.new(merchant_key.encode(), hash_str.encode(), hashlib.sha256).digest()
        ).decode()

        raw = await self._post_form("/odeme/api/v1", payload)
        fields = from_paytr_response(raw, dto.order_id)
        return GatewayResponse(**fields)

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        result = await self._iframe_init(dto)
        if not result.success:
            return ThreeDInitResponse(success=False, error_message=result.error_message)

        iframe_url = f"https://www.paytr.com/odeme/guvenli/{result.gateway_tx_id}"
        return ThreeDInitResponse(
            success=True,
            conversation_id=dto.order_id,
            redirect_url=iframe_url,
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        status = dto.provider_data.get("status", "")
        success = status == "success"
        return GatewayResponse(
            success=success,
            gateway_tx_id=dto.provider_data.get("payment_id"),
            gateway_ref=dto.order_id,
            error_message=dto.provider_data.get("failed_reason_msg") if not success else None,
            raw_response=dto.provider_data,
        )

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        merchant_id = self.credentials.get("merchant_id", "")
        merchant_key = self.credentials.get("merchant_key", "")
        merchant_salt = self.credentials.get("merchant_salt", "")

        import base64, hashlib, hmac
        hash_str = merchant_id + dto.gateway_tx_id + merchant_salt
        token = base64.b64encode(
            hmac.new(merchant_key.encode(), hash_str.encode(), hashlib.sha256).digest()
        ).decode()

        data = {
            "merchant_id": merchant_id,
            "merchant_oid": dto.order_id,
            "paytr_token": token,
        }
        raw = await self._post_form("/odeme/api/isDone", data)
        return GatewayResponse(
            success=raw.get("status") == "success",
            gateway_ref=dto.order_id,
            raw_response=raw,
        )

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        merchant_id = self.credentials.get("merchant_id", "")
        merchant_key = self.credentials.get("merchant_key", "")
        merchant_salt = self.credentials.get("merchant_salt", "")
        amount_kurus = str(int(dto.amount * 100))

        import base64, hashlib, hmac
        hash_str = merchant_id + dto.order_id + amount_kurus + merchant_salt
        token = base64.b64encode(
            hmac.new(merchant_key.encode(), hash_str.encode(), hashlib.sha256).digest()
        ).decode()

        data = {
            "merchant_id": merchant_id,
            "merchant_oid": dto.order_id,
            "return_amount": amount_kurus,
            "paytr_token": token,
        }
        raw = await self._post_form("/odeme/api/returnPayment", data)
        return GatewayResponse(
            success=raw.get("status") == "success",
            gateway_ref=dto.order_id,
            error_message=raw.get("err_no") if raw.get("status") != "success" else None,
            raw_response=raw,
        )

    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        # PayTR'da BIN query endpoint'i Direct API kullanıcılarına açıktır
        return BinQueryResponse(bin_number=dto.bin_number)

    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        return InstallmentQueryResponse(bin_number=dto.bin_number)

    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        return GatewayResponse(success=True, gateway_tx_id=dto.gateway_tx_id)

    async def test_connection(self) -> TestConnectionResponse:
        try:
            # PayTR için basit credential format kontrolü
            required = ["merchant_id", "merchant_key", "merchant_salt"]
            missing = [k for k in required if not self.credentials.get(k)]
            if missing:
                return TestConnectionResponse(success=False, message=f"Eksik alan: {', '.join(missing)}")
            return TestConnectionResponse(success=True, message="PayTR credential formatı geçerli")
        except Exception as e:
            return TestConnectionResponse(success=False, message=str(e))
