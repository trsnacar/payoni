import { Link } from 'react-router-dom'
import { Zap, Mail, MapPin } from 'lucide-react'

const FOOTER_LINKS = {
  Ürün: [
    { label: 'Özellikler', href: '#features' },
    { label: 'Fiyatlandırma', href: '#pricing' },
    { label: 'Nasıl Çalışır', href: '#how-it-works' },
  ],
  Hesap: [
    { label: 'Giriş Yap', href: '/login' },
    { label: 'Kayıt Ol', href: '/register' },
  ],
  Destek: [
    { label: 'Dokümantasyon', href: '#' },
    { label: 'API Referansı', href: '#' },
    { label: 'İletişim', href: '#' },
  ],
}

export function LandingFooter() {
  const scrollTo = (href: string) => {
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
                <Zap size={15} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">Payoni</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Türkiye'nin en kapsamlı ödeme yönetim platformu. 48+ sağlayıcıyla entegrasyon, güvenli 3D Secure ve detaylı analitik.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-indigo-400" />
                <span>destek@payoni.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-indigo-400" />
                <span>İstanbul, Türkiye</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="text-white text-sm font-semibold mb-4">{group}</p>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    {href.startsWith('/') ? (
                      <Link to={href} className="text-sm hover:text-white transition-colors">
                        {label}
                      </Link>
                    ) : (
                      <button
                        onClick={() => scrollTo(href)}
                        className="text-sm hover:text-white transition-colors text-left"
                      >
                        {label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© 2026 Payoni. Tüm hakları saklıdır.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a>
            <a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a>
            <a href="#" className="hover:text-white transition-colors">KVKK</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
