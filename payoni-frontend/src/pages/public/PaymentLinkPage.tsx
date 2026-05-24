import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import axios from 'axios'
import { CheckCircle, XCircle, Loader2, Lock } from 'lucide-react'
import { paymentLinksApi } from '@/api/paymentLinks'
import { paymentsApi, InstallmentOption } from '@/api/payments'
import { formatCurrencyTR } from '@/utils/commission'
import { formatCurrency } from '@/utils/format'
import { ThreeDModal } from '@/components/payment/ThreeDModal'

interface PaymentForm {
  amount?: string
  card_number: string
  card_holder: string
  exp_month: string
  exp_year: string
  cvv: string
  customer_name: string
  customer_email: string
}

interface ChargeResponse {
  transaction_id: string
  status: string
  redirect_url?: string
  html_content?: string
  gateway_tx_id?: string
  message?: string
}

export default function PaymentLinkPage() {
  const { shortCode } = useParams<{ shortCode: string }>()
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form')
  const [errorMsg, setErrorMsg] = useState('')
  const [threeDData, setThreeDData] = useState<ChargeResponse | null>(null)
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([])
  const [selectedInstallments, setSelectedInstallments] = useState(1)
  const [loadingInstallments, setLoadingInstallments] = useState(false)

  const { data: link, isLoading, error: loadError } = useQuery({
    queryKey: ['public-link', shortCode],
    queryFn: () => paymentLinksApi.resolvePublic(shortCode!),
    enabled: !!shortCode,
  })

  const { register, handleSubmit, control, getValues, formState: { errors } } = useForm<PaymentForm>()

  const luhnCheck = (num: string) => {
    const digits = num.replace(/\D/g, '')
    let sum = 0
    let alt = false
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = parseInt(digits[i], 10)
      if (alt) { n *= 2; if (n > 9) n -= 9 }
      sum += n
      alt = !alt
    }
    return sum % 10 === 0
  }

  const validateExpiry = (month: string, year: string) => {
    const m = parseInt(month, 10)
    const y = parseInt('20' + year, 10)
    if (m < 1 || m > 12) return false
    const now = new Date()
    return new Date(y, m) > now
  }

  const cardNumber = useWatch({ control, name: 'card_number', defaultValue: '' })
  const amountField = useWatch({ control, name: 'amount', defaultValue: '' })

  const netAmount = link?.amount ? parseFloat(link.amount) : parseFloat(amountField || '0')

  useEffect(() => {
    const bin = (cardNumber || '').replace(/\s/g, '').slice(0, 6)
    if (bin.length < 6 || !netAmount || netAmount <= 0) {
      setInstallmentOptions([])
      setSelectedInstallments(1)
      return
    }

    let cancelled = false
    setLoadingInstallments(true)
    paymentsApi
      .getInstallments(bin, netAmount, (link as any)?.preferred_pos_id || undefined)
      .then((r) => {
        if (!cancelled) {
          setInstallmentOptions(r.installments)
          setSelectedInstallments(1)
        }
      })
      .catch(() => { if (!cancelled) setInstallmentOptions([]) })
      .finally(() => { if (!cancelled) setLoadingInstallments(false) })

    return () => { cancelled = true }
  }, [cardNumber, netAmount, (link as any)?.preferred_pos_id])

  const commissionPassthrough = (link as any)?.commission_passthrough ?? false
  const selectedOption = installmentOptions.find((o) => o.count === selectedInstallments)

  const chargeAmount = () => {
    if (commissionPassthrough && selectedOption?.gross_amount) {
      return selectedOption.gross_amount
    }
    return netAmount
  }

  const payMutation = useMutation({
    mutationFn: (data: PaymentForm) =>
      axios.post<ChargeResponse>(`/pay/${shortCode}/charge`, {
        amount: chargeAmount(),
        currency: link?.currency || 'TRY',
        installments: selectedInstallments,
        use_3d: true,
        commission_passthrough: commissionPassthrough,
        card: {
          number: data.card_number.replace(/\s/g, ''),
          holder_name: data.card_holder,
          exp_month: data.exp_month,
          exp_year: data.exp_year,
          cvv: data.cvv,
        },
        customer: {
          email: data.customer_email,
          name: data.customer_name,
        },
      }).then((r) => r.data),
    onSuccess: (res) => {
      if (res.html_content || res.redirect_url) {
        setThreeDData(res)
      } else {
        setStep('success')
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || 'Ödeme işlemi başarısız')
      setStep('error')
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    )
  }

  if (loadError || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto text-red-400 mb-3" size={48} />
          <h2 className="text-lg font-semibold text-gray-900">Link bulunamadı</h2>
          <p className="text-gray-500 mt-1">Bu ödeme linki artık geçerli değil</p>
        </div>
      </div>
    )
  }

  if (!link.is_available) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full p-8 text-center">
          <XCircle className="mx-auto text-red-400 mb-3" size={48} />
          <h2 className="text-lg font-semibold text-gray-900">Link Kullanılamıyor</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Bu ödeme linki süresi dolmuş veya maksimum kullanım sayısına ulaşmış
          </p>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full p-8 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-3" size={56} />
          <h2 className="text-xl font-semibold text-gray-900">Ödeme Başarılı!</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Ödemeniz başarıyla alındı. Teşekkür ederiz.
          </p>
          <p className="text-xs text-gray-400 mt-3">{link.merchant_name}</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full p-8 text-center">
          <XCircle className="mx-auto text-red-400 mb-3" size={56} />
          <h2 className="text-xl font-semibold text-gray-900">Ödeme Başarısız</h2>
          <p className="text-gray-500 mt-2 text-sm">{errorMsg}</p>
          <button
            onClick={() => setStep('form')}
            className="btn-primary mt-5 w-full"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          {/* Başlık */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mb-3 shadow-md">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{link.title || 'Ödeme Yap'}</h1>
            {link.description && (
              <p className="text-gray-500 text-sm mt-1">{link.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{link.merchant_name}</p>
          </div>

          <div className="card p-6">
            <form onSubmit={handleSubmit((d) => payMutation.mutate(d))} className="space-y-4">
              {/* Tutar */}
              {link.amount ? (
                <div className="text-center py-3 bg-primary-50 rounded-xl">
                  <span className="text-2xl font-bold text-primary-700">
                    {formatCurrency(link.amount, link.currency)}
                  </span>
                </div>
              ) : (
                <div>
                  <label className="label">Tutar (₺)</label>
                  <input
                    {...register('amount', { required: 'Tutar gerekli', min: { value: 1, message: 'Min 1 TL' } })}
                    type="number"
                    step="0.01"
                    className="input text-lg"
                    placeholder="0.00"
                  />
                  {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                </div>
              )}

              <hr className="border-gray-100" />

              {/* Kart bilgileri */}
              <div>
                <label className="label">Kart Numarası</label>
                <input
                  {...register('card_number', {
                    required: 'Kart numarası gerekli',
                    validate: (v) => luhnCheck(v) || 'Geçersiz kart numarası',
                  })}
                  className="input tracking-widest"
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                />
                {errors.card_number && <p className="text-red-500 text-xs mt-1">{errors.card_number.message}</p>}
              </div>

              <div>
                <label className="label">Kart Sahibi</label>
                <input
                  {...register('card_holder', { required: 'Kart sahibi gerekli' })}
                  className="input"
                  placeholder="AD SOYAD"
                />
                {errors.card_holder && <p className="text-red-500 text-xs mt-1">{errors.card_holder.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Ay</label>
                  <input
                    {...register('exp_month', {
                      required: 'Zorunlu',
                      pattern: { value: /^(0?[1-9]|1[0-2])$/, message: 'Geçersiz' },
                    })}
                    className="input"
                    placeholder="MM"
                    maxLength={2}
                  />
                  {errors.exp_month && <p className="text-red-500 text-xs mt-1">{errors.exp_month.message}</p>}
                </div>
                <div>
                  <label className="label">Yıl</label>
                  <input
                    {...register('exp_year', {
                      required: 'Zorunlu',
                      pattern: { value: /^\d{2}$/, message: 'Geçersiz' },
                      validate: (v) =>
                        validateExpiry(getValues('exp_month'), v) || 'Kart süresi dolmuş',
                    })}
                    className="input"
                    placeholder="YY"
                    maxLength={2}
                  />
                  {errors.exp_year && <p className="text-red-500 text-xs mt-1">{errors.exp_year.message}</p>}
                </div>
                <div>
                  <label className="label">CVV</label>
                  <input
                    {...register('cvv', {
                      required: 'Zorunlu',
                      pattern: { value: /^\d{3,4}$/, message: 'Geçersiz' },
                    })}
                    className="input"
                    type="password"
                    placeholder="***"
                    maxLength={4}
                  />
                  {errors.cvv && <p className="text-red-500 text-xs mt-1">{errors.cvv.message}</p>}
                </div>
              </div>


              {/* Taksit seçimi — dinamik */}
              {link.allow_installments && (
                <div>
                  <label className="label">Taksit Seçimi</label>
                  {loadingInstallments ? (
                    <div className="input flex items-center gap-2 text-gray-400 text-sm">
                      <Loader2 size={14} className="animate-spin" /> Taksit seçenekleri yükleniyor…
                    </div>
                  ) : installmentOptions.length > 0 ? (
                    <>
                      <select
                        value={selectedInstallments}
                        onChange={(e) => setSelectedInstallments(parseInt(e.target.value))}
                        className="input"
                      >
                        {installmentOptions.map((opt) => {
                          const displayTotal = commissionPassthrough && opt.gross_amount
                            ? opt.gross_amount
                            : opt.total_amount
                          const displayMonthly = commissionPassthrough && opt.gross_monthly
                            ? opt.gross_monthly
                            : opt.monthly_amount
                          return (
                            <option key={opt.count} value={opt.count}>
                              {opt.count === 1
                                ? `Peşin — ${formatCurrencyTR(displayTotal)} TL`
                                : `${opt.count} Taksit × ${formatCurrencyTR(displayMonthly)} = ${formatCurrencyTR(displayTotal)} TL`
                              }
                            </option>
                          )
                        })}
                      </select>

                      {/* Gross-up bilgi notu */}
                      {commissionPassthrough && selectedOption && selectedOption.count > 1 && selectedOption.gross_amount && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                          Ürün bedeli <strong>{formatCurrencyTR(netAmount)} TL</strong> —{' '}
                          {selectedOption.commission_rate && (
                            <>%{selectedOption.commission_rate} banka komisyonu dahil</>
                          )}{' '}
                          toplam <strong>{formatCurrencyTR(selectedOption.gross_amount)} TL</strong> ödenecek
                        </p>
                      )}
                      {!commissionPassthrough && selectedOption && selectedOption.count > 1 && selectedOption.commission_rate && (
                        <p className="text-xs text-gray-400 mt-1">
                          %{selectedOption.commission_rate} banka komisyonu satıcı tarafından karşılanmaktadır.
                        </p>
                      )}
                    </>
                  ) : (
                    <select className="input" disabled>
                      <option>Kart numarasını girin…</option>
                    </select>
                  )}
                </div>
              )}

              <hr className="border-gray-100" />

              <div>
                <label className="label">Ad Soyad</label>
                <input
                  {...register('customer_name', { required: 'İsim gerekli' })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  {...register('customer_email', { required: 'Email gerekli' })}
                  type="email"
                  className="input"
                />
              </div>

              <button
                type="submit"
                disabled={payMutation.isPending}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              >
                {payMutation.isPending ? (
                  <><Loader2 className="animate-spin" size={18} /> İşleniyor...</>
                ) : (
                  <><Lock size={16} /> Güvenli Ödeme Yap</>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <Lock size={12} />
              <span>256-bit SSL ile korunan güvenli ödeme</span>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Powered by <span className="font-medium text-primary-600">Payoni</span>
          </p>
        </div>
      </div>

      {/* 3D Secure Modal */}
      {threeDData && (
        <ThreeDModal
          transactionId={threeDData.transaction_id}
          htmlForm={threeDData.html_content}
          redirectUrl={threeDData.redirect_url}
          onSuccess={() => {
            setThreeDData(null)
            setStep('success')
          }}
          onFailure={(_txId, msg) => {
            setThreeDData(null)
            setErrorMsg(msg || 'Ödeme başarısız')
            setStep('error')
          }}
          onClose={() => {
            setThreeDData(null)
            setStep('error')
            setErrorMsg('Ödeme iptal edildi')
          }}
        />
      )}
    </>
  )
}
