import apiClient from './client'

export interface WebhookLog {
  id: string
  direction: 'inbound' | 'outbound'
  provider_slug?: string
  transaction_id?: string
  http_status?: number
  retry_count: number
  url?: string
  payload?: Record<string, unknown>
  response_body?: string
  created_at: string
}

export interface WebhookLogList {
  items: WebhookLog[]
  total: number
  page: number
  per_page: number
}

export const webhooksApi = {
  getLogs: (params?: { page?: number; per_page?: number; direction?: 'inbound' | 'outbound' }) =>
    apiClient.get<WebhookLogList>('/webhooks/logs', { params }).then((r) => r.data),

  retryLog: (logId: string) =>
    apiClient.post<{ message: string }>(`/webhooks/logs/${logId}/retry`).then((r) => r.data),
}
