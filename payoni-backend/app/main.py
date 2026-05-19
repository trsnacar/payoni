from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api.v1.router import router as v1_router
from app.api.public.pay import router as pay_router
from app.api.public.embed import router as embed_router
from app.gateways.factory import GatewayFactory
from app.core.middleware import RequestIDMiddleware, StructuredLoggingMiddleware, RateLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    yield
    await app.state.redis.aclose()


app = FastAPI(
    title="Payoni API",
    description="Türk Ödeme Agregator Platformu",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(StructuredLoggingMiddleware)

# API v1 rotaları
app.include_router(v1_router)

# Public rotalar (auth gerektirmez)
app.include_router(pay_router)
app.include_router(embed_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    # DB ve Redis ping
    try:
        from app.db.session import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception as e:
        return JSONResponse({"status": "not_ready", "detail": str(e)}, status_code=503)
    return {"status": "ready"}


@app.get("/api/v1/providers")
async def list_providers():
    """Desteklenen ödeme provider listesi + credential şeması."""
    return {
        "providers": GatewayFactory.list_providers(),
        "schemas": {
            p["slug"]: GatewayFactory.get_credentials_schema(p["slug"])
            for p in GatewayFactory.list_providers()
        },
    }
