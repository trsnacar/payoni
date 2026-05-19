"""
NestPay (Asseco) XML imzalama.
3D Secure için hash: base64(sha512(password + storekey + amount + oid + okUrl + failUrl + currency + rnd + installment))
"""
import base64
import hashlib


def calculate_3d_hash(
    store_key: str,
    amount: str,
    oid: str,
    ok_url: str,
    fail_url: str,
    currency_code: str,
    rnd: str,
    installment: str,
    client_id: str,
    extra: str = "",
) -> str:
    """3D Secure init için hash hesaplar."""
    hash_str = (
        client_id + oid + amount + ok_url + fail_url +
        "Auth" + installment + rnd + extra + store_key
    )
    digest = hashlib.sha512(hash_str.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("utf-8")


def build_non3d_xml(
    client_id: str,
    username: str,
    password: str,
    card_number: str,
    exp_month: str,
    exp_year: str,
    cvv: str,
    amount: str,
    currency_code: str,
    oid: str,
    installment: str,
    description: str = "",
    tx_type: str = "Auth",
) -> str:
    """Non-3D ödeme XML paketi."""
    return f"""<?xml version="1.0" encoding="utf-8"?>
<CC5Request>
  <Name>{username}</Name>
  <Password>{password}</Password>
  <ClientId>{client_id}</ClientId>
  <Type>{tx_type}</Type>
  <Number>{card_number}</Number>
  <Expires>{exp_month}/{exp_year}</Expires>
  <Cvv2Val>{cvv}</Cvv2Val>
  <Total>{amount}</Total>
  <Currency>{currency_code}</Currency>
  <Oid>{oid}</Oid>
  <Instalment>{installment}</Instalment>
  <GroupId></GroupId>
  <TransId></TransId>
  <UserId></UserId>
  <Description>{description}</Description>
</CC5Request>"""


def build_cancel_xml(client_id: str, username: str, password: str, order_id: str) -> str:
    return f"""<?xml version="1.0" encoding="utf-8"?>
<CC5Request>
  <Name>{username}</Name>
  <Password>{password}</Password>
  <ClientId>{client_id}</ClientId>
  <Type>Void</Type>
  <OrderId>{order_id}</OrderId>
</CC5Request>"""


def build_refund_xml(
    client_id: str, username: str, password: str, order_id: str, amount: str, currency_code: str
) -> str:
    return f"""<?xml version="1.0" encoding="utf-8"?>
<CC5Request>
  <Name>{username}</Name>
  <Password>{password}</Password>
  <ClientId>{client_id}</ClientId>
  <Type>Credit</Type>
  <OrderId>{order_id}</OrderId>
  <Total>{amount}</Total>
  <Currency>{currency_code}</Currency>
</CC5Request>"""
