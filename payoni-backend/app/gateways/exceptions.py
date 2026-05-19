class GatewayError(Exception):
    def __init__(self, message: str, code: str = None, raw_response: dict = None):
        super().__init__(message)
        self.code = code
        self.raw_response = raw_response or {}


class AuthenticationError(GatewayError):
    pass


class UnsupportedProviderError(GatewayError):
    pass


class ValidationError(GatewayError):
    pass


class NetworkError(GatewayError):
    pass


# Alias — gateway dosyalarında kullanılan isim
GatewayConnectionError = NetworkError
GatewayAuthError = AuthenticationError
