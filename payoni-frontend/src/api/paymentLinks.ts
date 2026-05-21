import apiClient from './client'
import axios from 'axios'

export interface PaymentLink {
  id: string
  short_code: string
  title?: string
  description?: string
  amount?: string
  currency: string
  min_amount?: string
  max_amount?: string
  preferred_pos_id?: string
  allow_installments: boolean
  max_uses?: number
  use_count: number
  expires_at?: string
  is_active: boolean
  redirect_url?: string
  custom_fields?: any[]
  url: string
  created_at: string
}

export interface PaymentLinkCreate {
  title?: string
  description?: string
  amount?: number
  currency?: string
  min_amount?: number
  max_amount?: number
  preferred_pos_id?: string
  allow_installments?: boolean
  commission_passthrough?: boolean
  max_uses?: number
  expires_at?: string
  redirect_url?: string
}

export interface PublicPaymentLink {
  title?: string
  description?: string
  amount?: string
  currency: string
  min_amount?: string
  max_amount?: string
  allow_installments: boolean
  commission_passthrough?: boolean
  preferred_pos_id?: string
  merchant_name?: string
  is_available: boolean
  expires_at?: string
}

export const paymentLinksApi = {
  list: () => apiClient.get<PaymentLink[]>('/payment-links').then((r) => r.data),

  create: (data: PaymentLinkCreate) =>
    apiClient.post<PaymentLink>('/payment-links', data).then((r) => r.data),

  update: (id: string, data: Partial<PaymentLinkCreate & { is_active: boolean }>) =>
    apiClient.put<PaymentLink>(`/payment-links/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/payment-links/${id}`),

  // Public endpoint — kimlik doğrulama gerekmez
  resolvePublic: (shortCode: string) =>
    axios.get<PublicPaymentLink>(`/pay/${shortCode}`).then((r) => r.data),
}
