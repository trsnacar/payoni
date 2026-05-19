import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Copy, ExternalLink, Trash2, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'
import { paymentLinksApi, type PaymentLink } from '@/api/paymentLinks'
import { formatCurrency, formatDate } from '@/utils/format'
import CreatePaymentLinkModal from './CreatePaymentLinkModal'

export default function PaymentLinksPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editLink, setEditLink] = useState<PaymentLink | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['payment-links'],
    queryFn: paymentLinksApi.list,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      paymentLinksApi.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-links'] }),
    onError: (err: any) => setMutationError(err.response?.data?.detail || 'Durum güncellenemedi'),
  })

  const deleteMutation = useMutation({
    mutationFn: paymentLinksApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-links'] }),
    onError: (err: any) => setMutationError(err.response?.data?.detail || 'Silinemedi'),
  })

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ödeme Linkleri</h1>
          <p className="text-sm text-gray-500 mt-0.5">Müşterilerinize paylaşın</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Link Oluştur
        </button>
      </div>

      {isLoading && <div className="card p-8 text-center text-gray-400">Yükleniyor...</div>}

      {mutationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex justify-between items-center">
          {mutationError}
          <button onClick={() => setMutationError(null)} className="ml-4 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      <div className="space-y-3">
        {links.map((link) => (
          <div key={link.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-gray-900">
                    {link.title || `Ödeme Linki /${link.short_code}`}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      link.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {link.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                {link.description && (
                  <p className="text-sm text-gray-500 mt-1">{link.description}</p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  {link.amount ? (
                    <span className="font-medium text-gray-700">
                      {formatCurrency(link.amount, link.currency)}
                    </span>
                  ) : (
                    <span>Tutar: müşteri girer</span>
                  )}
                  <span>{link.use_count} kullanım{link.max_uses ? ` / ${link.max_uses}` : ''}</span>
                  {link.expires_at && <span>Bitiş: {formatDate(link.expires_at)}</span>}
                </div>

                {/* URL */}
                <div className="flex items-center gap-2 mt-3">
                  <code className="text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 truncate max-w-xs">
                    {link.url}
                  </code>
                  <button
                    onClick={() => copyUrl(link.url, link.id)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                  {copied === link.id && (
                    <span className="text-xs text-green-600">Kopyalandı!</span>
                  )}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setEditLink(link)}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Düzenle"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => toggleMutation.mutate({ id: link.id, is_active: !link.is_active })}
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                >
                  {link.is_active ? <ToggleRight size={22} className="text-primary-600" /> : <ToggleLeft size={22} />}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Bu linki silmek istediğinizden emin misiniz?')) {
                      deleteMutation.mutate(link.id)
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {!isLoading && !links.length && (
          <div className="card p-12 text-center">
            <p className="text-gray-500 font-medium">Henüz ödeme linki oluşturulmamış</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              İlk Linki Oluştur
            </button>
          </div>
        )}
      </div>

      {showCreate && <CreatePaymentLinkModal onClose={() => setShowCreate(false)} />}
      {editLink && (
        <CreatePaymentLinkModal
          onClose={() => setEditLink(null)}
          initialData={{
            id: editLink.id,
            title: editLink.title,
            description: editLink.description,
            amount: editLink.amount,
            preferred_pos_id: editLink.preferred_pos_id,
            allow_installments: editLink.allow_installments,
            max_uses: editLink.max_uses,
            redirect_url: editLink.redirect_url,
          }}
        />
      )}
    </div>
  )
}
