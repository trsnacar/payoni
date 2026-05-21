import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Mail, FileText, Zap, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'

const DOCS = [
  'Vergi Levhası',
  'İmza Sirküleri',
  'TC Kimlik Kartı (Ön Yüz)',
  'TC Kimlik Kartı (Arka Yüz)',
  'Ticari Sicil Gazetesi',
]

const STEPS_INFO = [
  { icon: FileText, label: 'Belgeler alındı',          done: true },
  { icon: Clock,    label: 'İnceleme bekliyor (1-3 iş günü)', done: false },
  { icon: Mail,     label: 'E-posta bildirimi',         done: false },
]

export default function PendingVerificationPage() {
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">Payoni</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <LogOut size={15} />
          Çıkış Yap
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle size={40} className="text-emerald-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                <Clock size={13} className="text-white" />
              </div>
            </div>
          </div>

          {/* Başlık */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Başvurunuz Alındı!</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Belgeleriniz başarıyla gönderildi. Ekibimiz başvurunuzu inceleyecek
              ve sonuç hakkında e-posta ile bilgi verilecektir.
            </p>
          </div>

          {/* Durum kartı */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Süreç Durumu</h2>
            <div className="space-y-4">
              {STEPS_INFO.map(({ icon: Icon, label, done }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon size={15} />
                  </div>
                  <span className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  {done && <CheckCircle size={14} className="text-emerald-500 ml-auto" />}
                </div>
              ))}
            </div>
          </div>

          {/* Yüklenen belgeler */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Gönderilen Belgeler</h2>
            <ul className="space-y-2">
              {DOCS.map((doc) => (
                <li key={doc} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>

          {/* Bilgi notu */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 text-sm text-indigo-800 mb-6">
            <p className="font-medium mb-1">Ne zaman aktifleşir?</p>
            <p className="text-indigo-700">
              Belgeler ekibimiz tarafından incelendikten sonra genellikle{' '}
              <strong>1-3 iş günü</strong> içinde hesabınız aktifleştirilir.
              Onay/ret bildirimi kayıt e-postanıza iletilecektir.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/"
              className="flex-1 text-center py-3 border border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-sm font-medium"
            >
              Ana Sayfaya Dön
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-semibold"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
