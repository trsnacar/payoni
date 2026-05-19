from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class VakifbankGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://onlineodemetest.vakifbank.com.tr:4443/fim/api"
    PRODUCTION_URL = "https://onlineodeme.vakifbank.com.tr:4443/fim/api"
    SANDBOX_3D_URL = "https://onlineodemetest.vakifbank.com.tr:4443/fim/est3Dgate"
    PRODUCTION_3D_URL = "https://onlineodeme.vakifbank.com.tr:4443/fim/est3Dgate"
