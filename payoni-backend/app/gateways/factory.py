"""
GatewayFactory — 37 Türk ödeme sağlayıcısı (16 aggregator + 21 banka).
"""
from typing import Type

from app.gateways.base import BaseGateway
from app.gateways.exceptions import UnsupportedProviderError

# ── Aggregators ──────────────────────────────────────────────────────────────
from app.gateways.aggregators.iyzico.gateway import IyzicoGateway
from app.gateways.aggregators.paytr.gateway import PayTRGateway
from app.gateways.aggregators.morpara.gateway import MorParaGateway
from app.gateways.aggregators.sipay.gateway import SipayGateway
from app.gateways.aggregators.moka.gateway import MokaGateway
from app.gateways.aggregators.paratika.gateway import ParatikaGateway
from app.gateways.aggregators.payten.gateway import PaytenGateway
from app.gateways.aggregators.ipara.gateway import IParaGateway
from app.gateways.aggregators.tami.gateway import TamiGateway
from app.gateways.aggregators.ahlpay.gateway import AhlPayGateway
from app.gateways.aggregators.moneytolia.gateway import MoneytoliaGateway
from app.gateways.aggregators.rubikpara.gateway import RubikParaGateway
from app.gateways.aggregators.paynkolay.gateway import PayNKolayGateway
from app.gateways.aggregators.vepara.gateway import VeparaGateway
from app.gateways.aggregators.parampos.gateway import ParamPosGateway
from app.gateways.aggregators.paybull.gateway import PayBullGateway

# ── Banks (NestPay tabanlı) ───────────────────────────────────────────────────
from app.gateways.banks.garanti.gateway import GarantiGateway
from app.gateways.banks.akbank.gateway import AkbankGateway
from app.gateways.banks.isbank.gateway import IsBankGateway
from app.gateways.banks.vakifbank.gateway import VakifbankGateway
from app.gateways.banks.yapikredi.gateway import YapiKrediGateway
from app.gateways.banks.denizbank.gateway import DenizbankGateway
from app.gateways.banks.halkbank.gateway import HalkbankGateway
from app.gateways.banks.qnb_finansbank.gateway import QNBFinansbankGateway
from app.gateways.banks.ziraat.gateway import ZiraatGateway
from app.gateways.banks.sekerbank.gateway import SekerbankGateway
from app.gateways.banks.teb.gateway import TEBGateway
from app.gateways.banks.ing.gateway import INGGateway
from app.gateways.banks.anadolubank.gateway import AnadolubankGateway
from app.gateways.banks.alternatif_bank.gateway import AlternatifBankGateway
from app.gateways.banks.hsbc.gateway import HSBCGateway
from app.gateways.banks.odeabank.gateway import OdeabankGateway
from app.gateways.banks.fibabanka.gateway import FibabankaGateway
from app.gateways.banks.albaraka.gateway import AlbarakaGateway
from app.gateways.banks.kuveytturk.gateway import KuveytTurkGateway
from app.gateways.banks.vakif_katilim.gateway import VakifKatilimGateway
from app.gateways.banks.ziraat_katilim.gateway import ZiraatKatilimGateway


PROVIDER_MAP: dict[str, Type[BaseGateway]] = {
    # Aggregators
    "iyzico": IyzicoGateway,
    "paytr": PayTRGateway,
    "morpara": MorParaGateway,
    "sipay": SipayGateway,
    "moka": MokaGateway,
    "paratika": ParatikaGateway,
    "payten": PaytenGateway,
    "ipara": IParaGateway,
    "tami": TamiGateway,
    "ahlpay": AhlPayGateway,
    "moneytolia": MoneytoliaGateway,
    "rubikpara": RubikParaGateway,
    "paynkolay": PayNKolayGateway,
    "vepara": VeparaGateway,
    "parampos": ParamPosGateway,
    "paybull": PayBullGateway,
    # Banks
    "garanti": GarantiGateway,
    "akbank": AkbankGateway,
    "isbank": IsBankGateway,
    "vakifbank": VakifbankGateway,
    "yapikredi": YapiKrediGateway,
    "denizbank": DenizbankGateway,
    "halkbank": HalkbankGateway,
    "qnb_finansbank": QNBFinansbankGateway,
    "ziraat": ZiraatGateway,
    "sekerbank": SekerbankGateway,
    "teb": TEBGateway,
    "ing": INGGateway,
    "anadolubank": AnadolubankGateway,
    "alternatif_bank": AlternatifBankGateway,
    "hsbc": HSBCGateway,
    "odeabank": OdeabankGateway,
    "fibabanka": FibabankaGateway,
    "albaraka": AlbarakaGateway,
    "kuveytturk": KuveytTurkGateway,
    "vakif_katilim": VakifKatilimGateway,
    "ziraat_katilim": ZiraatKatilimGateway,
}

_NESTPAY_CREDS = [
    {"key": "client_id", "label": "Client ID", "type": "text", "required": True},
    {"key": "username", "label": "Kullanıcı Adı", "type": "text", "required": True},
    {"key": "password", "label": "Şifre", "type": "password", "required": True},
    {"key": "store_key", "label": "Store Key (3D Secure)", "type": "password", "required": True},
]

