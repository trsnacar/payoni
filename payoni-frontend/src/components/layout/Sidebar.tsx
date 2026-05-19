import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard, List, Link2, Code2, BarChart3, Settings, KeyRound, Webhook
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/pos-accounts', icon: CreditCard, label: 'POS Hesapları' },
  { to: '/transactions', icon: List, label: 'İşlemler' },
  { to: '/payment-links', icon: Link2, label: 'Ödeme Linkleri' },
  { to: '/widgets', icon: Code2, label: 'Embed Widget' },
  { to: '/analytics', icon: BarChart3, label: 'Analitik' },
  { to: '/api-keys', icon: KeyRound, label: 'API Anahtarları' },
  { to: '/webhook-logs', icon: Webhook, label: 'Webhook Logları' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg">Payoni</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          <Settings size={18} />
          Ayarlar
        </NavLink>
      </div>
    </aside>
  )
}
