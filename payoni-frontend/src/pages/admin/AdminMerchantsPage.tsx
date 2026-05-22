import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi, AdminMerchant } from '@/api/admin'
import { Clock, CheckCircle, XCircle, Users, ChevronRight } from 'lucide-react'

const STATUS_TABS = [
  { label: 'Tümü', value: '' },
  { label: 'Bekliyor', value: 'under_review' },
  { label: 'Onaylı', value: 'approved' },
  { label: 'Reddedildi', value: 'rejected' },
  { label: 'Eksik Belge', value: 'pending_documents' },
]

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending_documents: { label: 'Belge Bekleniyor', cls: 'bg-gray-100 text-gray-600' },
  under_review: { label: 'İncelemede', cls: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Onaylı', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Reddedildi', cls: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
}

export default function AdminMerchantsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('')

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getStats })
  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ['admin-merchants', activeTab],
    queryFn: () => adminApi.listMerchants(activeTab ? { status: activeTab } : {}),
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Başvurular</h1>
        <p className="text-sm text-gray-500 mt-1">Merchant başvurularını incele ve onayla</p>
      </div>

      {/* Stat kartları */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'İncelemede', value: stats?.under_review ?? 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Onaylı', value: stats?.approved ?? 0, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Reddedildi', value: stats?.rejected ?? 0, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Toplam', value: stats?.total ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Tabs */}
        <div className="flex gap-1 p-4 border-b border-gray-100">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Yükleniyor...</div>
        ) : merchants.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Başvuru bulunamadı</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-6 py-3 text-left">Şirket</th>
                <th className="px-6 py-3 text-left">Yetkili / Email</th>
                <th className="px-6 py-3 text-left">Plan</th>
                <th className="px-6 py-3 text-left">Başvuru Tarihi</th>
                <th className="px-6 py-3 text-left">Durum</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {merchants.map((m: AdminMerchant) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/admin/merchants/${m.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{m.business_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.company_type ?? '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{m.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-lg capitalize">
                      {m.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(m.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={m.onboarding_status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={16} className="text-gray-300 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
