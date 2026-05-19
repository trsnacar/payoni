from abc import ABC, abstractmethod

from app.gateways.dto import (
    SaleDTO, CancelDTO, RefundDTO, BinQueryDTO,
    InstallmentQueryDTO, TransactionQueryDTO, ThreeDCompleteDTO,
    GatewayResponse, ThreeDInitResponse, BinQueryResponse,
    InstallmentQueryResponse, TestConnectionResponse,
)


class BaseGateway(ABC):
    """
    Tüm 48 provider bu interface'i implement etmek zorundadır.
    Değiştirmeden önce iki kez düşün — her değişiklik 48 dosyayı etkiler.
    """

    def __init__(self, credentials: dict, environment: str = "production"):
        self.credentials = credentials
        self.environment = environment
        self.base_url = self._resolve_base_url()

    @abstractmethod
    def _resolve_base_url(self) -> str:
        """Sandbox vs production URL döner."""
        ...

    @abstractmethod
    async def sale(self, dto: SaleDTO) -> GatewayResponse:
        """Non-3D direkt ödeme."""
        ...

    @abstractmethod
    async def sale_3d_init(self, dto: SaleDTO) -> ThreeDInitResponse:
        """3D Secure akışını başlatır. HTML form veya redirect URL döner."""
        ...

    @abstractmethod
    async def sale_3d_complete(self, dto: ThreeDCompleteDTO) -> GatewayResponse:
        """Banka callback'inden sonra 3D ödemeyi tamamlar."""
        ...

    @abstractmethod
    async def cancel(self, dto: CancelDTO) -> GatewayResponse:
        """İşlemi iptal eder (void)."""
        ...

    @abstractmethod
    async def refund(self, dto: RefundDTO) -> GatewayResponse:
        """Kısmi veya tam iade."""
        ...

    @abstractmethod
    async def bin_query(self, dto: BinQueryDTO) -> BinQueryResponse:
        """BIN numarasına göre kart bilgisi sorgular."""
        ...

    @abstractmethod
    async def installment_query(self, dto: InstallmentQueryDTO) -> InstallmentQueryResponse:
        """Taksit seçeneklerini sorgular."""
        ...

    @abstractmethod
    async def transaction_query(self, dto: TransactionQueryDTO) -> GatewayResponse:
        """İşlem durumu sorgular."""
        ...

    async def test_connection(self) -> TestConnectionResponse:
        """Credential'ları doğrulamak için basit bağlantı testi. Alt sınıflar override edebilir."""
        try:
            dto = BinQueryDTO(bin_number="415956")
            await self.bin_query(dto)
            return TestConnectionResponse(success=True, message="Bağlantı başarılı")
        except Exception as e:
            return TestConnectionResponse(success=False, message=str(e))
