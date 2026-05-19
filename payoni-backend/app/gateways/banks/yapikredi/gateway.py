from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class YapiKrediGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://setmpos.ykb.com/PosnetWebService/XML"
    PRODUCTION_URL = "https://www.posnet.ykb.com/PosnetWebService/XML"
    SANDBOX_3D_URL = "https://setmpos.ykb.com/3DSWebService/YKBPaymentService"
    PRODUCTION_3D_URL = "https://www.posnet.ykb.com/3DSWebService/YKBPaymentService"
