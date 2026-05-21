import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, Check } from 'lucide-react'
import { posAccountsApi } from '@/api/posAccounts'

interface EditData {
  id: string
  display_name?: string
  environment: string
  commission_rates?: Record<string, number>
}

interface Props {
  onClose: () => void
  editData?: EditData
}

type Step = 'pick' | 'form'

const INSTALLMENT_RANGE = Array.from({ length: 12 }, (_, i) => i + 1)

function ProviderLogo({ logo, name }: { logo: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={logo}
      alt={name}
      className="w-10 h-10 object-contain rounded-xl"
      onError={() => setFailed(true)}
    />
  )
}

export default function AddPOSAccountModal({ onClose, editData }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!editData
  const [step, setStep] = useState<Step>(isEdit ? 'form' : 'pick')
  const [selectedProvider, setSelectedProvider] = useState<{ slug: string; name: string; logo: string } | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [displayName, setDisplayName] = useState(editData?.display_name || '')
  const [environment, setEnvironment] = useState(editData?.environment || 'production')
  const [commissionRates, setCommissionRates] = useState<Record<string, string>>(() => {
    if (editData?.commission_rates) {
      return Object.fromEntries(
        Object.entries(editData.commission_rates).map(([k, v]) => [k, String(v)])
      )
    }
    return {}
  })
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState<'aggregator' | 'bank'>('aggregator')

  const { data: providerData } = useQuery({
    queryKey: ['providers'],
    queryFn: posAccountsApi.listProviders,
  })

  const aggregators = providerData?.providers?.filter((p) => p.category === 'aggregator') || []
  const banks = providerData?.providers?.filter((p) => p.category === 'bank') || []

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof posAccountsApi.create>[0]) =>
      isEdit
        ? posAccountsApi.update(editData!.id, {
            display_name: data.display_name,
            environment: data.environment,
            commission_rates: data.commission_rates,
          })
        : posAccountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-accounts'] })
      onClose()
    },
    onError: (err: any) => setError(err.response?.data?.detail || 'Hata oluştu'),
  })

  const selectedSchema = selectedProvider
    ? providerData?.schemas?.[selectedProvider.slug] || []
    : []

  const handlePickProvider = (p: { slug: string; name: string; logo: string }) => {
    setSelectedProvider(p)
    setCredentials({})
    setDisplayName('')
    setError('')
    setStep('form')
  }

  const buildCommissionRates = () =>
    Object.fromEntries(
      Object.entries(commissionRates)
        .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)))
        .map(([k, v]) => [k, parseFloat(v)])
    )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isEdit) {
      createMutation.mutate({
        provider_slug: '',
        credentials: {},
        display_name: displayName || undefined,
        environment,
        commission_rates: buildCommissionRates(),
      })
      return
    }
    if (!selectedProvider) return
    createMutation.mutate({
      provider_slug: selectedProvider.slug,
      display_name: displayName || undefined,
      credentials,
      environment,
      commission_rates: buildCommissionRates(),
    })
  }

  const currentList = activeCategory === 'aggregator' ? aggregators : banks

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'form' && !isEdit ? (
              <button
                onClick={() => { setStep('pick'); setSelectedProvider(null) }}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Geri</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium">Geri Dön</span>
              </button>
            )}
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                {isEdit ? 'POS Hesabını Düzenle' : step === 'pick' ? 'POS Hesabı Ekle' : `${selectedProvider?.name ?? ''} Bağla`}
              </h1>
            </div>
          </div>

          {/* Breadcrumb */}
          {!isEdit && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className={step === 'pick' ? 'text-primary-600 font-medium' : 'text-gray-400'}>
                1. Sağlayıcı Seç
              </span>
              <ChevronRight size={14} />
              <span className={step === 'form' ? 'text-primary-600 font-medium' : 'text-gray-400'}>
                2. Bilgileri Gir
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* STEP 1 — Provider seçimi */}
        {step === 'pick' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Sağlayıcınızı seçin</h2>
              <p className="text-gray-500 text-sm mt-1">
                Sanal POS sağlayıcınızı seçerek API bilgilerinizi girin
              </p>
            </div>

            {/* Kategori tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
              {[
                { key: 'aggregator', label: `Ödeme Aracıları (${aggregators.length})` },
                { key: 'bank', label: `Bankalar (${banks.length})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key as any)}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeCategory === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Provider grid — 4 columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentList.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => handlePickProvider(p)}
                  className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary-400 hover:shadow-md transition-all text-left group"
                >
                  <ProviderLogo logo={p.logo} name={p.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 truncate capitalize">{p.slug}</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-primary-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Form */}
        {step === 'form' && (isEdit || selectedProvider) && (
          <div>
            <div className="mb-6">
              {!isEdit && selectedProvider && (
                <div className="flex items-center gap-3 mb-4">
                  <ProviderLogo logo={selectedProvider.logo} name={selectedProvider.name} />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedProvider.name}</h2>
                    <p className="text-sm text-gray-400 capitalize">{selectedProvider.slug}</p>
                  </div>
                </div>
              )}
              {isEdit && (
                <h2 className="text-xl font-semibold text-gray-900">
                  {editData?.display_name || 'POS Hesabı'} — Düzenle
                </h2>
              )}
            </div>

            <form onSubmit={handleSubmit} id="pos-form">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Sol kolon — API bilgileri + temel ayarlar */}
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-400">
                      Genel Bilgiler
                    </h3>

                    <div>
                      <label className="label">
                        Görünen Ad <span className="text-gray-400 font-normal">(opsiyonel)</span>
                      </label>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="input"
                        placeholder={`Örn: ${selectedProvider?.name ?? 'Ana'} POS`}
                      />
                    </div>

                    <div>
                      <label className="label">Ortam</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: 'production', label: '🟢 Canlı', sub: 'Production' },
                          { val: 'sandbox', label: '🧪 Test', sub: 'Sandbox' },
                        ].map(({ val, label, sub }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setEnvironment(val)}
                            className={`py-3 px-4 border rounded-xl text-sm font-medium transition-all text-left ${
                              environment === val
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div>{label}</div>
                            <div className="text-xs opacity-60 font-normal">{sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!isEdit && selectedSchema.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                      <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-400">
                        API Bilgileri
                      </h3>
                      {selectedSchema.map((field: any) => (
                        <div key={field.key}>
                          <label className="label">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type={field.type === 'password' ? 'password' : 'text'}
                            value={credentials[field.key] || ''}
                            onChange={(e) =>
                              setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="input"
                            required={field.required}
                            placeholder={field.label}
                            autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sağ kolon — Komisyon oranları */}
                <div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900">Taksit Komisyon Oranları</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Bankanızın uyguladığı komisyon oranlarını taksit sayısına göre girin.
                        Bu oranlar müşteriye yansıtma hesabında kullanılır.
                      </p>
                    </div>

                    {/* 3 sütunlu grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {INSTALLMENT_RANGE.map((n) => (
                        <div key={n} className="space-y-1">
                          <label className="block text-xs font-medium text-gray-500 text-center">
                            {n === 1 ? 'Peşin' : `${n} Taksit`}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={commissionRates[String(n)] ?? ''}
                              onChange={(e) =>
                                setCommissionRates((prev) => ({
                                  ...prev,
                                  [String(n)]: e.target.value,
                                }))
                              }
                              className="input text-sm text-center pr-6"
                              placeholder="—"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                              %
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-400 mt-3 border-t border-gray-100 pt-3">
                      Boş bırakılan taksitler: oran hesaplanmaz, komisyon merchant üstlenir.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Footer butonları */}
              <div className="flex gap-3 mt-6 justify-end">
                <button type="button" onClick={onClose} className="btn-secondary px-8">
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary px-8 flex items-center gap-2"
                >
                  {createMutation.isPending ? (
                    isEdit ? 'Güncelleniyor…' : 'Ekleniyor…'
                  ) : (
                    <>
                      <Check size={16} />
                      {isEdit ? 'Değişiklikleri Kaydet' : 'POS Hesabı Ekle'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
