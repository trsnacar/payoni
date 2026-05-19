import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Search, X } from 'lucide-react'
import { transactionsApi } from '@/api/transactions'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatDate } from '@/utils/format'
import { TransactionDetailModal } from './TransactionDetailModal'

export default function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, statusFilter, dateFrom, dateTo, search],
    queryFn: () => transactionsApi.list({
      page,
      per_page: 20,
      status: statusFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: search || undefined,
    }),
  })

  const clearFilters = () => {
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setPage(1)
  }

  const hasFilters = statusFilter || dateFrom || dateTo || search

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">İşlemler</h1>
          <p className="text-sm text-gray-500 mt-0.5">Toplam: {data?.total?.toLocaleString('tr-TR') ?? '...'}</p>
        </div>
        <button
          onClick={() => transactionsApi.export()}
          className="btn-secondary flex items-center gap-2"
        >
          <Download size={16} />
          CSV İndir
        </button>
      </div>

      {/* Filtreler */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input pl-8 w-56"
            placeholder="Müşteri, email, TX ID..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="input w-44"
        >
          <option value="">Tüm Durumlar</option>
          <option value="captured">Başarılı</option>
          <option value="pending">Bekliyor</option>
          <option value="failed">Başarısız</option>
          <option value="refunded">İade</option>
          <option value="cancelled">İptal</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="input w-40"
          title="Başlangıç tarihi"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="input w-40"
          title="Bitiş tarihi"
        />
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
            <X size={14} />
            Temizle
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-6 py-3 font-medium text-gray-500">Müşteri</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Tutar</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Durum</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Kart</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  Yükleniyor...
                </td>
              </tr>
            )}
            {data?.items?.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedTxId(tx.id)}
              >
                <td className="px-6 py-3">
                  <div className="font-medium text-gray-900">{tx.customer_name || '—'}</div>
                  <div className="text-xs text-gray-400">{tx.customer_email || ''}</div>
                </td>
                <td className="px-6 py-3 font-medium text-gray-900">
                  {formatCurrency(tx.amount, tx.currency)}
                  {tx.installments > 1 && (
                    <span className="text-xs text-gray-400 ml-1">({tx.installments}x)</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {tx.card_brand && `${tx.card_brand} `}
                  {tx.card_last4 && `****${tx.card_last4}`}
                  {!tx.card_last4 && '—'}
                </td>
                <td className="px-6 py-3 text-gray-400 text-xs">
                  {formatDate(tx.created_at)}
                </td>
              </tr>
            ))}
            {!isLoading && !data?.items?.length && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  İşlem bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Sayfa {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs px-3 py-1"
              >
                Önceki
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-xs px-3 py-1"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      <TransactionDetailModal
        transactionId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
      />
    </div>
  )
}
