const PROVIDERS = [
  { name: 'iyzico', logo: 'https://logo.clearbit.com/iyzico.com' },
  { name: 'PayTR', logo: 'https://logo.clearbit.com/paytr.com' },
  { name: 'Garanti', logo: 'https://logo.clearbit.com/garantibbva.com.tr' },
  { name: 'Akbank', logo: 'https://logo.clearbit.com/akbank.com' },
  { name: 'İş Bankası', logo: 'https://logo.clearbit.com/isbank.com.tr' },
  { name: 'Yapı Kredi', logo: 'https://logo.clearbit.com/yapikredi.com.tr' },
  { name: 'Vakıfbank', logo: 'https://logo.clearbit.com/vakifbank.com.tr' },
  { name: 'Sipay', logo: 'https://logo.clearbit.com/sipay.com.tr' },
  { name: 'Moka', logo: 'https://logo.clearbit.com/moka.com.tr' },
  { name: 'iPara', logo: 'https://logo.clearbit.com/ipara.com' },
]

function ProviderLogo({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
      <img
        src={logo}
        alt={name}
        className="w-10 h-10 object-contain grayscale group-hover:grayscale-0 transition-all"
        onError={(e) => {
          const div = e.currentTarget.parentElement!
          e.currentTarget.style.display = 'none'
          const fallback = document.createElement('div')
          fallback.className = 'w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xs font-bold text-indigo-600'
          fallback.textContent = name.slice(0, 2).toUpperCase()
          div.prepend(fallback)
        }}
      />
      <span className="text-xs text-gray-500 font-medium">{name}</span>
    </div>
  )
}

export function ProvidersSection() {
  return (
    <section className="py-16 bg-gray-50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-2">
            Desteklenen Sağlayıcılar
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            48+ Sanal POS Sağlayıcısıyla Entegrasyon
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Türkiye'deki tüm büyük bankalar ve ödeme aracıları tek platformda
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-3">
          {PROVIDERS.map((p) => (
            <ProviderLogo key={p.name} {...p} />
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          ve <span className="font-semibold text-gray-600">38 sağlayıcı</span> daha…
        </p>
      </div>
    </section>
  )
}
