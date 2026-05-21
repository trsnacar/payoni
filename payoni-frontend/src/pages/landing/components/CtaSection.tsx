import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'

export function CtaSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-12 sm:p-16 shadow-2xl shadow-indigo-300/40 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full opacity-5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full opacity-5 translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 mb-6">
              <Zap size={13} className="text-yellow-300" />
              <span className="text-sm text-white/90 font-medium">Hemen başlayabilirsiniz</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              İlk ödemenizi
              <br />
              dakikalar içinde alın
            </h2>
            <p className="text-indigo-200 text-lg mb-10 max-w-xl mx-auto">
              Ücretsiz hesabınızı oluşturun, POS'unuzu bağlayın, ilk ödeme linkinizi paylaşın.
              Kredi kartı gerekmez.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:bg-indigo-50 transition-all"
              >
                Ücretsiz Hesap Oluştur
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-all"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
