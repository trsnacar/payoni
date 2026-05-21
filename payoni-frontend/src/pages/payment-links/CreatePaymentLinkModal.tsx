import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { paymentLinksApi } from '@/api/paymentLinks'
import { posAccountsApi } from '@/api/posAccounts'

interface InitialData {
  id: string
  title?: string
  description?: string
  amount?: number | string
  preferred_pos_id?: string
  allow_installments?: boolean
  commission_passthrough?: boolean
  max_uses?: number
  redirect_url?: string
}

interface Props {
  onClose: () => void
  initialData?: InitialData
}

export default function CreatePaymentLinkModal({ onClose, initialData }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData
  const [form, setForm] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    amount: initialData?.amount != null ? String(initialData.amount) : '',
    preferred_pos_id: initialData?.preferred_pos_id || '',
    allow_installments: initialData?.allow_installments ?? true,
    commission_passthrough: initialData?.commission_passthrough ?? false,
    max_uses: initialData?.max_uses != null ? String(initialData.max_uses) : '',
    redirect_url: initialData?.redirect_url || '',
  })
  const [error, setError] = useState('')

  const { data: posData } = useQuery({
    queryKey: ['pos-accounts'],
    queryFn: posAccountsApi.list,
  })
  const activePOS = posData?.filter((p) => p.is_active) || []

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof paymentLinksApi.create>[0]) =>
      isEdit
        ? paymentLinksApi.update(initialData!.id, payload)
        : paymentLinksApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] })
      onClose()
    },
    onError: (err: any) => setError(err.response?.data?.detail || 'Hata oluştu'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Ürün adı zorunlu'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Geçerli bir tutar giriniz'); return }

    saveMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      amount: parseFloat(form.amount),
      preferred_pos_id: form.preferred_pos_id || undefined,
      allow_installments: form.allow_installments,
      commission_passthrough: form.commission_passthrough,
      max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
      redirect_url: form.redirect_url || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="font-semibold text-gray-900">
              {isEdit ? 'Ödeme Linkini Düzenle' : 'Ürün Ödeme Linki Oluştur'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit ? 'Link bilgilerini güncelleyin' : 'Müşterinize paylaşabileceğiniz sabit fiyatlı ödeme linki'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ürün adı */}
          <div>
            <label className="label">Ürün / Hizmet Adı <span className="text-red-500">*</span></label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="Örn: Premium Üyelik, Logo Tasarımı"
              required
            />
          </div>

          {/* Açıklama */}
          <div>
            <label className="label">Açıklama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input min-h-[72px] resize-none"
              placeholder="Müşteriye gösterilecek kısa açıklama..."
            />
          </div>

          {/* Tutar */}
          <div>
            <label className="label">Fiyat (₺) <span className="text-red-500">*</span></label>
            <input
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              placeholder="0.00"
              required
            />
          </div>

          {/* POS seçimi */}
          <div>
            <label className="label">POS Hesabı</label>
            <select
              value={form.preferred_pos_id}
              onChange={(e) => setForm((f) => ({ ...f, preferred_pos_id: e.target.value }))}
              className="input"
            >
              <option value="">Varsayılan POS kullan</option>
              {activePOS.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.display_name || pos.provider_slug} ({pos.environment})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Bu link üzerinden yapılan ödemeler hangi POS'a gitsin?</p>
          </div>

          {/* Taksit */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.allow_installments}
              onChange={(e) => setForm((f) => ({ ...f, allow_installments: e.target.checked }))}
              className="w-4 h-4 text-primary-600"
            />
            <span className="text-sm text-gray-700">Taksit seçeneğine izin ver</span>
          </label>

          {/* Komisyon yansıtma */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.commission_passthrough}
              onChange={(e) => setForm((f) => ({ ...f, commission_passthrough: e.target.checked }))}
              className="w-4 h-4 text-primary-600 mt-0.5 shrink-0"
            />
            <div>
              <span className="text-sm text-gray-700">Banka komisyonunu müşteriye yansıt</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Aktif: müşteri komisyon dahil gross tutarı öder. Pasif: komisyonu siz karşılarsınız.
              </p>
            </div>
          </label>

          {/* Maks kullanım */}
          <div>
            <label className="label">Maksimum Kullanım</label>
            <input
              value={form.max_uses}
              onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
              type="number"
              min="1"
              className="input"
              placeholder="Sınırsız"
            />
          </div>

          {/* Yönlendirme URL */}
          <div>
            <label className="label">Başarılı Ödeme Sonrası URL</label>
            <input
              value={form.redirect_url}
              onChange={(e) => setForm((f) => ({ ...f, redirect_url: e.target.value }))}
              type="url"
              className="input"
              placeholder="https://siteniz.com/tesekkurler"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              İptal
            </button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1">
              {saveMutation.isPending ? (isEdit ? 'Güncelleniyor...' : 'Oluşturuluyor...') : (isEdit ? 'Kaydet' : 'Link Oluştur')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
