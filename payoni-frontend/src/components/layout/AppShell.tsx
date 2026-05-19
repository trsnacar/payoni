import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { merchantsApi } from '@/api/merchants'
import { useAuthStore } from '@/store/authStore'

export default function AppShell() {
  const setMerchant = useAuthStore((s) => s.setMerchant)

  useEffect(() => {
    merchantsApi.getMe().then(setMerchant).catch(() => {})
  }, [setMerchant])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
