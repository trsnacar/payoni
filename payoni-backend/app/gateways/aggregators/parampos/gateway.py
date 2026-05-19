"""ParamPos payment gateway — SOAP/REST hybrid, API key auth."""
import httpx

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError


class ParamPosGateway(BaseGateway):
    SANDBOX_BASE = "https://test.param.com.tr/Pos/Pos.svc/rest"
    PRODUCTION_BASE = "https://pos.param.com.tr/Pos/Pos.svc/rest"

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_BASE if self.environment == "sandbox" else self.PRODUCTION_BASE

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _headers(self) -> dict:
        return {
            "client_code": self._cred("client_code"),
            "client_username": self._cred("client_username"),
            "client_password": self._cred("client_password"),
            "Content-Type": "application/json",
        }

    def _build_response(self, data: dict) -> GatewayResponse:
        result = data.get("Pos_OdemeResult") or data.get("UCD_OdemeResult") or data
        sonuc = str(result.get("Sonuc", "0"))
        approved = sonuc == "1"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=str(result.get("Islem_ID", "")),
            gateway_ref=str(result.get("Siparis_ID", "")),
            error_code=result.get("Sonuc_Str") if not approved else None,
            error_message=result.get("Hata_Mesaji") or result.get("Sonuc_Str") if not approved else None,
            raw_response=data,
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        payload = {
            "G": {"CLIENT_CODE": self._cred("client_code"),
                  "CLIENT_USERNAME": self._cred("client_username"),
                  "CLIENT_PASSWORD": self._cred("client_password")},
            "GUID": self._cred("guid"),
            "KK_Sahibi": dto.card.holder_name or "",
            "KK_No": dto.card.number,
            "KK_SK_Ay": dto.card.exp_month,
            "KK_SK_Yil": dto.card.exp_year,
            "KK_CVC": dto.card.cvv,
            "KK_Sahibi_GSM": "",
            "Hata_URL": "",
            "Basarili_URL": "",
            "Siparis_ID": dto.order_id,
            "Siparis_Aciklama": dto.description or "",
            "Taksit": str(dto.installments),
            "Tutar": str(dto.amount),
            "Islem_Guvenlik_Tip": "NS",
            "Islem_ID": "",
            "IPAdr": "",
            "Ref_URL": "",
            "Data1": "",
            "Data2": "",
            "Data3": "",
            "Data4": "",
            "Data5": "",
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{self._resolve_base_url()}/Pos_Odeme", json=payload)
            return self._build_response(resp.json())
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        payload = {
            "G": {"CLIENT_CODE": self._cred("client_code"),
                  "CLIENT_USERNAME": self._cred("client_username"),
                  "CLIENT_PASSWORD": self._cred("client_password")},
            "GUID": self._cred("guid"),
            "KK_Sahibi": dto.card.holder_name or "",
            "KK_No": dto.card.number,
            "KK_SK_Ay": dto.card.exp_month,
            "KK_SK_Yil": dto.card.exp_year,
            "KK_CVC": dto.card.cvv,
            "KK_Sahibi_GSM": "",
            "Hata_URL": dto.callback_url + "?result=fail",
            "Basarili_URL": dto.callback_url + "?result=success",
            "Siparis_ID": dto.order_id,
            "Siparis_Aciklama": dto.description or "",
            "Taksit": str(dto.installments),
            "Tutar": str(dto.amount),
            "Islem_Guvenlik_Tip": "3D",
            "Islem_ID": "",
            "IPAdr": "",
            "Ref_URL": "",
            "Data1": "", "Data2": "", "Data3": "", "Data4": "", "Data5": "",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self._resolve_base_url()}/Pos_Odeme", json=payload)
        data = resp.json()
        result = data.get("Pos_OdemeResult") or {}
        redirect = result.get("UCD_URL") or result.get("Redirect_URL", "")
        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            redirect_url=redirect or None,
            html_content=None,
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        raw = dto.raw_data or {}
        approved = str(raw.get("Sonuc", "0")) == "1"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=str(raw.get("Islem_ID", dto.order_id)),
            gateway_ref=str(raw.get("Siparis_ID", "")),
            error_code=None if approved else raw.get("Sonuc_Str"),
            error_message=None if approved else raw.get("Hata_Mesaji"),
            raw_response=raw,
        )

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        payload = {
            "G": {"CLIENT_CODE": self._cred("client_code"),
                  "CLIENT_USERNAME": self._cred("client_username"),
                  "CLIENT_PASSWORD": self._cred("client_password")},
            "GUID": self._cred("guid"),
            "Islem_ID": dto.gateway_tx_id,
            "Siparis_ID": "",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self._resolve_base_url()}/Islem_Iptal_Iade_Kismi", json=payload)
        return self._build_response(resp.json())

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        payload = {
            "G": {"CLIENT_CODE": self._cred("client_code"),
                  "CLIENT_USERNAME": self._cred("client_username"),
                  "CLIENT_PASSWORD": self._cred("client_password")},
            "GUID": self._cred("guid"),
            "Islem_ID": dto.gateway_tx_id,
            "Siparis_ID": "",
            "Tutar": str(dto.amount),
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self._resolve_base_url()}/Islem_Iptal_Iade_Kismi2", json=payload)
        return self._build_response(resp.json())

    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        return BinQueryResponse(bin=dto.bin, card_brand=None, card_type=None,
                                bank_name=None, is_commercial=None, country_code="TR")

    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        return InstallmentQueryResponse(options=[])

    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        return GatewayResponse(success=False, error_message="Not supported", raw_response={})
