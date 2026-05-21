import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { ThreeDModal } from '../../components/payment/ThreeDModal'
import { paymentsApi, InstallmentOption } from '../../api/payments'
import { formatCurrencyTR } from '../../utils/commission'

interface WidgetInfo {
  name: string
  merchant_name: string
  amount?: string
  currency: string
  allow_installments: boolean
  commission_passthrough?: boolean
  is_active: boolean
}

interface CardForm {
  number: string
  exp_month: string
  exp_year: string
  cvv: string
  holder_name: string
  customer_name: string
  customer_email: string
}

type Stage = 'form' | 'processing' | 'success' | 'error'

interface ThreeDData {
  transactionId: string
  htmlContent?: string
  redirectUrl?: string
}

export function EmbedPage() {
  const { widgetId } = useParams<{ widgetId: string }>()
  const [searchParams] = useSearchParams()
  const paramAmount = searchParams.get('amount')

  const [widget, setWidget] = useState<WidgetInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('form')
  const [errorMsg, setErrorMsg] = useState('')
  const [txId, setTxId] = useState<string | null>(null)
  const [threeDData, setThreeDData] = useState<ThreeDData | null>(null)

  const [form, setForm] = useState<CardForm>({
    number: '',
    exp_month: '',
    exp_year: '',
    cvv: '',
    holder_name: '',
    customer_name: '',
    customer_email: '',
  })

  const [customAmount, setCustomAmount] = useState(paramAmount || '')
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([])
  const [selectedInstallments, setSelectedInstallments] = useState(1)
  const [loadingInstallments, setLoadingInstallments] = useState(false)

  useEffect(() => {
    if (!widgetId) return
    axios
      .get(`/embed/${widgetId}`)
      .then((r) => setWidget(r.data))
      .catch(() => setLoadError('Widget yüklenemedi'))
  }, [widgetId])

  const finalAmount = widget?.amount || customAmount
  const netAmount = parseFloat(finalAmount) || 0
  const commissionPassthrough = widget?.commission_passthrough ?? false

  useEffect(() => {
    const bin = form.number.replace(/\s/g, '').slice(0, 6)
    if (bin.length < 6 || !netAmount || !widget?.allow_installments) {
      setInstallmentOptions([])
      setSelectedInstallments(1)
      return
    }

    let cancelled = false
    setLoadingInstallments(true)
    paymentsApi
      .getInstallments(bin, netAmount)
      .then((r) => {
        if (!cancelled) {
          setInstallmentOptions(r.installments)
          setSelectedInstallments(1)
        }
      })
      .catch(() => { if (!cancelled) setInstallmentOptions([]) })
      .finally(() => { if (!cancelled) setLoadingInstallments(false) })

    return () => { cancelled = true }
  }, [form.number, netAmount, widget?.allow_installments])

  const selectedOption = installmentOptions.find((o) => o.count === selectedInstallments)

  const chargeAmount = () => {
    if (commissionPassthrough && selectedOption?.gross_amount) {
      return selectedOption.gross_amount
    }
    return netAmount
  }

  function formatCardNumber(value: string): string {
    return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!widget || !finalAmount) return
    setStage('processing')
    setErrorMsg('')

    try {
      const resp = await axios.post(`/embed/${widgetId}/charge`, {
        amount: chargeAmount(),
        currency: widget.currency,
        installments: selectedInstallments,
        commission_passthrough: commissionPassthrough,
        use_3d: true,
        card: {
          number: form.number.replace(/\s/g, ''),
          exp_month: form.exp_month,
          exp_year: form.exp_year,
          cvv: form.cvv,
          holder_name: form.holder_name,
        },
        customer: {
          name: form.customer_name,
          email: form.customer_email,
        },
      })
      const id = resp.data?.transaction_id || resp.data?.id
      const htmlContent = resp.data?.html_content
      const redirectUrl = resp.data?.redirect_url

      if (htmlContent || redirectUrl) {
        setStage('form')
        setThreeDData({ transactionId: id, htmlContent, redirectUrl })
      } else {
        setTxId(id)
        setStage('success')
        window.parent.postMessage({ type: 'payoni:success', txId: id }, '*')
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Ödeme başarısız oldu'
      setErrorMsg(msg)
      setStage('error')
      window.parent.postMessage({ type: 'payoni:error', message: msg }, '*')
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-destructive text-sm">{loadError}</p>
      </div>
    )
  }

  if (!widget) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Yükleniyor…</p>
      </div>
    )
  }

  if (!widget.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Bu ödeme widgetı şu anda aktif değil.</p>
      </div>
    )
  }

  if (stage === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="text-4xl">✓</div>
        <h2 className="text-lg font-semibold text-green-600">Ödeme Başarılı</h2>
        <p className="text-sm text-muted-foreground">
          {netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {widget.currency} tutarındaki ödemeniz alındı.
        </p>
        {txId && <p className="text-xs text-muted-foreground">İşlem No: {txId}</p>}
      </div>
    )
  }

  if (threeDData) {
    return (
      <ThreeDModal
        transactionId={threeDData.transactionId}
        htmlForm={threeDData.htmlContent}
        redirectUrl={threeDData.redirectUrl}
        onSuccess={(id) => {
          setThreeDData(null)
          setTxId(id)
          setStage('success')
          window.parent.postMessage({ type: 'payoni:success', txId: id }, '*')
        }}
        onFailure={(_id, msg) => {
          setThreeDData(null)
          setErrorMsg(msg || 'Ödeme başarısız')
          setStage('error')
          window.parent.postMessage({ type: 'payoni:error', message: msg }, '*')
        }}
        onClose={() => {
          setThreeDData(null)
          setStage('form')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{widget.merchant_name}</p>
          <p className="font-semibold">{widget.name}</p>
          {finalAmount && (
            <p className="text-2xl font-bold mt-1">
              {netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {widget.currency}
            </p>
          )}
        </div>

        {stage === 'error' && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {!widget.amount && (
            <div className="space-y-1">
              <Label htmlFor="amount">Tutar ({widget.currency})</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="customer_name">Ad Soyad</Label>
            <Input
              id="customer_name"
              placeholder="Ad Soyad"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="customer_email">E-posta</Label>
            <Input
              id="customer_email"
              type="email"
              placeholder="ornek@email.com"
              value={form.customer_email}
              onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="holder">Kart Sahibi</Label>
            <Input
              id="holder"
              placeholder="Karttaki ad soyad"
              value={form.holder_name}
              onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="number">Kart Numarası</Label>
            <Input
              id="number"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: formatCardNumber(e.target.value) })}
              maxLength={19}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="month">Ay</Label>
              <Input
                id="month"
                placeholder="MM"
                maxLength={2}
                value={form.exp_month}
                onChange={(e) => setForm({ ...form, exp_month: e.target.value.replace(/\D/g, '') })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="year">Yıl</Label>
              <Input
                id="year"
                placeholder="YY"
                maxLength={2}
                value={form.exp_year}
                onChange={(e) => setForm({ ...form, exp_year: e.target.value.replace(/\D/g, '') })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                placeholder="•••"
                maxLength={4}
                value={form.cvv}
                onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, '') })}
                required
              />
            </div>
          </div>

          {widget.allow_installments && (
            <div className="space-y-1">
              <Label htmlFor="inst">Taksit</Label>
              {loadingInstallments ? (
                <div className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground flex items-center">
                  Yükleniyor…
                </div>
              ) : installmentOptions.length > 0 ? (
                <>
                  <select
                    id="inst"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={selectedInstallments}
                    onChange={(e) => setSelectedInstallments(parseInt(e.target.value))}
                  >
                    {installmentOptions.map((opt) => {
                      const displayTotal = commissionPassthrough && opt.gross_amount
                        ? opt.gross_amount : opt.total_amount
                      const displayMonthly = commissionPassthrough && opt.gross_monthly
                        ? opt.gross_monthly : opt.monthly_amount
                      return (
                        <option key={opt.count} value={opt.count}>
                          {opt.count === 1
                            ? `Tek Çekim — ${formatCurrencyTR(displayTotal)} TL`
                            : `${opt.count} Taksit × ${formatCurrencyTR(displayMonthly)} = ${formatCurrencyTR(displayTotal)} TL`
                          }
                        </option>
                      )
                    })}
                  </select>
                  {commissionPassthrough && selectedOption && selectedOption.count > 1 && selectedOption.gross_amount && (
                    <p className="text-xs text-amber-700 mt-1">
                      Ürün: {formatCurrencyTR(netAmount)} TL — komisyon dahil:{' '}
                      <strong>{formatCurrencyTR(selectedOption.gross_amount)} TL</strong>
                    </p>
                  )}
                </>
              ) : (
                <select
                  id="inst"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground"
                  disabled
                >
                  <option>Kart numarasını girin…</option>
                </select>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={stage === 'processing'}>
            {stage === 'processing' ? 'İşleniyor…' : 'Ödemeyi Tamamla'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Güvenli ödeme — Payoni
        </p>
      </div>
    </div>
  )
}
