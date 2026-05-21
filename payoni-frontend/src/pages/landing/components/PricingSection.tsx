import { Link } from 'react-router-dom'
import { Check, Zap } from 'lucide-react'

const PLANS = [
  {
    name: 'Başlangıç',
    price: 'Ücretsiz',
    period: null,
    description: 'Küçük işletmeler ve bireysel satıcılar için',
    highlight: false,
    cta: 'Hemen Başla',
    ctaTo: '/register',
    features: [
      '2 POS hesabı',
      'Aylık 500 işlem',
      'Ödeme linkleri (sınırsız)',
      '3D Secure desteği',
      'Temel analitik',
      'E-posta desteği',
    ],
  },
  {
    name: 'Pro',
    price: '₺499',
    period: '/ay',
    description: 'Büyüyen işletmeler için tam özellik seti',
    highlight: true,
    cta: 'Pro\'ya Geç',
    ctaTo: '/register?plan=pro',
    features: [
      'Sınırsız POS hesabı',
      'Sınırsız işlem',
      'Gömülü Widget',
      'API erişimi',
      'Taksit komisyon yönetimi',
      'Gelişmiş analitik & raporlar',
      'Webhook entegrasyonu',
      'Öncelikli destek',
    ],
  },
  {
    name: 'Enterprise',
    price: 'İletişim',
    period: null,
    description: 'Kurumsal şirketler için özel çözümler',
    highlight: false,
    cta: 'Bizimle İletişime Geçin',
    ctaTo: '/register?plan=enterprise',
    features: [
      'Her şey Pro\'da dahil',
      'White-label çözüm',
      'Özel entegrasyon desteği',
      'SLA garantisi (%99.9)',
      'Dedicated hesap yöneticisi',
      'Özel fiyatlandırma',
    ],
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
            Fiyatlandırma
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            İşletmenize uygun planı seçin
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Kredi kartı gerekmez. İstediğiniz zaman yükseltebilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map(({ name, price, period, description, highlight, cta, ctaTo, features }) => (
            <div
              key={name}
              className={`relative rounded-3xl p-8 border transition-all ${
                highlight
                  ? 'bg-gradient-to-b from-indigo-600 to-violet-700 border-indigo-500 shadow-2xl shadow-indigo-300/50 scale-105'
                  : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-lg'
              }`}
            >
              {highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    <Zap size={11} />
                    En Popüler
                  </div>
                </div>
              )}

              <div className="mb-6">
                <p className={`text-sm font-semibold uppercase tracking-wider mb-1 ${highlight ? 'text-indigo-200' : 'text-indigo-600'}`}>
                  {name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold ${highlight ? 'text-white' : 'text-gray-900'}`}>
                    {price}
                  </span>
                  {period && (
                    <span className={`text-sm ${highlight ? 'text-indigo-200' : 'text-gray-500'}`}>{period}</span>
                  )}
                </div>
                <p className={`text-sm mt-2 ${highlight ? 'text-indigo-200' : 'text-gray-500'}`}>
                  {description}
                </p>
              </div>

              <Link
                to={ctaTo}
                className={`block text-center text-sm font-semibold px-6 py-3 rounded-xl mb-8 transition-all ${
                  highlight
                    ? 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-md'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                }`}
              >
                {cta}
              </Link>

              <ul className="space-y-3">
                {features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      highlight ? 'bg-white/20' : 'bg-indigo-100'
                    }`}>
                      <Check size={10} className={highlight ? 'text-white' : 'text-indigo-600'} />
                    </div>
                    <span className={`text-sm ${highlight ? 'text-indigo-100' : 'text-gray-600'}`}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
