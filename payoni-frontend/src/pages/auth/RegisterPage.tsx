import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

interface RegisterForm {
  email: string
  password: string
  confirm_password: string
  business_name: string
  phone?: string
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setAccessToken)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>()
  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register(data)
      setToken(res.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hesap Oluşturun</h1>
          <p className="text-gray-500 mt-1">Payoni'ye ücretsiz kaydolun</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">İşletme Adı</label>
              <input
                {...register('business_name', { required: 'İşletme adı gerekli' })}
                className="input"
                placeholder="Şirket Adı A.Ş."
              />
              {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name.message}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                {...register('email', { required: 'Email gerekli' })}
                type="email"
                className="input"
                placeholder="ornek@sirket.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Telefon (opsiyonel)</label>
              <input
                {...register('phone')}
                type="tel"
                className="input"
                placeholder="05XX XXX XXXX"
              />
            </div>

            <div>
              <label className="label">Şifre</label>
              <input
                {...register('password', {
                  required: 'Şifre gerekli',
                  minLength: { value: 8, message: 'En az 8 karakter' },
                })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Şifre Tekrar</label>
              <input
                {...register('confirm_password', {
                  required: 'Şifre tekrarı gerekli',
                  validate: (v) => v === password || 'Şifreler eşleşmiyor',
                })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Giriş yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
