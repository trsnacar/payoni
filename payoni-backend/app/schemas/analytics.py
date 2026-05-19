from decimal import Decimal
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_revenue: Decimal
    total_transactions: int
    successful_transactions: int
    failed_transactions: int
    success_rate: float
    avg_transaction_amount: Decimal
    refunded_amount: Decimal
    period_days: int


class RevenueDataPoint(BaseModel):
    date: str
    revenue: Decimal
    transaction_count: int


class ProviderStats(BaseModel):
    provider_slug: str
    total_transactions: int
    successful_transactions: int
    total_revenue: Decimal
    success_rate: float


class SuccessRateDataPoint(BaseModel):
    date: str
    success_rate: float
    total: int
    successful: int


class SuccessRateResponse(BaseModel):
    overall_rate: float
    daily: list[SuccessRateDataPoint]
