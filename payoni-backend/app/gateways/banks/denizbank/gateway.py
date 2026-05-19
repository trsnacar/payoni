from app.gateways.banks.nestpay.gateway import NestPayBaseGateway


class DenizbankGateway(NestPayBaseGateway):
    SANDBOX_URL = "https://test.inter-vpos.com.tr/mpi/api/GetToken"
    PRODUCTION_URL = "https://inter-vpos.com.tr/mpi/api/GetToken"
    SANDBOX_3D_URL = "https://test.inter-vpos.com.tr/mpi/3DHost.aspx"
    PRODUCTION_3D_URL = "https://inter-vpos.com.tr/mpi/3DHost.aspx"
