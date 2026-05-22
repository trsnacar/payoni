import apiClient from './client'

export interface AdminMerchant {
  id: string
  email: string
  business_name: string
  company_type: string | null
  onboarding_status: string
  is_verified: boolean
  is_active: boolean
  plan: string
  created_at: string
}

export interface AdminMerchantDetail extends AdminMerchant {
  tax_id: string | null
  phone: string | null
  tax_office: string | null
  trade_registry_no: string | null
  company_address: string | null
  authorized_name: string | null
  authorized_title: string | null
  authorized_phone: string | null
  documents: AdminDocument[]
}

export interface AdminDocument {
  id: string
  document_type: string
  original_filename: string
  file_size: number
  mime_type: string
  file_path: string
  status: string
  uploaded_at: string
  rejection_reason: string | null
}

export interface AdminStats {
  pending: number
  under_review: number
  approved: number
  rejected: number
  total: number
}

export const adminApi = {
  getStats: () =>
    apiClient.get<AdminStats>('/admin/stats').then((r) => r.data),

  listMerchants: (params?: { status?: string; page?: number; per_page?: number }) =>
    apiClient.get<AdminMerchant[]>('/admin/merchants', { params }).then((r) => r.data),

  getMerchant: (id: string) =>
    apiClient.get<AdminMerchantDetail>(`/admin/merchants/${id}`).then((r) => r.data),

  approveMerchant: (id: string) =>
    apiClient.put<AdminMerchantDetail>(`/admin/merchants/${id}/approve`).then((r) => r.data),

  rejectMerchant: (id: string, reason: string) =>
    apiClient.put<AdminMerchantDetail>(`/admin/merchants/${id}/reject`, { reason }).then((r) => r.data),

  updateDocStatus: (docId: string, status: 'approved' | 'rejected', reason?: string) =>
    apiClient.put(`/admin/documents/${docId}/status`, { status, reason }).then((r) => r.data),
}
