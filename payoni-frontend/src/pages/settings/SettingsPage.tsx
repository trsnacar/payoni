import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { merchantsApi, Merchant } from '@/api/merchants'
import { useAuthStore } from '@/store/authStore'

interface ProfileForm {
  business_name: string
  phone: string
  tax_id: string
}

interface WebhookForm {
  webhook_url: string
  webhook_secret: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const setMerchant = useAuthStore((s) => s.setMerchant)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [webhookSuccess, setWebhookSuccess] = useState(false)

  const { data: me } = useQuery<Merchant>({
    queryKey: ['merchant-me'],
    queryFn: merchantsApi.getMe,
  })

  const profileForm = useForm<ProfileForm>({
    values: {
      business_name: me?.business_name || '',
      phone: me?.phone || '',
      tax_id: me?.tax_id || '',
    },
  })

  const webhookForm = useForm<WebhookForm>({
    values: {
      webhook_url: me?.webhook_url || '',
      webhook_secret: '',
    },
  })

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => merchantsApi.updateMe(data),
    onSuccess: (updated) => {
      setMerchant(updated)
      queryClient.setQueryData(['merchant-me'], updated)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    },
  })

  const webhookMutation = useMutation({
    mutationFn: (data: WebhookForm) =>
      merchantsApi.updateWebhook(data.webhook_url, data.webhook_secret),
    onSuccess: (updated) => {
      setMerchant(updated)
      queryClient.setQueryData(['merchant-me'], updated)
      setWebhookSuccess(true)
      setTimeout(() => setWebhookSuccess(false), 3000)
    },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Ayarlar</h1>
        <p className="text-sm text-gray-500 mt-0.5">Hesap ve entegrasyon ayarları</p>
      </div>

      {/* Profil */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Profil Bilgileri</h2>
        <form onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" value={me?.email || ''} disabled />
          </div>
          <div>
            <label className="label">İşletme Adı</label>
            <input
              {...profileForm.register('business_name', { required: true })}
              className="input"
              placeholder="İşletme adı"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefon</label>
              <input
                {...profileForm.register('phone')}
                className="input"
                placeholder="+90 5xx xxx xx xx"
              />
            </div>
            <div>
              <label className="label">Vergi No</label>
              <input
                {...profileForm.register('tax_id')}
                className="input"
                placeholder="1234567890"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="btn-primary"
            >
              {profileMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            {profileSuccess && (
              <span className="text-sm text-green-600">Profil güncellendi</span>
            )}
            {profileMutation.isError && (
              <span className="text-sm text-red-600">Hata oluştu</span>
            )}
          </div>
        </form>
      </div>

      {/* Webhook */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Webhook Ayarları</h2>
        <p className="text-xs text-gray-500 mb-4">
          Ödeme sonuçları bu URL'e POST olarak iletilir.
        </p>
        <form onSubmit={webhookForm.handleSubmit((d) => webhookMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Webhook URL</label>
            <input
              {...webhookForm.register('webhook_url')}
              className="input"
              placeholder="https://siteniz.com/webhook/payoni"
            />
          </div>
          <div>
            <label className="label">Webhook Secret</label>
            <input
              {...webhookForm.register('webhook_secret')}
              className="input"
              type="password"
              placeholder="Boş bırakırsanız mevcut secret korunur"
            />
            <p className="text-xs text-gray-400 mt-1">
              HMAC-SHA256 imzalama için kullanılır. Payload'ın X-Payoni-Signature header'ı ile doğrulayın.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={webhookMutation.isPending}
              className="btn-primary"
            >
              {webhookMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            {webhookSuccess && (
              <span className="text-sm text-green-600">Webhook ayarları güncellendi</span>
            )}
          </div>
        </form>
      </div>

      {/* Hesap bilgisi */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Hesap Bilgisi</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Plan</span>
            <span className="font-medium capitalize">{me?.plan || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Durum</span>
            <span className={me?.is_active ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
              {me?.is_active ? 'Aktif' : 'Pasif'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Doğrulama</span>
            <span className={me?.is_verified ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
              {me?.is_verified ? 'Doğrulandı' : 'Bekliyor'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Kayıt Tarihi</span>
            <span className="font-medium">
              {me?.created_at ? new Date(me.created_at).toLocaleDateString('tr-TR') : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
