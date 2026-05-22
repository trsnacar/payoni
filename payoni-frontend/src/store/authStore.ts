import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Merchant } from '@/api/merchants'

interface AuthState {
  accessToken: string | null
  isAuthenticated: boolean
  isSuperuser: boolean
  merchant: Merchant | null
  setAccessToken: (token: string, isSuperuser?: boolean) => void
  setMerchant: (merchant: Merchant) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      isAuthenticated: false,
      isSuperuser: false,
      merchant: null,

      setAccessToken: (token, isSuperuser = false) =>
        set({ accessToken: token, isAuthenticated: true, isSuperuser }),

      setMerchant: (merchant) =>
        set({ merchant }),

      logout: () =>
        set({ accessToken: null, isAuthenticated: false, isSuperuser: false, merchant: null }),
    }),
    {
      name: 'payoni-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        isSuperuser: state.isSuperuser,
      }),
    },
  ),
)
