import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Users, Building2 } from 'lucide-react'
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
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Geri Dön</span>
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <h1 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Ödeme Linkini Düzenle' : 'Ödeme Linki Oluştur'}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Link bilgilerini güncelleyin' : 'Müşterinizle paylaşabileceğiniz ödeme linki oluşturun'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Sabit fiyatlı veya müşterinin tutar girdiği ödeme linkleri oluşturabilirsiniz.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Sol — Temel bilgiler */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ürün Bilgileri</h3>

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

                <div>
                  <label className="label">Açıklama</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="input min-h-[80px] resize-none"
                    placeholder="Müşteriye gösterilecek kısa açıklama…"
                  />
                </div>

                <div>
                  <label className="label">Fiyat (₺) <span className="text-red-500">*</span></label>
                  <input
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="input text-lg font-semibold"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="label">Maksimum Kullanım <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                  <input
                    value={form.max_uses}
                    onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                    type="number"
                    min="1"
                    className="input"
                    placeholder="Sınırsız"
                  />
                </div>

                <div>
                  <label className="label">Başarılı Ödeme Sonrası URL <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                  <input
                    value={form.redirect_url}
                    onChange={(e) => setForm((f) => ({ ...f, redirect_url: e.target.value }))}
                    type="url"
                    className="input"
                    placeholder="https://siteniz.com/tesekkurler"
                  />
                </div>
              </div>
            </div>

            {/* Sağ — Ödeme ayarları */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ödeme Ayarları</h3>

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
                  <p className="text-xs text-gray-400 mt-1">Hangi POS üzerinden tahsilat yapılsın?</p>
                </div>

                {/* Taksit izni */}
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.allow_installments}
                    onChange={(e) => setForm((f) => ({ ...f, allow_installments: e.target.checked }))}
                    className="w-4 h-4 text-primary-600"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Taksit seçeneğine izin ver</span>
                    <p className="text-xs text-gray-400">Müşteri taksit sayısı seçebilsin</p>
                  </div>
                </label>
              </div>

              {/* Komisyon seçimi — kart tabanlı */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Banka Komisyonu Karşılama
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Taksitli ödemelerde banka komisyonunu kim karşılasın?
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {/* Üye iş yeri karşılar */}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, commission_passthrough: false }))}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl text-left transition-all ${
                      !form.commission_passthrough
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      !form.commission_passthrough ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Üye İş Yeri Karşılar</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Müşteri daima net tutarı öder. Banka komisyonu sizin gelirinizden kesilir.
                      </p>
                    </div>
                    {!form.commission_passthrough && (
                      <Check size={16} className="text-primary-600 shrink-0 mt-0.5 ml-auto" />
                    )}
                  </button>

                  {/* Müşteriye yansıt */}
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, commission_passthrough: true }))}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl text-left transition-all ${
                      form.commission_passthrough
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      form.commission_passthrough ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Users size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Müşteriye Yansıt</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Komisyon otomatik fiyata eklenir. Müşteri gross tutarı öder, siz net tutarı alırsınız.
                      </p>
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        Örnek: 100.000 TL + %24,8 → müşteri 132.979 TL öder
                      </p>
                    </div>
                    {form.commission_passthrough && (
                      <Check size={16} className="text-primary-600 shrink-0 mt-0.5 ml-auto" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary px-8">
              İptal
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary px-8 flex items-center gap-2"
            >
              {saveMutation.isPending ? (
                isEdit ? 'Güncelleniyor…' : 'Oluşturuluyor…'
              ) : (
                <>
                  <Check size={16} />
                  {isEdit ? 'Değişiklikleri Kaydet' : 'Link Oluştur'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
