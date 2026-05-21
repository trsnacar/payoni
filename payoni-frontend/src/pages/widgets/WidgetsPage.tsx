import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Code2, Copy, Trash2, Edit2, X, Info } from 'lucide-react'
import apiClient from '@/api/client'
import { posAccountsApi, PosAccount } from '@/api/posAccounts'

interface InstallmentRule {
  pos_account_id: string
  installments: number[]
}

interface Widget {
  id: string
  name: string
  preferred_pos_id?: string
  allowed_origins?: string[]
  amount?: string
  allow_installments: boolean
  commission_passthrough?: boolean
  installment_rules?: InstallmentRule[]
  is_active: boolean
}

interface WidgetSnippet {
  widget_id: string
  snippet: string
}

const INSTALLMENT_OPTIONS = [1, 2, 3, 6, 9, 12]

export default function WidgetsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editWidget, setEditWidget] = useState<Widget | null>(null)
  const [snippetWidget, setSnippetWidget] = useState<string | null>(null)
  const [snippet, setSnippet] = useState('')
  const [copied, setCopied] = useState(false)

  const { data: widgets = [], isLoading } = useQuery({
    queryKey: ['widgets'],
    queryFn: () => apiClient.get<Widget[]>('/widgets').then((r) => r.data),
  })

  const { data: posData } = useQuery({
    queryKey: ['pos-accounts'],
    queryFn: posAccountsApi.list,
  })
  const activePOS = posData?.filter((p) => p.is_active) || []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/widgets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['widgets'] }),
  })

  const showSnippet = async (id: string) => {
    const data = await apiClient.get<WidgetSnippet>(`/widgets/${id}/snippet`).then((r) => r.data)
    setSnippet(data.snippet)
    setSnippetWidget(id)
  }

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getPOSName = (id?: string) => {
    if (!id) return null
    const pos = activePOS.find((p) => p.id === id)
    return pos ? (pos.display_name || pos.provider_slug) : id.slice(0, 8) + '…'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Embed Widget</h1>
          <p className="text-sm text-gray-500 mt-0.5">Web sitenize veya uygulamanıza POS'unuzu gömün</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Widget Oluştur
        </button>
      </div>

      {/* Bilgi kartı */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-primary-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-primary-900 mb-1">Nasıl Çalışır?</h3>
            <ol className="text-sm text-primary-700 space-y-1 list-decimal list-inside">
              <li>Widget oluşturun — hangi POS'u kullanacağını ve taksit yönlendirme kurallarını ayarlayın</li>
              <li>İzin verilen domain'leri ekleyin (güvenlik için)</li>
              <li>HTML snippet'ini sitenize yapıştırın — müşterileriniz doğrudan sitenizde ödeme yapar</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {widgets.map((widget) => (
          <div key={widget.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{widget.name}</h3>
                {widget.amount && (
                  <p className="text-sm text-gray-500 mt-0.5">Sabit tutar: ₺{widget.amount}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${widget.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {widget.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>

            {/* POS ve taksit kuralları özeti */}
            <div className="space-y-1.5 mb-3">
              {widget.preferred_pos_id && (
                <p className="text-xs text-gray-500">
                  <span className="text-gray-400">Varsayılan POS:</span>{' '}
                  <span className="font-medium capitalize">{getPOSName(widget.preferred_pos_id)}</span>
                </p>
              )}
              {widget.installment_rules && widget.installment_rules.length > 0 && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  <span className="text-gray-400 block">Taksit yönlendirme:</span>
                  {widget.installment_rules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-1 pl-2">
                      <span className="text-gray-600">{rule.installments.join(', ')} taksit</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium capitalize">{getPOSName(rule.pos_account_id)}</span>
                    </div>
                  ))}
                </div>
              )}
              {widget.allowed_origins?.length ? (
                <p className="text-xs text-gray-400 truncate">
                  {widget.allowed_origins.slice(0, 2).join(', ')}
                  {widget.allowed_origins.length > 2 && ` +${widget.allowed_origins.length - 2}`}
                </p>
              ) : (
                <p className="text-xs text-orange-500">⚠ Origin eklenmemiş</p>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => showSnippet(widget.id)}
                className="btn-secondary text-xs flex items-center gap-1 flex-1 justify-center"
              >
                <Code2 size={13} />
                Snippet Al
              </button>
              <button
                onClick={() => setEditWidget(widget)}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => {
                  if (confirm('Widget silinsin mi?')) deleteMutation.mutate(widget.id)
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {!isLoading && !widgets.length && (
          <div className="col-span-full card p-12 text-center">
            <Code2 className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 font-medium">Henüz widget oluşturulmamış</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Widget oluşturun ve sitenize gömün</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Widget Oluştur
            </button>
          </div>
        )}
      </div>

      {/* Snippet Modal */}
      {snippetWidget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">HTML Embed Kodu</h2>
              <button onClick={() => setSnippetWidget(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-3">
                Bu kodu sitenizin HTML'ine yapıştırın. Ödeme formu belirlediğiniz POS hesabı üzerinden çalışır.
              </p>
              <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
                {snippet}
              </pre>
              <button onClick={copySnippet} className="btn-primary flex items-center gap-2 mt-4">
                <Copy size={15} />
                {copied ? 'Kopyalandı!' : 'Kopyala'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <WidgetFormModal
          activePOS={activePOS}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editWidget && (
        <WidgetFormModal
          activePOS={activePOS}
          existing={editWidget}
          onClose={() => setEditWidget(null)}
        />
      )}
    </div>
  )
}

interface WidgetFormModalProps {
  activePOS: PosAccount[]
  existing?: Widget
  onClose: () => void
}

function WidgetFormModal({ activePOS, existing, onClose }: WidgetFormModalProps) {
  const queryClient = useQueryClient()

  const [name, setName] = useState(existing?.name || '')
  const [origins, setOrigins] = useState((existing?.allowed_origins || []).join('\n'))
  const [amount, setAmount] = useState(existing?.amount || '')
  const [preferredPOS, setPreferredPOS] = useState(existing?.preferred_pos_id || '')
  const [allowInstallments, setAllowInstallments] = useState(existing?.allow_installments ?? true)
  const [commissionPassthrough, setCommissionPassthrough] = useState(existing?.commission_passthrough ?? false)
  const [rules, setRules] = useState<InstallmentRule[]>(existing?.installment_rules || [])
  const [error, setError] = useState('')

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      existing
        ? apiClient.put(`/widgets/${existing.id}`, data).then((r) => r.data)
        : apiClient.post('/widgets', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] })
      onClose()
    },
    onError: (err: any) => setError(err.response?.data?.detail || 'Hata'),
  })

  const addRule = () => {
    if (!activePOS.length) return
    setRules((prev) => [...prev, { pos_account_id: activePOS[0].id, installments: [1] }])
  }

  const removeRule = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateRulePOS = (idx: number, pos_id: string) => {
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, pos_account_id: pos_id } : r))
  }

  const toggleRuleInstallment = (idx: number, val: number) => {
    setRules((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r
        const has = r.installments.includes(val)
        return {
          ...r,
          installments: has
            ? r.installments.filter((x) => x !== val)
            : [...r.installments, val].sort((a, b) => a - b),
        }
      })
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Widget adı zorunlu'); return }

    // Taksit kuralı validasyonu
    for (const rule of rules) {
      if (rule.installments.length === 0) {
        setError('Her kuralda en az bir taksit seçilmelidir')
        return
      }
    }

    saveMutation.mutate({
      name,
      allowed_origins: origins.split('\n').map((o) => o.trim()).filter(Boolean),
      amount: amount ? parseFloat(amount) : undefined,
      preferred_pos_id: preferredPOS || undefined,
      allow_installments: allowInstallments,
      commission_passthrough: commissionPassthrough,
      installment_rules: rules,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold">{existing ? 'Widget Düzenle' : 'Widget Oluştur'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Temel bilgiler */}
          <div>
            <label className="label">Widget Adı <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" required placeholder="Örn: Ürün Ödeme Formu" />
          </div>

          <div>
            <label className="label">Sabit Tutar (opsiyonel)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              className="input"
              placeholder="Boş = tutar embed parametresinden alınır"
            />
          </div>

          {/* Varsayılan POS */}
          <div>
            <label className="label">Varsayılan POS</label>
            <select value={preferredPOS} onChange={(e) => setPreferredPOS(e.target.value)} className="input">
              <option value="">Merchant varsayılanı</option>
              {activePOS.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.display_name || pos.provider_slug} ({pos.environment})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Kurala uymayan işlemler bu POS'a yönlenir</p>
          </div>

          {/* Taksit yönlendirme kuralları */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Taksit Yönlendirme Kuralları</label>
              <button
                type="button"
                onClick={addRule}
                disabled={!activePOS.length}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <Plus size={12} />
                Kural Ekle
              </button>
            </div>

            {rules.length === 0 ? (
              <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg p-3 text-center">
                Kural eklenmemiş — tüm ödemeler varsayılan POS'a gider
              </p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <select
                        value={rule.pos_account_id}
                        onChange={(e) => updateRulePOS(idx, e.target.value)}
                        className="input text-xs flex-1 mr-2"
                      >
                        {activePOS.map((pos) => (
                          <option key={pos.id} value={pos.id}>
                            {pos.display_name || pos.provider_slug} ({pos.environment})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeRule(idx)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Bu POS'a yönlendirilecek taksitler:</p>
                      <div className="flex flex-wrap gap-2">
                        {INSTALLMENT_OPTIONS.map((n) => (
                          <label key={n} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.installments.includes(n)}
                              onChange={() => toggleRuleInstallment(idx, n)}
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-xs text-gray-700">{n === 1 ? 'Peşin' : `${n} taksit`}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Taksit izni */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowInstallments}
              onChange={(e) => setAllowInstallments(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Müşteriye taksit seçimi sun</span>
          </label>

          {/* Komisyon yansıtma */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={commissionPassthrough}
              onChange={(e) => setCommissionPassthrough(e.target.checked)}
              className="w-4 h-4 mt-0.5 shrink-0"
            />
            <div>
              <span className="text-sm text-gray-700">Banka komisyonunu müşteriye yansıt</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Aktif: taksit seçiminde gross tutar gösterilir, müşteri komisyon dahil öder.
              </p>
            </div>
          </label>

          {/* Güvenlik — izin verilen originler */}
          <div>
            <label className="label">İzin Verilen Domain'ler</label>
            <textarea
              value={origins}
              onChange={(e) => setOrigins(e.target.value)}
              className="input min-h-[72px] resize-none text-xs font-mono"
              placeholder={'https://siteniz.com\nhttps://www.siteniz.com'}
            />
            <p className="text-xs text-gray-400 mt-1">
              Güvenlik: sadece bu domain'lerden gelen ödeme istekleri kabul edilir. Boş bırakırsanız tüm origin'ler kabul edilir.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">İptal</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1">
              {saveMutation.isPending ? 'Kaydediliyor...' : existing ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
