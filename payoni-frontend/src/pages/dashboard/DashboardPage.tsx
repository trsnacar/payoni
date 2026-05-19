import { useQuery } from '@tanstack/react-query'
import { TrendingUp, CreditCard, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { analyticsApi } from '@/api/analytics'
import { transactionsApi } from '@/api/transactions'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/utils/format'

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsApi.getSummary(30),
  })

  const { data: recent } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => transactionsApi.list({ per_page: 5 }),
  })

  const stats = [
    {
      label: 'Toplam Gelir (30 gün)',
      value: formatCurrency(summary?.total_revenue || '0'),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Toplam İşlem',
      value: summary?.total_transactions?.toLocaleString('tr-TR') || '0',
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Başarı Oranı',
      value: `%${summary?.success_rate?.toFixed(1) || '0'}`,
      icon: CheckCircle,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: 'İade Edilen',
      value: formatCurrency(summary?.refunded_amount || '0'),
      icon: RefreshCw,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Son 30 günlük özet</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${bg} p-2.5 rounded-xl`}>
                <Icon className={color} size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gelir grafiği */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Gelir Grafiği</h2>
        <RevenueChart />
      </div>

      {/* Son işlemler */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Son İşlemler</h2>
          <Link to="/transactions" className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
            Tüm işlemleri gör
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recent?.items?.map((tx) => (
            <div key={tx.id} className="px-6 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {tx.customer_name || tx.customer_email || 'Müşteri'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={tx.status} />
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            </div>
          ))}
          {!recent?.items?.length && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Henüz işlem bulunmuyor
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
