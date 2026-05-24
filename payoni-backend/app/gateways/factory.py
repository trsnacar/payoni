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

def _gfavicon(domain: str) -> str:
    return f"https://www.google.com/s2/favicons?sz=128&domain={domain}"


def _entry(slug: str, name: str, category: str, domain: str, color: str = "#6366f1") -> dict:
    return {
        "slug": slug,
        "name": name,
        "category": category,
        "logo": _logo(domain),
        "logo_fallback": _gfavicon(domain),
        "color": color,
    }


PROVIDER_LIST = [
    # Aggregators
    _entry("iyzico",     "iyzico",       "aggregator", "iyzico.com",        "#6a0dad"),
    _entry("paytr",      "PayTR",        "aggregator", "paytr.com",         "#0066cc"),
    _entry("morpara",    "MorPara",      "aggregator", "morpara.com.tr",    "#8b5cf6"),
    _entry("sipay",      "Sipay",        "aggregator", "sipay.com.tr",      "#0ea5e9"),
    _entry("moka",       "Moka",         "aggregator", "mokahq.com",        "#f59e0b"),
    _entry("paratika",   "Paratika",     "aggregator", "paratika.com.tr",   "#10b981"),
    _entry("payten",     "Payten",       "aggregator", "payten.com",        "#3b82f6"),
    _entry("ipara",      "iPara",        "aggregator", "ipara.com.tr",      "#6366f1"),
    _entry("tami",       "Tami",         "aggregator", "tami.com.tr",       "#14b8a6"),
    _entry("ahlpay",     "AhlPay",       "aggregator", "ahlpay.com.tr",     "#f97316"),
    _entry("moneytolia", "Moneytolia",   "aggregator", "moneytolia.com",    "#8b5cf6"),
    _entry("rubikpara",  "RubikPara",    "aggregator", "rubikpara.com",     "#ef4444"),
    _entry("paynkolay",  "PayNKolay",    "aggregator", "paynkolay.com.tr",  "#22c55e"),
    _entry("vepara",     "Vepara",       "aggregator", "vepara.com",        "#a855f7"),
    _entry("parampos",   "ParamPos",     "aggregator", "param.com.tr",      "#0284c7"),
    _entry("paybull",    "PayBull",      "aggregator", "paybull.com.tr",    "#dc2626"),
    # Banks
    _entry("garanti",        "Garanti BBVA",   "bank", "garantibbva.com.tr", "#00a651"),
    _entry("akbank",         "Akbank",         "bank", "akbank.com",         "#e30613"),
    _entry("isbank",         "İş Bankası",     "bank", "isbank.com.tr",      "#005ca9"),
    _entry("vakifbank",      "VakıfBank",      "bank", "vakifbank.com.tr",   "#009f4d"),
    _entry("yapikredi",      "Yapı Kredi",     "bank", "yapikredi.com.tr",   "#003087"),
    _entry("denizbank",      "DenizBank",      "bank", "denizbank.com",      "#0066b3"),
    _entry("halkbank",       "Halkbank",       "bank", "halkbank.com.tr",    "#004b87"),
    _entry("qnb_finansbank", "QNB Finansbank", "bank", "qnbfinansbank.com",  "#861f41"),
    _entry("ziraat",         "Ziraat Bankası", "bank", "ziraatbank.com.tr",  "#e2001a"),
    _entry("sekerbank",      "Şekerbank",      "bank", "sekerbank.com.tr",   "#f7941d"),
    _entry("teb",            "TEB",            "bank", "teb.com.tr",         "#003087"),
    _entry("ing",            "ING Bank",       "bank", "ing.com.tr",         "#ff6200"),
    _entry("anadolubank",    "Anadolubank",    "bank", "anadolubank.com.tr", "#003580"),
    _entry("alternatif_bank","Alternatif Bank","bank", "alternatifbank.com.tr","#004b87"),
    _entry("hsbc",           "HSBC",           "bank", "hsbc.com.tr",        "#db0011"),
    _entry("odeabank",       "Odeabank",       "bank", "odeabank.com",       "#6d2077"),
    _entry("fibabanka",      "Fibabanka",      "bank", "fibabanka.com.tr",   "#e60013"),
    _entry("albaraka",       "Albaraka Türk",  "bank", "albaraka.com.tr",    "#006838"),
    _entry("kuveytturk",     "Kuveyt Türk",    "bank", "kuveytturk.com.tr",  "#00843d"),
    _entry("vakif_katilim",  "Vakıf Katılım",  "bank", "vakifkatilim.com.tr","#009f4d"),
    _entry("ziraat_katilim", "Ziraat Katılım", "bank", "ziraatkatilim.com.tr","#e2001a"),
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
