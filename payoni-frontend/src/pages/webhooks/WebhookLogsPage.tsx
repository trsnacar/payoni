import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { webhooksApi, WebhookLog } from '@/api/webhooks'
import { formatDate } from '@/utils/format'

const DIRECTION_LABELS = {
  inbound: { label: 'Gelen (Provider)', cls: 'badge-pending' },
  outbound: { label: 'Giden (Merchant)', cls: 'badge-success' },
}

function StatusChip({ status }: { status?: number }) {
  if (!status) return <span className="text-gray-400 text-xs">-</span>
  const ok = status >= 200 && status < 300
  return (
    <span className={`text-xs font-mono font-medium ${ok ? 'text-green-600' : 'text-red-600'}`}>
      {status}
    </span>
  )
}

function LogRow({ log, onExpand }: { log: WebhookLog; onExpand: (log: WebhookLog) => void }) {
  const dir = DIRECTION_LABELS[log.direction]
  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => onExpand(log)}
    >
      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
        {formatDate(log.created_at)}
      </td>
      <td className="px-4 py-3">
        <span className={dir.cls}>{dir.label}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 capitalize">
        {log.provider_slug || '-'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono max-w-[160px] truncate">
        {log.transaction_id ? log.transaction_id.slice(0, 8) + '…' : '-'}
      </td>
      <td className="px-4 py-3">
        <StatusChip status={log.http_status} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {log.retry_count > 0 ? <span className="text-orange-500">×{log.retry_count}</span> : '0'}
      </td>
    </tr>
  )
}

function LogDetail({ log, onClose }: { log: WebhookLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Webhook Log Detayı</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Yön:</span> <span className="font-medium">{DIRECTION_LABELS[log.direction].label}</span></div>
          <div><span className="text-gray-500">Provider:</span> <span className="font-medium capitalize">{log.provider_slug || '-'}</span></div>
          <div><span className="text-gray-500">HTTP Status:</span> <StatusChip status={log.http_status} /></div>
          <div><span className="text-gray-500">Retry:</span> <span className="font-medium">{log.retry_count}</span></div>
          {log.url && (
            <div className="col-span-2"><span className="text-gray-500">URL:</span> <span className="font-mono text-xs break-all">{log.url}</span></div>
          )}
          {log.transaction_id && (
            <div className="col-span-2"><span className="text-gray-500">Transaction:</span> <span className="font-mono text-xs">{log.transaction_id}</span></div>
          )}
        </div>

        {log.payload && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Payload</p>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto text-gray-800">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </div>
        )}

        {log.response_body && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Yanıt</p>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto text-gray-800">
              {log.response_body}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WebhookLogsPage() {
  const [page, setPage] = useState(1)
  const [direction, setDirection] = useState<'inbound' | 'outbound' | undefined>()
  const [selected, setSelected] = useState<WebhookLog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['webhook-logs', page, direction],
    queryFn: () => webhooksApi.getLogs({ page, per_page: 20, direction }),
  })

  const totalPages = Math.ceil((data?.total || 0) / 20)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Webhook Logları</h1>
          <p className="text-sm text-gray-500 mt-0.5">Provider ve merchant webhook geçmişi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDirection(undefined)}
            className={`btn-secondary text-xs ${!direction ? 'bg-primary-50 text-primary-700 border-primary-200' : ''}`}
          >
            Tümü
          </button>
          <button
            onClick={() => setDirection('inbound')}
            className={`btn-secondary text-xs ${direction === 'inbound' ? 'bg-primary-50 text-primary-700 border-primary-200' : ''}`}
          >
            Gelen
          </button>
          <button
            onClick={() => setDirection('outbound')}
            className={`btn-secondary text-xs ${direction === 'outbound' ? 'bg-primary-50 text-primary-700 border-primary-200' : ''}`}
          >
            Giden
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Yükleniyor...</div>
        ) : !data?.items.length ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            <p className="font-medium">Henüz webhook log bulunmuyor</p>
            <p className="mt-1 text-xs">Provider callbackleri ve merchant bildirimleri burada görünecek</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Yön</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Transaction</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">HTTP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Retry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.items.map((log) => (
                <LogRow key={log.id} log={log} onExpand={setSelected} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs"
          >
            Önceki
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-xs"
          >
            Sonraki
          </button>
        </div>
      )}

      {selected && <LogDetail log={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
