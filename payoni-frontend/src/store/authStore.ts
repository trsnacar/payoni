import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Merchant } from '@/api/merchants'

interface AuthState {
  accessToken: string | null
  isAuthenticated: boolean
  merchant: Merchant | null
  setAccessToken: (token: string) => void
  setMerchant: (merchant: Merchant) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      isAuthenticated: false,
      merchant: null,

      setAccessToken: (token) =>
        set({ accessToken: token, isAuthenticated: true }),

      setMerchant: (merchant) =>
        set({ merchant }),

      logout: () =>
        set({ accessToken: null, isAuthenticated: false, merchant: null }),
    }),
    {
      name: 'payoni-auth',
      partialize: (state) => ({ accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
