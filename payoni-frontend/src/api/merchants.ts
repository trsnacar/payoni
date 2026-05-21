import apiClient from './client'

export interface Merchant {
  id: string
  email: string
  business_name: string
  tax_id?: string
  phone?: string
  is_active: boolean
  is_verified: boolean
  plan: string
  webhook_url?: string
  created_at: string
}

export const merchantsApi = {
  getMe: () => apiClient.get<Merchant>('/merchants/me').then((r) => r.data),

  updateMe: (data: Partial<Pick<Merchant, 'business_name' | 'phone' | 'tax_id'>>) =>
    apiClient.put<Merchant>('/merchants/me', data).then((r) => r.data),

  updateWebhook: (webhook_url: string, webhook_secret: string) =>
    apiClient.put<Merchant>('/merchants/me/webhook', { webhook_url, webhook_secret }).then((r) => r.data),

  changePassword: (current_password: string, new_password: string) =>
    apiClient.put<{ message: string }>('/merchants/me/password', { current_password, new_password }).then((r) => r.data),
}
