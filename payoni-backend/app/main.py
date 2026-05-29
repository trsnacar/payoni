import os
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api.v1.router import router as v1_router
from app.api.public.pay import router as pay_router
from app.api.public.embed import router as embed_router
from app.gateways.factory import GatewayFactory
from app.core.middleware import RequestIDMiddleware, StructuredLoggingMiddleware, RateLimitMiddleware


async def _seed_dev_users():
    """Geliştirme ortamında demo kullanıcıları yoksa oluşturur."""
    if settings.ENVIRONMENT != "development":
        return
    import uuid
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.models.merchant import Merchant
    from app.core.security import hash_password

    DEMO_USERS = [
        {
            "email": "kullanici@payoni.com",
            "password": "Payoni2024!",
            "business_name": "Demo İşletme",
            "is_verified": True,
            "is_superuser": False,
            "onboarding_status": "approved",
        },
        {
            "email": "demo@payoni.com",
            "password": "Admin2024!",
            "business_name": "Payoni Admin",
            "is_verified": True,
            "is_superuser": True,
            "onboarding_status": "approved",
        },
    ]

    async with AsyncSessionLocal() as db:
        for u in DEMO_USERS:
            result = await db.execute(select(Merchant).where(Merchant.email == u["email"]))
            if result.scalar_one_or_none():
                continue
            merchant = Merchant(
                id=uuid.uuid4(),
                email=u["email"],
                password_hash=hash_password(u["password"]),
                business_name=u["business_name"],
                company_type="limited",
                tax_id="0000000000",
                tax_office="Ankara",
                trade_registry_no="DEMO0001",
                company_address="Demo Adres, Ankara",
                authorized_name="Demo Kullanıcı",
                authorized_title="Genel Müdür",
                authorized_tc="00000000000",
                authorized_phone="+905550000000",
                phone="+905550000000",
                is_verified=u["is_verified"],
                is_superuser=u["is_superuser"],
                onboarding_status=u["onboarding_status"],
            )
            db.add(merchant)
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    await _seed_dev_users()
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

# Uploads dizini
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
