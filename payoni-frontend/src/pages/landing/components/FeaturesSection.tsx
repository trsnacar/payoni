import { Shield, CreditCard, Link2, BarChart3, Repeat, Globe, Smartphone, Zap } from 'lucide-react'

const FEATURES = [
  {
    icon: Shield,
    color: 'bg-indigo-100 text-indigo-600',
    title: 'Güvenli 3D Secure',
    desc: 'Her işlemde 3D Secure desteği. AES-256 şifreli POS credential saklama. PCI DSS uyumlu altyapı.',
  },
  {
    icon: CreditCard,
    color: 'bg-violet-100 text-violet-600',
    title: 'Taksit Yönetimi',
    desc: 'Taksit başına komisyon oranı tanımlayın. Komisyonu müşteriye yansıtın ya da kendiniz üstlenin — otomatik gross-up hesabıyla.',
  },
  {
    icon: Link2,
    color: 'bg-sky-100 text-sky-600',
    title: 'Ödeme Linkleri',
    desc: 'Saniyeler içinde ödeme linki oluşturun, müşterinizle paylaşın. Sabit fiyat ya da müşteri girişi, taksit izni, kullanım limiti.',
  },
  {
    icon: BarChart3,
    color: 'bg-emerald-100 text-emerald-600',
    title: 'Gelişmiş Analitik',
    desc: 'Günlük gelir grafikleri, başarı oranı ibresi, sağlayıcı karşılaştırması, kar/zarar özeti — hepsi tek ekranda.',
  },
  {
    icon: Globe,
    color: 'bg-orange-100 text-orange-600',
    title: 'Gömülü Widget',
    desc: 'Web sitenize birkaç satır kod ile ödeme formu ekleyin. CORS korumalı, postMessage API ile sonuç bildirimi.',
  },
  {
    icon: Repeat,
    color: 'bg-rose-100 text-rose-600',
    title: 'Webhook & Retry',
    desc: 'İşlem sonuçları anında sistemlerinize iletilir. Başarısız webhook\'lar otomatik yeniden denenir, manuel retry de desteklenir.',
  },
  {
    icon: Smartphone,
    color: 'bg-amber-100 text-amber-600',
    title: 'Mobil Uyumlu',
    desc: 'Ödeme sayfaları ve dashboard tam mobil uyumlu. Müşterileriniz telefon, tablet veya bilgisayardan sorunsuz ödeme yapabilir.',
  },
  {
    icon: Zap,
    color: 'bg-teal-100 text-teal-600',
    title: 'API Entegrasyonu',
    desc: 'REST API ve API key yönetimiyle kendi sistemlerinizden ödeme işlemi başlatın. Sandbox ortamıyla güvenle test edin.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
            Özellikler
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Ödeme yönetiminde ihtiyacınız olan<br />her şey burada
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Küçük işletmelerden kurumsal şirketlere kadar ölçeklenebilen, güvenli ve esnek ödeme altyapısı.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="group p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-white"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