PROVIDER_CREDENTIALS_SCHEMA: dict[str, list[dict]] = {
    "iyzico": [
        {"key": "api_key", "label": "API Key", "type": "text", "required": True},
        {"key": "secret_key", "label": "Secret Key", "type": "password", "required": True},
    ],
    "paytr": [
        {"key": "merchant_id", "label": "Merchant ID", "type": "text", "required": True},
        {"key": "merchant_key", "label": "Merchant Key", "type": "password", "required": True},
        {"key": "merchant_salt", "label": "Merchant Salt", "type": "password", "required": True},
    ],
    "morpara": [
        {"key": "client_id", "label": "Client ID", "type": "text", "required": True},
        {"key": "client_secret", "label": "Client Secret", "type": "password", "required": True},
    ],
    "sipay": [
        {"key": "app_id", "label": "App ID", "type": "text", "required": True},
        {"key": "app_secret", "label": "App Secret", "type": "password", "required": True},
        {"key": "merchant_key", "label": "Merchant Key", "type": "password", "required": True},
    ],
    "moka": [
        {"key": "dealer_code", "label": "Dealer Code", "type": "text", "required": True},
        {"key": "username", "label": "Kullanıcı Adı", "type": "text", "required": True},
        {"key": "password", "label": "Şifre", "type": "password", "required": True},
    ],
    "paratika": [
        {"key": "merchant_id", "label": "Merchant ID", "type": "text", "required": True},
        {"key": "api_key", "label": "API Key", "type": "password", "required": True},
    ],
    "payten": [
        {"key": "client_id", "label": "Client ID", "type": "text", "required": True},
        {"key": "client_secret", "label": "Client Secret", "type": "password", "required": True},
    ],
    "ipara": [
        {"key": "public_key", "label": "Public Key", "type": "text", "required": True},
        {"key": "private_key", "label": "Private Key", "type": "password", "required": True},
    ],
    "tami": [
        {"key": "api_key", "label": "API Key", "type": "password", "required": True},
    ],
    "ahlpay": [
        {"key": "merchant_id", "label": "Merchant ID", "type": "text", "required": True},
        {"key": "api_secret", "label": "API Secret", "type": "password", "required": True},
    ],
    "moneytolia": [
        {"key": "api_key", "label": "API Key", "type": "text", "required": True},
        {"key": "api_secret", "label": "API Secret", "type": "password", "required": True},
    ],
    "rubikpara": [
        {"key": "api_key", "label": "API Key", "type": "password", "required": True},
    ],
    "paynkolay": [
        {"key": "api_key", "label": "API Key", "type": "text", "required": True},
        {"key": "secret_key", "label": "Secret Key", "type": "password", "required": True},
    ],
    "vepara": [
        {"key": "app_id", "label": "App ID", "type": "text", "required": True},
        {"key": "app_secret", "label": "App Secret", "type": "password", "required": True},
        {"key": "merchant_key", "label": "Merchant Key", "type": "password", "required": True},
    ],
    "parampos": [
        {"key": "client_code", "label": "Client Code", "type": "text", "required": True},
        {"key": "client_username", "label": "Client Username", "type": "text", "required": True},
        {"key": "client_password", "label": "Client Password", "type": "password", "required": True},
        {"key": "guid", "label": "GUID", "type": "text", "required": True},
    ],
    "paybull": [
        {"key": "app_id", "label": "App ID", "type": "text", "required": True},
        {"key": "app_secret", "label": "App Secret", "type": "password", "required": True},
        {"key": "merchant_key", "label": "Merchant Key", "type": "password", "required": True},
    ],
    # NestPay bankalar (hepsi aynı credential yapısı)
    **{
        slug: _NESTPAY_CREDS
        for slug in [
            "garanti", "akbank", "isbank", "vakifbank", "yapikredi",
            "denizbank", "halkbank", "qnb_finansbank", "ziraat",
            "sekerbank", "teb", "ing", "anadolubank", "alternatif_bank",
            "hsbc", "odeabank", "fibabanka", "albaraka",
            "kuveytturk", "vakif_katilim", "ziraat_katilim",
        ]
    },
}

def _logo(domain: str) -> str:
    return f"https://logo.clearbit.com/{domain}"


