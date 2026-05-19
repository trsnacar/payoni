import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { analyticsApi } from '@/api/analytics'
import { formatCurrency } from '@/utils/format'

const PERIOD_OPTIONS = [
  { label: '7 gün', value: 7 },
  { label: '30 gün', value: 30 },
  { label: '90 gün', value: 90 },
]

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(30)

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary', period],
    queryFn: () => analyticsApi.getSummary(period),
  })

  const { data: revenue = [] } = useQuery({
    queryKey: ['analytics-revenue', period],
    queryFn: () => analyticsApi.getRevenue(period),
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['analytics-providers', period],
    queryFn: () => analyticsApi.getProviders(period),
  })

  const { data: successRate } = useQuery({
    queryKey: ['analytics-success-rate', period],
    queryFn: () => analyticsApi.getSuccessRate(period),
  })

  const revenueData = revenue.map((d) => ({
    date: d.date.slice(5),
    revenue: parseFloat(d.revenue),
    count: d.transaction_count,
  }))

  const providerPieData = providers.map((p) => ({
    name: p.provider_slug,
    value: p.total_transactions,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Analitik</h1>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Toplam Gelir', value: formatCurrency(summary?.total_revenue || '0') },
          { label: 'İşlem Sayısı', value: summary?.total_transactions?.toLocaleString('tr-TR') || '0' },
          { label: 'Başarı Oranı', value: `%${summary?.success_rate?.toFixed(1) || '0'}` },
          { label: 'Ort. İşlem', value: formatCurrency(summary?.avg_transaction_amount || '0') },
        ].map(({ label, value }) => (
          <div key={label} className="card p-5">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gelir grafiği */}
        <div className="card p-6 xl:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Günlük Gelir</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(v: number) =>
                  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v)
                }
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Gelir" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Provider dağılımı */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Provider Dağılımı</h2>
          {providerPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={providerPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {providerPieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">
              Veri yok
            </div>
          )}
        </div>
      </div>

      {/* Başarı oranı grafiği */}
      {successRate && successRate.daily.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Günlük Başarı Oranı</h2>
            <span className="text-sm font-medium text-gray-700">
              Genel: <span className={successRate.overall_rate >= 90 ? 'text-green-600' : 'text-orange-600'}>
                %{successRate.overall_rate.toFixed(1)}
              </span>
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={successRate.daily.map((d) => ({ date: d.date.slice(5), rate: d.success_rate, total: d.total }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `%${v}`} />
              <Tooltip formatter={(v: number) => [`%${v.toFixed(1)}`, 'Başarı Oranı']} />
              <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2} dot={false} name="Başarı Oranı" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Provider tablosu */}
      {providers.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Provider Performansı</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Provider</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">İşlem</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Gelir</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Başarı Oranı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {providers.map((p) => (
                <tr key={p.provider_slug}>
                  <td className="px-6 py-3 font-medium capitalize">{p.provider_slug}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{p.total_transactions}</td>
                  <td className="px-6 py-3 text-right text-gray-900 font-medium">
                    {formatCurrency(p.total_revenue)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={p.success_rate >= 90 ? 'text-green-600 font-medium' : 'text-orange-600'}
                    >
                      %{p.success_rate.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
