from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class QNBFinansbankGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://vpostest.qnbfinansbank.com/Gateway/XMLGate.aspx"
    PRODUCTION_URL = "https://vpos.qnbfinansbank.com/Gateway/XMLGate.aspx"
    SANDBOX_3D_URL = "https://vpostest.qnbfinansbank.com/Gateway/Default.aspx"
    PRODUCTION_3D_URL = "https://vpos.qnbfinansbank.com/Gateway/Default.aspx"
