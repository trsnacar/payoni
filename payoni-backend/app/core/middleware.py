"""
Rate limiting (Redis sliding window) ve request ID middleware.
"""
import time
import uuid
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = structlog.get_logger()


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis sliding window rate limiter.
    Auth endpoint'leri: 5 req/dk per IP
    Ödeme endpoint'leri: 30 req/dk per IP
    Diğer: 120 req/dk per IP
    """

    LIMITS = {
        "/api/v1/auth": (5, 60),
        "/api/v1/payments": (30, 60),
        "/pay/": (10, 60),
        "/embed/": (10, 60),
    }
    DEFAULT_LIMIT = (120, 60)

    async def dispatch(self, request: Request, call_next):
        redis = getattr(request.app.state, "redis", None)
        if redis is None:
            return await call_next(request)

        path = request.url.path
        limit, window = self.DEFAULT_LIMIT
        for prefix, (lim, win) in self.LIMITS.items():
            if path.startswith(prefix):
                limit, window = lim, win
                break

        client_ip = request.client.host if request.client else "unknown"
        key = f"rl:{client_ip}:{path.split('/')[2] if path.count('/') >= 2 else path}"
        now = int(time.time() * 1000)
        window_ms = window * 1000

        try:
            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, 0, now - window_ms)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window)
            results = await pipe.execute()
            count = results[2]
        except Exception:
            # Redis erişilemiyorsa isteği geçir
            return await call_next(request)

        if count > limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Çok fazla istek. Lütfen biraz bekleyin."},
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        request_id = getattr(request.state, "request_id", "-")

        response = await call_next(request)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=elapsed_ms,
            request_id=request_id,
            ip=request.client.host if request.client else None,
        )
        return response
