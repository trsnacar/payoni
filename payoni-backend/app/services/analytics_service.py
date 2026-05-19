from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction
from app.models.pos_account import PosAccount
from app.schemas.analytics import AnalyticsSummary, RevenueDataPoint, ProviderStats, SuccessRateResponse, SuccessRateDataPoint


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(self, merchant_id: uuid.UUID, period_days: int) -> AnalyticsSummary:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)
        base = and_(Transaction.merchant_id == merchant_id, Transaction.created_at >= since)

        result = await self.db.execute(
            select(
                func.count().label("total"),
                func.sum(case((Transaction.status == "captured", 1), else_=0)).label("successful"),
                func.sum(case((Transaction.status == "failed", 1), else_=0)).label("failed"),
                func.coalesce(func.sum(case((Transaction.status == "captured", Transaction.amount), else_=0)), 0).label("revenue"),
                func.coalesce(func.avg(case((Transaction.status == "captured", Transaction.amount), else_=None)), 0).label("avg_amount"),
                func.coalesce(func.sum(Transaction.refunded_amount), 0).label("refunded"),
            ).where(base)
        )
        row = result.one()

        total = row.total or 0
        successful = row.successful or 0
        success_rate = (successful / total * 100) if total > 0 else 0.0

        return AnalyticsSummary(
            total_revenue=Decimal(str(row.revenue)),
            total_transactions=total,
            successful_transactions=successful,
            failed_transactions=row.failed or 0,
            success_rate=round(success_rate, 2),
            avg_transaction_amount=Decimal(str(row.avg_amount)),
            refunded_amount=Decimal(str(row.refunded)),
            period_days=period_days,
        )

    async def get_revenue_chart(self, merchant_id: uuid.UUID, period_days: int) -> list[RevenueDataPoint]:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)

        result = await self.db.execute(
            select(
                func.date(Transaction.created_at).label("date"),
                func.coalesce(func.sum(Transaction.amount), 0).label("revenue"),
                func.count().label("count"),
            )
            .where(
                Transaction.merchant_id == merchant_id,
                Transaction.created_at >= since,
                Transaction.status == "captured",
            )
            .group_by(func.date(Transaction.created_at))
            .order_by(func.date(Transaction.created_at))
        )

        return [
            RevenueDataPoint(
                date=str(row.date),
                revenue=Decimal(str(row.revenue)),
                transaction_count=row.count,
            )
            for row in result
        ]

    async def get_provider_stats(self, merchant_id: uuid.UUID, period_days: int) -> list[ProviderStats]:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)

        result = await self.db.execute(
            select(
                PosAccount.provider_slug,
                func.count(Transaction.id).label("total"),
                func.sum(case((Transaction.status == "captured", 1), else_=0)).label("successful"),
                func.coalesce(func.sum(case((Transaction.status == "captured", Transaction.amount), else_=0)), 0).label("revenue"),
            )
            .join(PosAccount, Transaction.pos_account_id == PosAccount.id)
            .where(
                Transaction.merchant_id == merchant_id,
                Transaction.created_at >= since,
            )
            .group_by(PosAccount.provider_slug)
        )

        stats = []
        for row in result:
            total = row.total or 0
            successful = row.successful or 0
            success_rate = (successful / total * 100) if total > 0 else 0.0
            stats.append(ProviderStats(
                provider_slug=row.provider_slug,
                total_transactions=total,
                successful_transactions=successful,
                total_revenue=Decimal(str(row.revenue)),
                success_rate=round(success_rate, 2),
            ))
        return stats

    async def get_success_rate(self, merchant_id: uuid.UUID, period_days: int) -> SuccessRateResponse:
        since = datetime.now(timezone.utc) - timedelta(days=period_days)

        # Genel oran
        overall_result = await self.db.execute(
            select(
                func.count().label("total"),
                func.sum(case((Transaction.status == "captured", 1), else_=0)).label("successful"),
            ).where(
                Transaction.merchant_id == merchant_id,
                Transaction.created_at >= since,
            )
        )
        row = overall_result.one()
        total = row.total or 0
        successful = row.successful or 0
        overall_rate = round((successful / total * 100) if total > 0 else 0.0, 2)

        # Günlük breakdown
        daily_result = await self.db.execute(
            select(
                func.date(Transaction.created_at).label("date"),
                func.count().label("total"),
                func.sum(case((Transaction.status == "captured", 1), else_=0)).label("successful"),
            )
            .where(
                Transaction.merchant_id == merchant_id,
                Transaction.created_at >= since,
            )
            .group_by(func.date(Transaction.created_at))
            .order_by(func.date(Transaction.created_at))
        )

        daily = []
        for r in daily_result:
            d_total = r.total or 0
            d_successful = r.successful or 0
            daily.append(SuccessRateDataPoint(
                date=str(r.date),
                success_rate=round((d_successful / d_total * 100) if d_total > 0 else 0.0, 2),
                total=d_total,
                successful=d_successful,
            ))

        return SuccessRateResponse(overall_rate=overall_rate, daily=daily)
