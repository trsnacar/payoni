import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronRight } from 'lucide-react'
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

function ProviderLogo({ logo, name }: { logo: string; name: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={logo}
      alt={name}
      className="w-8 h-8 object-contain rounded-md"
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
        ? posAccountsApi.update(editData!.id, { display_name: data.display_name, environment: data.environment, commission_rates: data.commission_rates })
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'form' && !isEdit && (
              <button
                onClick={() => { setStep('pick'); setSelectedProvider(null) }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">
                {isEdit ? 'POS Hesabını Düzenle' : step === 'pick' ? 'POS Hesabı Ekle' : `${selectedProvider?.name} Bağla`}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEdit ? 'Görünen ad ve ortam bilgilerini güncelleyin' : step === 'pick' ? 'Sağlayıcınızı seçin' : 'Credential bilgilerini girin'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* STEP 1 — Provider seçimi */}
          {step === 'pick' && (
            <div className="p-5">
              {/* Kategori tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
                <button
                  onClick={() => setActiveCategory('aggregator')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeCategory === 'aggregator'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Ödeme Aracıları ({aggregators.length})
                </button>
                <button
                  onClick={() => setActiveCategory('bank')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeCategory === 'bank'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Bankalar ({banks.length})
                </button>
              </div>

              {/* Provider grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {currentList.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => handlePickProvider(p)}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
                  >
                    <ProviderLogo logo={p.logo} name={p.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate leading-tight">{p.name}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-primary-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — Form */}
          {step === 'form' && (isEdit || selectedProvider) && (
            <form onSubmit={handleSubmit} id="pos-form" className="p-5 space-y-4">
              {/* Seçili provider — sadece yeni ekleme modunda */}
              {!isEdit && selectedProvider && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <ProviderLogo logo={selectedProvider.logo} name={selectedProvider.name} />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{selectedProvider.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{selectedProvider.slug}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="label">Görünen Ad <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input"
                  placeholder={`Örn: ${selectedProvider?.name ?? ''} Ana POS`}
                />
              </div>

              <div>
                <label className="label">Ortam</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'production', label: 'Canlı (Production)' },
                    { val: 'sandbox', label: 'Test (Sandbox)' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEnvironment(val)}
                      className={`py-2 px-3 border rounded-lg text-sm font-medium transition-colors ${
                        environment === val
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  Taksit Komisyon Oranları{' '}
                  <span className="text-gray-400 font-normal">(opsiyonel)</span>
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Taksit</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Banka Oranı (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 6, 9, 12].map((n) => (
                        <tr key={n} className="border-t border-gray-100">
                          <td className="px-4 py-2 text-gray-700 text-sm">
                            {n === 1 ? 'Peşin' : `${n} Taksit`}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={commissionRates[String(n)] ?? ''}
                              onChange={(e) =>
                                setCommissionRates((prev) => ({ ...prev, [String(n)]: e.target.value }))
                              }
                              className="input py-1 text-sm w-28"
                              placeholder="0.00"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Boş bırakılan taksitler için oran uygulanmaz. Müşteriye yansıtma için bu oranlar kullanılır.
                </p>
              </div>

              {!isEdit && (
                <>
                  <hr className="border-gray-100" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">API Bilgileri</p>

                  {selectedSchema.map((field: any) => (
                    <div key={field.key}>
                      <label className="label">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type={field.type === 'password' ? 'password' : 'text'}
                        value={credentials[field.key] || ''}
                        onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="input"
                        required={field.required}
                        placeholder={field.label}
                        autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                      />
                    </div>
                  ))}
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer — sadece form adımında göster */}
        {step === 'form' && (
          <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
            {!isEdit && (
              <button type="button" onClick={() => { setStep('pick'); setSelectedProvider(null) }} className="btn-secondary flex-1">
                Geri
              </button>
            )}
            {isEdit && (
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                İptal
              </button>
            )}
            <button
              type="submit"
              form="pos-form"
              disabled={createMutation.isPending}
              className="btn-primary flex-1"
            >
              {createMutation.isPending ? (isEdit ? 'Güncelleniyor...' : 'Ekleniyor...') : (isEdit ? 'Kaydet' : 'POS Ekle')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
