import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { analyticsApi } from '@/api/analytics'

export function RevenueChart() {
  const { data = [] } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: () => analyticsApi.getRevenue(30),
  })

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    revenue: parseFloat(d.revenue),
    count: d.transaction_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#colorRevenue)"
          name="Gelir"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