PROVIDER_LIST = [
    # Aggregators
    {"slug": "iyzico",     "name": "iyzico",       "category": "aggregator", "logo": _logo("iyzico.com")},
    {"slug": "paytr",      "name": "PayTR",         "category": "aggregator", "logo": _logo("paytr.com")},
    {"slug": "morpara",    "name": "MorPara",       "category": "aggregator", "logo": _logo("morpara.com.tr")},
    {"slug": "sipay",      "name": "Sipay",         "category": "aggregator", "logo": _logo("sipay.com.tr")},
    {"slug": "moka",       "name": "Moka",          "category": "aggregator", "logo": _logo("mokahq.com")},
    {"slug": "paratika",   "name": "Paratika",      "category": "aggregator", "logo": _logo("paratika.com.tr")},
    {"slug": "payten",     "name": "Payten",        "category": "aggregator", "logo": _logo("payten.com")},
    {"slug": "ipara",      "name": "iPara",         "category": "aggregator", "logo": _logo("ipara.com.tr")},
    {"slug": "tami",       "name": "Tami",          "category": "aggregator", "logo": _logo("tami.com.tr")},
    {"slug": "ahlpay",     "name": "AhlPay",        "category": "aggregator", "logo": _logo("ahlpay.com.tr")},
    {"slug": "moneytolia", "name": "Moneytolia",    "category": "aggregator", "logo": _logo("moneytolia.com")},
    {"slug": "rubikpara",  "name": "RubikPara",     "category": "aggregator", "logo": _logo("rubikpara.com")},
    {"slug": "paynkolay",  "name": "PayNKolay",     "category": "aggregator", "logo": _logo("paynkolay.com.tr")},
    {"slug": "vepara",     "name": "Vepara",        "category": "aggregator", "logo": _logo("vepara.com")},
    {"slug": "parampos",   "name": "ParamPos",      "category": "aggregator", "logo": _logo("param.com.tr")},
    {"slug": "paybull",    "name": "PayBull",       "category": "aggregator", "logo": _logo("paybull.com.tr")},
    # Banks
    {"slug": "garanti",        "name": "Garanti BBVA",   "category": "bank", "logo": _logo("garantibbva.com.tr")},
    {"slug": "akbank",         "name": "Akbank",         "category": "bank", "logo": _logo("akbank.com")},
    {"slug": "isbank",         "name": "İş Bankası",     "category": "bank", "logo": _logo("isbank.com.tr")},
    {"slug": "vakifbank",      "name": "VakıfBank",      "category": "bank", "logo": _logo("vakifbank.com.tr")},
    {"slug": "yapikredi",      "name": "Yapı Kredi",     "category": "bank", "logo": _logo("yapikredi.com.tr")},
    {"slug": "denizbank",      "name": "DenizBank",      "category": "bank", "logo": _logo("denizbank.com")},
    {"slug": "halkbank",       "name": "Halkbank",       "category": "bank", "logo": _logo("halkbank.com.tr")},
    {"slug": "qnb_finansbank", "name": "QNB Finansbank", "category": "bank", "logo": _logo("qnbfinansbank.com")},
    {"slug": "ziraat",         "name": "Ziraat Bankası", "category": "bank", "logo": _logo("ziraatbank.com.tr")},
    {"slug": "sekerbank",      "name": "Şekerbank",      "category": "bank", "logo": _logo("sekerbank.com.tr")},
    {"slug": "teb",            "name": "TEB",            "category": "bank", "logo": _logo("teb.com.tr")},
    {"slug": "ing",            "name": "ING Bank",       "category": "bank", "logo": _logo("ing.com.tr")},
    {"slug": "anadolubank",    "name": "Anadolubank",    "category": "bank", "logo": _logo("anadolubank.com.tr")},
    {"slug": "alternatif_bank","name": "Alternatif Bank","category": "bank", "logo": _logo("alternatifbank.com.tr")},
    {"slug": "hsbc",           "name": "HSBC",           "category": "bank", "logo": _logo("hsbc.com.tr")},
    {"slug": "odeabank",       "name": "Odeabank",       "category": "bank", "logo": _logo("odeabank.com")},
    {"slug": "fibabanka",      "name": "Fibabanka",      "category": "bank", "logo": _logo("fibabanka.com.tr")},
    {"slug": "albaraka",       "name": "Albaraka Türk",  "category": "bank", "logo": _logo("albarakatturk.com.tr")},
    {"slug": "kuveytturk",     "name": "Kuveyt Türk",    "category": "bank", "logo": _logo("kuveytturk.com.tr")},
    {"slug": "vakif_katilim",  "name": "Vakıf Katılım",  "category": "bank", "logo": _logo("vakifkatilim.com.tr")},
    {"slug": "ziraat_katilim", "name": "Ziraat Katılım", "category": "bank", "logo": _logo("ziraatkatilim.com.tr")},
]


class GatewayFactory:
    @staticmethod
    def create(provider_slug: str, credentials: dict, environment: str = "production") -> BaseGateway:
        cls = PROVIDER_MAP.get(provider_slug)
        if cls is None:
            raise UnsupportedProviderError(f"Desteklenmeyen provider: {provider_slug}")
        return cls(credentials=credentials, environment=environment)

    @staticmethod
    def get_credentials_schema(provider_slug: str) -> list[dict]:
        return PROVIDER_CREDENTIALS_SCHEMA.get(provider_slug, [])

    @staticmethod
    def list_providers() -> list[dict]:
        return PROVIDER_LIST

    @staticmethod
    def is_supported(provider_slug: str) -> bool:
        return provider_slug in PROVIDER_MAP
