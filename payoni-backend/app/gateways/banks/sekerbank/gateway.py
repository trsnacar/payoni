from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class SekerbankGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://entegrasyon.asseco-see.com.tr/fim/api"
    PRODUCTION_URL = "https://sanalpos.sekerbank.com.tr/fim/api"
    SANDBOX_3D_URL = "https://entegrasyon.asseco-see.com.tr/fim/est3Dgate"
    PRODUCTION_3D_URL = "https://sanalpos.sekerbank.com.tr/fim/est3Dgate"
