import { Settings, Link2, BarChart3 } from 'lucide-react'

const STEPS = [
  {
    num: '01',
    icon: Settings,
    color: 'bg-indigo-600',
    title: 'POS Hesabınızı Bağlayın',
    desc: 'iyzico, PayTR, Garanti, Akbank ve 44+ sağlayıcıdan birini seçin. API bilgilerinizi girin, taksit komisyon oranlarınızı tanımlayın.',
  },
  {
    num: '02',
    icon: Link2,
    color: 'bg-violet-600',
    title: 'Ödeme Kanalı Oluşturun',
    desc: 'Müşterinizle paylaşmak için ödeme linki oluşturun ya da web sitenize gömülü widget ekleyin. Birkaç dakika içinde hazır.',
  },
  {
    num: '03',
    icon: BarChart3,
    color: 'bg-emerald-600',
    title: 'Ödemeleri Takip Edin',
    desc: 'Gerçek zamanlı dashboard\'dan gelirlerinizi, başarı oranlarınızı ve tüm işlem detaylarını izleyin. CSV ile dışa aktarın.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
            Nasıl Çalışır?
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            3 adımda ödeme almaya başlayın
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Teknik bilgi gerektirmez. Kurulum 10 dakikadan az sürer.
          </p>
        </div>

        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-indigo-300 via-violet-300 to-emerald-300" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {STEPS.map(({ num, icon: Icon, color, title, desc }) => (
              <div key={num} className="relative flex flex-col items-center text-center">
                {/* Step number + icon */}
                <div className="relative mb-6">
                  <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 z-10 relative`}>
                    <Icon size={26} className="text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-white border-2 border-indigo-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-indigo-600">{num.slice(1)}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
