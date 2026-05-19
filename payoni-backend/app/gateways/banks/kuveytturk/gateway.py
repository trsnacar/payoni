from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class KuveytTurkGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://boatest.kuveytturk.com.tr/boa.virtualpos.services/Home/ThreeDModelPayGate"
    PRODUCTION_URL = "https://boa.kuveytturk.com.tr/sanalposservice/Home/ThreeDModelPayGate"
    SANDBOX_3D_URL = "https://boatest.kuveytturk.com.tr/boa.virtualpos.services/Home/ThreeDModelPayGate"
    PRODUCTION_3D_URL = "https://boa.kuveytturk.com.tr/sanalposservice/Home/ThreeDModelPayGate"
