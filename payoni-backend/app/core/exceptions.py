from fastapi import HTTPException, status


class PayoniException(HTTPException):
    pass


class UnauthorizedException(PayoniException):
    def __init__(self, detail: str = "Kimlik doğrulama başarısız"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ForbiddenException(PayoniException):
    def __init__(self, detail: str = "Bu işlem için yetkiniz yok"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class NotFoundException(PayoniException):
    def __init__(self, detail: str = "Kayıt bulunamadı"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ConflictException(PayoniException):
    def __init__(self, detail: str = "Kayıt zaten mevcut"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ValidationException(PayoniException):
    def __init__(self, detail: str = "Geçersiz veri"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class PaymentException(PayoniException):
    def __init__(self, detail: str = "Ödeme işlemi başarısız"):
        super().__init__(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=detail)
