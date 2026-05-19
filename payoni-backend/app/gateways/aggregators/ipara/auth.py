"""
iPara kimlik doğrulama.
Hash: SHA1(private_key + client_id + transaction_id + amount + ... + private_key)
"""
import hashlib


def build_hash(private_key: str, client_id: str, order_id: str, amount: str,
               ok_url: str, fail_url: str, card_number: str, exp_year: str,
               exp_month: str, cvv: str, card_holder: str) -> str:
    raw = (
        private_key + client_id + order_id + amount + ok_url + fail_url
        + card_number + exp_year + exp_month + cvv + card_holder + private_key
    )
    return hashlib.sha1(raw.encode("utf-8")).hexdigest().upper()
