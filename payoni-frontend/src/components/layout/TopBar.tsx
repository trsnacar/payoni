import { useQuery } from '@tanstack/react-query'
import { LogOut, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { merchantsApi } from '@/api/merchants'
import { authApi } from '@/api/auth'
import { useNavigate } from 'react-router-dom'

export default function TopBar() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  const { data: merchant } = useQuery({
    queryKey: ['merchant-me'],
    queryFn: merchantsApi.getMe,
  })

  const handleLogout = async () => {
    await authApi.logout()
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-sm text-gray-500">
          {merchant?.business_name && (
            <span className="font-medium text-gray-900">{merchant.business_name}</span>
          )}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
          <Bell size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium text-sm">
              {merchant?.email?.[0]?.toUpperCase() ?? 'M'}
            </span>
          </div>
          <span className="text-sm text-gray-600 hidden md:block">{merchant?.email}</span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          title="Çıkış"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
