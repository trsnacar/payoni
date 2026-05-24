import apiClient from './client'

export interface PosAccount {
  id: string
  provider_slug: string
  display_name?: string
  is_active: boolean
  is_default: boolean
  environment: string
  last_tested_at?: string
  last_test_success?: boolean
  commission_rates?: Record<string, number>
  created_at: string
}

export interface PosAccountCreate {
  provider_slug: string
  display_name?: string
  credentials: Record<string, string>
  environment?: string
  is_default?: boolean
  commission_rates?: Record<string, number>
}

export interface Provider {
  slug: string
  name: string
  logo: string
  logo_fallback?: string
  color?: string
  category: string
}

export const posAccountsApi = {
  list: () => apiClient.get<PosAccount[]>('/pos-accounts').then((r) => r.data),

  create: (data: PosAccountCreate) =>
    apiClient.post<PosAccount>('/pos-accounts', data).then((r) => r.data),

  update: (id: string, data: Partial<PosAccountCreate>) =>
    apiClient.put<PosAccount>(`/pos-accounts/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/pos-accounts/${id}`),

  test: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/pos-accounts/${id}/test`).then((r) => r.data),

  setDefault: (id: string) =>
    apiClient.post<PosAccount>(`/pos-accounts/${id}/set-default`).then((r) => r.data),

  listProviders: () =>
    apiClient.get<{ providers: Provider[]; schemas: Record<string, any[]> }>('/providers').then((r) => r.data),
}
