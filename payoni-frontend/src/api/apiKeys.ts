import apiClient from './client'

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  expires_at?: string
  last_used_at?: string
  created_at: string
}

export interface ApiKeyCreate {
  name: string
  expires_at?: string
}

export interface ApiKeyCreated extends ApiKey {
  full_key: string
}

export const apiKeysApi = {
  list: () => apiClient.get<ApiKey[]>('/api-keys').then((r) => r.data),

  create: (data: ApiKeyCreate) =>
    apiClient.post<ApiKeyCreated>('/api-keys', data).then((r) => r.data),

  revoke: (id: string) => apiClient.delete(`/api-keys/${id}`),
}
