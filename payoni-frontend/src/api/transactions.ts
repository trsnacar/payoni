import apiClient from './client'

export interface Transaction {
  id: string
  amount: string
  currency: string
  installments: number
  status: 'pending' | 'captured' | 'failed' | 'cancelled' | 'refunded'
  card_last4?: string
  card_brand?: string
  card_holder?: string
  customer_email?: string
  customer_name?: string
  is_3d: boolean
  three_d_status?: string
  gateway_tx_id?: string
  error_code?: string
  error_message?: string
  refunded_amount: string
  description?: string
  created_at: string
  updated_at: string
}

export interface TransactionList {
  items: Transaction[]
  total: number
  page: number
  per_page: number
}

export const transactionsApi = {
  list: (params?: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string; search?: string }) =>
    apiClient.get<TransactionList>('/transactions', { params }).then((r) => r.data),

  get: (id: string) => apiClient.get<Transaction>(`/transactions/${id}`).then((r) => r.data),

  export: () =>
    apiClient
      .get('/transactions/export', { responseType: 'blob' })
      .then((r) => {
        const url = window.URL.createObjectURL(r.data)
        const a = document.createElement('a')
        a.href = url
        a.download = 'transactions.csv'
        a.click()
        window.URL.revokeObjectURL(url)
      }),
}
