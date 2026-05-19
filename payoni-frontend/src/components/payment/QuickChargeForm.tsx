import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { posAccountsApi } from '@/api/posAccounts'
import { paymentsApi, ChargeRequest } from '@/api/payments'
import { ThreeDModal } from './ThreeDModal'

interface FormData {
  pos_account_id: string
  amount: string
  card_number: string
  card_holder: string
  exp_month: string
  exp_year: string
  cvv: string
  customer_name: string
  customer_email: string
  use_3d: boolean
}

interface Props {
  onSuccess?: () => void
}

export function QuickChargeForm({ onSuccess }: Props) {
  const [threeDData, setThreeDData] = useState<{
    txId: string
    html?: string
    redirectUrl?: string
  } | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const { data: accounts = [] } = useQuery({
    queryKey: ['pos-accounts'],
    queryFn: posAccountsApi.list,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { use_3d: true },
  })

  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setResult(null)
    try {
      const payload: ChargeRequest = {
        pos_account_id: data.pos_account_id,
        amount: parseFloat(data.amount),
        currency: 'TRY',
        card: {
          number: data.card_number.replace(/\s/g, ''),
          holder_name: data.card_holder,
          exp_month: data.exp_month,
          exp_year: data.exp_year,
          cvv: data.cvv,
        },
        customer: {
          name: data.customer_name,
          email: data.customer_email,
        },
        use_3d: data.use_3d,
        callback_url: data.use_3d ? `${window.location.origin}/api/v1/payments/3d/callback` : undefined,
      }

      const fn = data.use_3d ? paymentsApi.init3d : paymentsApi.charge
      const res = await fn(payload)

      if (data.use_3d && (res.html_content || res.redirect_url)) {
        setThreeDData({
          txId: res.transaction_id,
          html: res.html_content,
          redirectUrl: res.redirect_url,
        })
      } else {
        setResult({ success: res.status === 'captured', message: res.message || 'İşlem tamamlandı' })
        if (res.status === 'captured') {
          reset()
          onSuccess?.()
        }
      }
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.detail || 'İşlem başarısız' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* POS + Tutar */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">POS Hesabı</label>
            <select {...register('pos_account_id', { required: true })} className="input">
              <option value="">Seçin...</option>
              {accounts.filter((a) => a.is_active).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name || a.provider_slug}
                </option>
              ))}
            </select>
            {errors.pos_account_id && <p className="text-red-500 text-xs mt-1">Gerekli</p>}
          </div>
          <div>
            <label className="label">Tutar (TRY)</label>
            <input
              {...register('amount', { required: true, min: 0.01 })}
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              placeholder="0.00"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">Geçerli tutar girin</p>}
          </div>
        </div>

        {/* Kart */}
        <div>
          <label className="label">Kart Numarası</label>
          <input
            {...register('card_number', { required: true, minLength: 16, maxLength: 19 })}
            className="input font-mono tracking-widest"
            placeholder="0000 0000 0000 0000"
            maxLength={19}
          />
        </div>
        <div>
          <label className="label">Kart Sahibi</label>
          <input
            {...register('card_holder', { required: true })}
            className="input"
            placeholder="AD SOYAD"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Ay</label>
            <input
              {...register('exp_month', { required: true })}
              className="input"
              placeholder="MM"
              maxLength={2}
            />
          </div>
          <div>
            <label className="label">Yıl</label>
            <input
              {...register('exp_year', { required: true })}
              className="input"
              placeholder="YY"
              maxLength={2}
            />
          </div>
          <div>
            <label className="label">CVV</label>
            <input
              {...register('cvv', { required: true })}
              type="password"
              className="input"
              placeholder="•••"
              maxLength={4}
            />
          </div>
        </div>

        {/* Müşteri */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Müşteri Adı</label>
            <input
              {...register('customer_name', { required: true })}
              className="input"
              placeholder="Ad Soyad"
            />
          </div>
          <div>
            <label className="label">Müşteri E-posta</label>
            <input
              {...register('customer_email', { required: true })}
              type="email"
              className="input"
              placeholder="musteri@ornek.com"
            />
          </div>
        </div>

        {/* 3D toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            {...register('use_3d')}
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary-600"
          />
          <span className="text-sm text-gray-700">3D Secure kullan</span>
        </label>

        {result && (
          <div className={`text-sm px-4 py-3 rounded-lg ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || accounts.filter((a) => a.is_active).length === 0}
          className="btn-primary w-full"
        >
          {loading ? 'İşlem yapılıyor...' : 'Ödeme Al'}
        </button>

        {accounts.filter((a) => a.is_active).length === 0 && (
          <p className="text-xs text-center text-gray-400">
            Ödeme almak için önce aktif bir POS hesabı ekleyin.
          </p>
        )}
      </form>

      {threeDData && (
        <ThreeDModal
          transactionId={threeDData.txId}
          htmlForm={threeDData.html}
          redirectUrl={threeDData.redirectUrl}
          onSuccess={() => {
            setThreeDData(null)
            setResult({ success: true, message: '3D Secure ödeme başarıyla tamamlandı' })
            reset()
            onSuccess?.()
          }}
          onFailure={(_, msg) => {
            setThreeDData(null)
            setResult({ success: false, message: msg || '3D Secure doğrulama başarısız' })
          }}
          onClose={() => setThreeDData(null)}
        />
      )}
    </>
  )
}
