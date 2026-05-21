import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Cell,
} from 'recharts'
import {
  TrendingUp, CreditCard, CheckCircle, XCircle, ArrowRight,
  TrendingDown, Minus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { analyticsApi } from '@/api/analytics'
import { transactionsApi } from '@/api/transactions'
import { GaugeChart } from '@/components/charts/GaugeChart'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SkeletonCard } from '@/components/shared/SkeletonCard'
import { formatCurrency, formatDate } from '@/utils/format'

const PERIODS = [
  { label: '7 Gün',  value: 7  },
  { label: '30 Gün', value: 30 },
  { label: '90 Gün', value: 90 },
]

function fmt(v: string | number | undefined) {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function fmtShort(v: number) {
  if (v >= 1_000_000) return `₺${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `₺${(v / 1_000).toFixed(0)}K`
  return `₺${v.toFixed(0)}`
}

const PROVIDER_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']

export default function DashboardPage() {
  const [period, setPeriod] = useState(30)

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-summary', period],
    queryFn: () => analyticsApi.getSummary(period),
  })

  const { data: revenue = [], isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics-revenue', period],
    queryFn: () => analyticsApi.getRevenue(period),
  })

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ['analytics-providers', period],
    queryFn: () => analyticsApi.getProviders(period),
  })

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => transactionsApi.list({ per_page: 6 }),
  })

  const totalRevenue = parseFloat(summary?.total_revenue || '0')
  const refundedAmount = parseFloat(summary?.refunded_amount || '0')
  const netRevenue = totalRevenue - refundedAmount
  const successRate = summary?.success_rate ?? 0

  const chartData = revenue.map((d) => ({
    date: d.date.slice(5),
    revenue: parseFloat(d.revenue),
    count: d.transaction_count,
  }))

  const providerData = providers
    .sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue))
    .slice(0, 7)
    .map((p) => ({
      name: p.provider_slug,
      revenue: parseFloat(p.total_revenue),
      success: p.success_rate,
      count: p.total_transactions,
    }))

  const stats = [
    {
      label: 'Brüt Gelir',
      value: `₺${fmt(totalRevenue)}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Net Gelir',
      value: `₺${fmt(netRevenue)}`,
      icon: netRevenue >= 0 ? TrendingUp : TrendingDown,
      color: netRevenue >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: netRevenue >= 0 ? 'bg-emerald-50' : 'bg-red-50',
    },
    {
      label: 'Toplam İşlem',
      value: (summary?.total_transactions ?? 0).toLocaleString('tr-TR'),
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Başarılı',
      value: (summary?.successful_transactions ?? 0).toLocaleString('tr-TR'),
      icon: CheckCircle,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: 'Başarısız',
      value: (summary?.failed_transactions ?? 0).toLocaleString('tr-TR'),
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Ort. Tutar',
      value: `₺${fmt(summary?.avg_transaction_amount)}`,
      icon: Minus,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">İşletme özeti ve performans analizi</p>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                period === value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards — 6 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {summaryLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} lines={2} />)
          : stats.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-gray-500 leading-tight">{label}</p>
                  <div className={`${bg} p-1.5 rounded-lg shrink-0`}>
                    <Icon className={color} size={14} />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
              </div>
            ))}
      </div>

      {/* P&L özet + Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* P&L card */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Kar / Zarar Özeti</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Brüt Gelir</span>
              <span className="text-sm font-semibold text-gray-900">₺{fmt(totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-red-500">İade (−)</span>
              <span className="text-sm font-semibold text-red-600">−₺{fmt(refundedAmount)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-gray-50 rounded-xl px-3">
              <span className="text-sm font-bold text-gray-700">Net Gelir</span>
              <span className={`text-base font-bold ${netRevenue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ₺{fmt(netRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 text-xs text-gray-400">
              <span>Başarı Oranı</span>
              <span className="font-medium text-gray-600">%{successRate.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>Toplam İşlem</span>
              <span className="font-medium text-gray-600">{(summary?.total_transactions ?? 0).toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>

        {/* Success Rate Gauge */}
        <div className="card p-6 flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-gray-900 mb-2 self-start">Başarı Oranı</h2>
          {summaryLoading ? (
            <div className="w-40 h-28 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <>
              <GaugeChart value={successRate} size={180} />
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Düşük</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Orta</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />İyi</span>
              </div>
            </>
          )}
        </div>

        {/* Provider breakdown */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">POS Sağlayıcı Geliri</h2>
          {providersLoading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 rounded" />
              ))}
            </div>
          ) : providerData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-6">Henüz veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={providerData} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  formatter={(v: number) => [`₺${fmt(v)}`, 'Gelir']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="revenue" radius={4} maxBarSize={18}>
                  {providerData.map((_, idx) => (
                    <Cell key={idx} fill={PROVIDER_COLORS[idx % PROVIDER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Composed chart — gelir + işlem sayısı */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Günlük Gelir & İşlem Sayısı</h2>
          <div className="flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-indigo-400 inline-block" />Gelir</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block" />İşlem Sayısı</span>
          </div>
        </div>
        {revenueLoading ? (
          <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 40, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={fmtShort}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(v) => v.toLocaleString('tr-TR')}
              />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === 'Gelir'
                    ? [`₺${fmt(v)}`, 'Gelir']
                    : [v.toLocaleString('tr-TR'), 'İşlem']
                }
                contentStyle={{ fontSize: 12 }}
              />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="url(#revenueGradient)"
                radius={[4, 4, 0, 0]}
                name="Gelir"
                maxBarSize={32}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="count"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="İşlem Sayısı"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Son işlemler */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Son İşlemler</h2>
          <Link
            to="/dashboard/transactions"
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Tüm işlemleri gör
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentLoading && (
            <div className="px-6 py-4 space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-32" />
                    <div className="h-2.5 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              ))}
            </div>
          )}
          {!recentLoading &&
            recent?.items?.map((tx) => (
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
          {!recentLoading && !recent?.items?.length && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Henüz işlem bulunmuyor
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
