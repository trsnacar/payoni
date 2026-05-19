from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class GarantiGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://sanalposprovtest.garanti.com.tr/servlet/gt3dengine"
    PRODUCTION_URL = "https://sanalposprov.garanti.com.tr/servlet/gt3dengine"
    SANDBOX_3D_URL = "https://sanalposprovtest.garanti.com.tr/servlet/gt3dengine"
    PRODUCTION_3D_URL = "https://sanalposprov.garanti.com.tr/servlet/gt3dengine"
