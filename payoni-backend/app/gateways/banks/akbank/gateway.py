from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class AkbankGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://testsanalpos.est.com.tr/servlet/cc5ApiServer"
    PRODUCTION_URL = "https://www.sanalakpos.com/servlet/cc5ApiServer"
    SANDBOX_3D_URL = "https://testsanalpos.est.com.tr/servlet/estgw"
    PRODUCTION_3D_URL = "https://www.sanalakpos.com/servlet/estgw"
