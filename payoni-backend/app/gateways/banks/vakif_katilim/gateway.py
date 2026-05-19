from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class VakifKatilimGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://ggtest.vakifkatilim.com.tr/VirtualPOS.Gateway/Home/Index"
    PRODUCTION_URL = "https://gg.vakifkatilim.com.tr/VirtualPOS.Gateway/Home/Index"
    SANDBOX_3D_URL = "https://ggtest.vakifkatilim.com.tr/VirtualPOS.Gateway/Home/ThreeDModelPayGate"
    PRODUCTION_3D_URL = "https://gg.vakifkatilim.com.tr/VirtualPOS.Gateway/Home/ThreeDModelPayGate"
