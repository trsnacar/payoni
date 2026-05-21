import { Link } from 'react-router-dom'
import { ArrowRight, Play, Shield, TrendingUp, Zap } from 'lucide-react'

const STATS = [
  { value: '48+', label: 'POS Sağlayıcı' },
  { value: '3D', label: 'Secure Desteği' },
  { value: '12', label: 'Taksit Seçeneği' },
  { value: '%99.9', label: 'Uptime' },
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400 rounded-full opacity-20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full opacity-[0.03]" />
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Text */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <Zap size={13} className="text-yellow-300" />
              <span className="text-sm text-white/90 font-medium">Türkiye'nin ödeme platformu</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Tüm Ödemelerinizi
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Tek Panelden
              </span>
              <br />
              Yönetin
            </h1>

            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-xl">
              48+ sanal POS sağlayıcısını bağlayın, ödeme linkleri oluşturun, taksit oranlarını yönetin
              ve gerçek zamanlı analizlerinizi takip edin.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-50 transition-all text-sm"
              >
                Ücretsiz Deneyin
                <ArrowRight size={16} />
              </Link>
              <a
                href="#how-it-works"
                onClick={(e) => { e.preventDefault(); document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' }) }}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/20 transition-all text-sm"
              >
                <Play size={14} className="fill-white" />
                Nasıl Çalışır?
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap gap-5">
              {[
                { icon: Shield, text: 'PCI DSS Uyumlu' },
                { icon: TrendingUp, text: 'Anlık Raporlama' },
                { icon: Zap, text: 'Hızlı Entegrasyon' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-white/70 text-sm">
                  <Icon size={14} className="text-white/50" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden ring-1 ring-white/20">
              {/* Fake browser bar */}
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4 bg-white rounded-md h-5 text-xs flex items-center px-3 text-gray-400">
                  payoni.com/dashboard
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="bg-gray-50 p-5">
                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Brüt Gelir', value: '₺284.500', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'İşlem Sayısı', value: '1.247', color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Başarı Oranı', value: '%94.2', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
                      <div className={`mt-2 h-1.5 ${bg} rounded-full`}>
                        <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: '70%' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fake chart bars */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3">Günlük Gelir</p>
                  <div className="flex items-end gap-1.5 h-16">
                    {[40, 65, 45, 80, 60, 90, 75, 85, 70, 95, 80, 100, 88, 72].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{
                          height: `${h}%`,
                          background: i === 13 ? '#6366f1' : '#e0e7ff',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Fake transaction rows */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-xs font-semibold text-gray-500">Son İşlemler</p>
                  </div>
                  {[
                    { name: 'Ahmet Y.', amount: '₺2.500', status: 'Başarılı', color: 'text-emerald-600 bg-emerald-50' },
                    { name: 'Fatma K.', amount: '₺850', status: 'Başarılı', color: 'text-emerald-600 bg-emerald-50' },
                    { name: 'Mehmet D.', amount: '₺12.000', status: 'Bekliyor', color: 'text-amber-600 bg-amber-50' },
                  ].map(({ name, amount, status, color }) => (
                    <div key={name} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{name}</p>
                        <p className="text-xs text-gray-400">iyzico · Bugün</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{status}</span>
                        <span className="text-xs font-semibold text-gray-800">{amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Bu ay</p>
                <p className="text-sm font-bold text-gray-900">+%23 gelir artışı</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-extrabold text-white">{value}</p>
              <p className="text-sm text-white/60 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 inset-x-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="white" />
        </svg>
      </div>
    </section>
  )
}
