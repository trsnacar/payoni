import apiClient from './client'

export interface Merchant {
  id: string
  email: string
  business_name: string
  tax_id?: string
  phone?: string
  company_type?: string
  tax_office?: string
  trade_registry_no?: string
  company_address?: string
  authorized_name?: string
  authorized_title?: string
  authorized_phone?: string
  is_active: boolean
  is_verified: boolean
  plan: string
  onboarding_status: string
  webhook_url?: string
  created_at: string
}

export interface MerchantDocument {
  id: string
  document_type: string
  original_filename: string
  file_size: number
  mime_type: string
  status: string
  uploaded_at: string
  rejection_reason?: string
}

export const merchantsApi = {
  getMe: () => apiClient.get<Merchant>('/merchants/me').then((r) => r.data),

  updateMe: (data: Partial<Pick<Merchant, 'business_name' | 'phone' | 'tax_id'>>) =>
    apiClient.put<Merchant>('/merchants/me', data).then((r) => r.data),

  updateWebhook: (webhook_url: string, webhook_secret: string) =>
    apiClient.put<Merchant>('/merchants/me/webhook', { webhook_url, webhook_secret }).then((r) => r.data),

  changePassword: (current_password: string, new_password: string) =>
    apiClient.put<{ message: string }>('/merchants/me/password', { current_password, new_password }).then((r) => r.data),

  listDocuments: () =>
    apiClient.get<MerchantDocument[]>('/merchants/me/documents').then((r) => r.data),

  uploadDocument: (documentType: string, file: File) => {
    const fd = new FormData()
    fd.append('document_type', documentType)
    fd.append('file', file)
    return apiClient.post<MerchantDocument>('/merchants/me/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
