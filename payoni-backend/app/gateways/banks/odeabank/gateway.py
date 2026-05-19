from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class OdeabankGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://entegrasyon.asseco-see.com.tr/fim/api"
    PRODUCTION_URL = "https://sanalpos.odeabank.com/fim/api"
    SANDBOX_3D_URL = "https://entegrasyon.asseco-see.com.tr/fim/est3Dgate"
    PRODUCTION_3D_URL = "https://sanalpos.odeabank.com/fim/est3Dgate"
