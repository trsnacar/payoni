from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_merchant
from app.models.merchant import Merchant
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import AnalyticsSummary, RevenueDataPoint, ProviderStats, SuccessRateResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    period_days: int = Query(30, ge=1, le=365),
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)
    return await service.get_summary(merchant.id, period_days)


@router.get("/revenue", response_model=list[RevenueDataPoint])
async def get_revenue_chart(
    period_days: int = Query(30, ge=1, le=365),
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)
    return await service.get_revenue_chart(merchant.id, period_days)


@router.get("/providers", response_model=list[ProviderStats])
async def get_provider_stats(
    period_days: int = Query(30, ge=1, le=365),
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)
    return await service.get_provider_stats(merchant.id, period_days)


@router.get("/success-rate", response_model=SuccessRateResponse)
async def get_success_rate(
    period_days: int = Query(30, ge=1, le=365),
    merchant: Merchant = Depends(get_current_merchant),
    db: AsyncSession = Depends(get_db),
):
    service = AnalyticsService(db)
    return await service.get_success_rate(merchant.id, period_days)
