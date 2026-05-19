"""
NestPay (Asseco) tabanlı bankalar için temel gateway sınıfı.
Garanti, Akbank, İş Bankası, Vakıfbank, Yapı Kredi ve diğer ~20 banka bu sınıfı kullanır.
"""
import uuid
import httpx
import xml.etree.ElementTree as ET

from app.gateways.base import BaseGateway
from app.gateways.dto import (
    SaleDTO, GatewayResponse, ThreeDInitResponse, ThreeDCompleteDTO,
    CancelDTO, RefundDTO, BinQueryDTO, BinQueryResponse,
    InstallmentQueryDTO, InstallmentQueryResponse, TransactionQueryDTO,
)
from app.gateways.exceptions import GatewayConnectionError, GatewayAuthError
from .auth import (
    calculate_3d_hash, build_non3d_xml, build_cancel_xml, build_refund_xml
)


class NestPayBaseGateway(BaseGateway):
    """
    NestPay XML protokolünü kullanan banka gateway'leri için temel sınıf.
    Alt sınıfların _resolve_base_url() ve _get_3d_url() metodlarını override etmesi gerekir.
    """

    SANDBOX_URL: str = ""
    PRODUCTION_URL: str = ""
    SANDBOX_3D_URL: str = ""
    PRODUCTION_3D_URL: str = ""

    def _resolve_base_url(self) -> str:
        return self.SANDBOX_URL if self.environment == "sandbox" else self.PRODUCTION_URL

    def _resolve_3d_url(self) -> str:
        return self.SANDBOX_3D_URL if self.environment == "sandbox" else self.PRODUCTION_3D_URL

    def _cred(self, key: str) -> str:
        return self.credentials.get(key, "")

    def _parse_xml_response(self, xml_text: str) -> dict:
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            return {"Response": "Error", "ErrMsg": "Invalid XML response"}
        return {child.tag: (child.text or "") for child in root}

    def _to_gateway_response(self, parsed: dict, raw: str) -> GatewayResponse:
        response_code = parsed.get("Response", "").strip()
        approved = response_code == "Approved"
        return GatewayResponse(
            success=approved,
            gateway_tx_id=parsed.get("TransId") or parsed.get("OrderId"),
            gateway_ref=parsed.get("AuthCode"),
            error_code=parsed.get("ProcReturnCode") if not approved else None,
            error_message=parsed.get("ErrMsg") if not approved else None,
            raw_response={"xml": raw, "parsed": parsed},
        )

    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        xml_body = build_non3d_xml(
            client_id=self._cred("client_id"),
            username=self._cred("username"),
            password=self._cred("password"),
            card_number=dto.card.number,
            exp_month=dto.card.exp_month,
            exp_year=dto.card.exp_year,
            cvv=dto.card.cvv,
            amount=str(dto.amount),
            currency_code=dto.currency,
            oid=dto.order_id,
            installment=str(dto.installments) if dto.installments > 1 else "",
            description=dto.description or "",
        )
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self._resolve_base_url(),
                    content=xml_body.encode("utf-8"),
                    headers={"Content-Type": "text/xml; charset=utf-8"},
                )
            parsed = self._parse_xml_response(resp.text)
            return self._to_gateway_response(parsed, resp.text)
        except httpx.TimeoutException:
            raise GatewayConnectionError("NestPay bağlantı zaman aşımı")
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        store_key = self._cred("store_key")
        client_id = self._cred("client_id")
        rnd = uuid.uuid4().hex
        installment = str(dto.installments) if dto.installments > 1 else ""

        hash_val = calculate_3d_hash(
            store_key=store_key,
            amount=str(dto.amount),
            oid=dto.order_id,
            ok_url=dto.callback_url + "?result=success",
            fail_url=dto.callback_url + "?result=fail",
            currency_code=dto.currency,
            rnd=rnd,
            installment=installment,
            client_id=client_id,
        )

        form_params = {
            "clientid": client_id,
            "storetype": "3d_pay",
            "amount": str(dto.amount),
            "oid": dto.order_id,
            "okUrl": dto.callback_url + "?result=success",
            "failUrl": dto.callback_url + "?result=fail",
            "rnd": rnd,
            "hash": hash_val,
            "currency": dto.currency,
            "Instalment": installment,
            "pan": dto.card.number,
            "Ecom_Payment_Card_ExpDate_Month": dto.card.exp_month,
            "Ecom_Payment_Card_ExpDate_Year": dto.card.exp_year,
            "cv2": dto.card.cvv,
            "cardHolderName": dto.card.holder_name or "",
            "lang": "tr",
        }

        # HTML auto-submit formu oluştur
        inputs = "\n".join(
            f'  <input type="hidden" name="{k}" value="{v}" />'
            for k, v in form_params.items()
        )
        html_content = (
            f'<form id="nestpay3d" action="{self._resolve_3d_url()}" method="POST">\n'
            f"{inputs}\n"
            f'</form>\n'
            f'<script>document.getElementById("nestpay3d").submit();</script>'
        )

        return ThreeDInitResponse(
            conversation_id=dto.order_id,
            html_content=html_content,
            redirect_url=None,
        )

    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        # NestPay 3D callback doğrudan bankadan gelir; payload zaten doğrulanmış
        # webhook_service tarafından çağrıldığında dto.raw_data içinde form POST verileri olur
        raw = dto.raw_data or {}
        response_code = raw.get("Response", "")
        md_status = raw.get("mdStatus", "0")
        approved = response_code == "Approved" and md_status in ("1", "2", "3", "4")
        return GatewayResponse(
            success=approved,
            gateway_tx_id=raw.get("TransId") or raw.get("oid"),
            gateway_ref=raw.get("AuthCode"),
            error_code=raw.get("ProcReturnCode") if not approved else None,
            error_message=raw.get("ErrMsg") if not approved else None,
            raw_response=raw,
        )

    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        xml_body = build_cancel_xml(
            client_id=self._cred("client_id"),
            username=self._cred("username"),
            password=self._cred("password"),
            order_id=dto.gateway_tx_id,
        )
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self._resolve_base_url(),
                    content=xml_body.encode("utf-8"),
                    headers={"Content-Type": "text/xml; charset=utf-8"},
                )
            parsed = self._parse_xml_response(resp.text)
            return self._to_gateway_response(parsed, resp.text)
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        xml_body = build_refund_xml(
            client_id=self._cred("client_id"),
            username=self._cred("username"),
            password=self._cred("password"),
            order_id=dto.gateway_tx_id,
            amount=str(dto.amount),
            currency_code=dto.currency,
        )
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self._resolve_base_url(),
                    content=xml_body.encode("utf-8"),
                    headers={"Content-Type": "text/xml; charset=utf-8"},
                )
            parsed = self._parse_xml_response(resp.text)
            return self._to_gateway_response(parsed, resp.text)
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))

    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        # NestPay protokolü BIN sorgusu desteklemez; temel implementasyon
        return BinQueryResponse(
            bin=dto.bin,
            card_brand=None,
            card_type=None,
            bank_name=None,
            is_commercial=None,
            country_code="TR",
        )

    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        return InstallmentQueryResponse(options=[])

    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        xml_body = f"""<?xml version="1.0" encoding="utf-8"?>
<CC5Request>
  <Name>{self._cred("username")}</Name>
  <Password>{self._cred("password")}</Password>
  <ClientId>{self._cred("client_id")}</ClientId>
  <Type>OrderInquiry</Type>
  <OrderId>{dto.gateway_tx_id}</OrderId>
</CC5Request>"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    self._resolve_base_url(),
                    content=xml_body.encode("utf-8"),
                    headers={"Content-Type": "text/xml; charset=utf-8"},
                )
            parsed = self._parse_xml_response(resp.text)
            return self._to_gateway_response(parsed, resp.text)
        except httpx.RequestError as e:
            raise GatewayConnectionError(str(e))
