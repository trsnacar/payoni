import apiClient from './client'

export interface CardInput {
  number: string
  holder_name: string
  exp_month: string
  exp_year: string
  cvv: string
}

export interface CustomerInput {
  email: string
  name: string
  phone?: string
}

export interface ChargeRequest {
  pos_account_id?: string
  amount: number
  currency?: string
  installments?: number
  card: CardInput
  customer: CustomerInput
  description?: string
  use_3d?: boolean
  callback_url?: string
  commission_passthrough?: boolean
}

export interface InstallmentOption {
  count: number
  monthly_amount: number
  total_amount: number
  commission_rate?: number
  gross_amount?: number
  gross_monthly?: number
}

export interface InstallmentQueryResponse {
  bin_number: string
  installments: InstallmentOption[]
}

export interface BinQueryResponse {
  bin_number: string
  card_brand?: string
  card_type?: string
  bank_name?: string
  is_commercial?: boolean
  max_installments?: number
}

export interface ChargeResponse {
  transaction_id: string
  status: string
  redirect_url?: string
  html_content?: string
  gateway_tx_id?: string
  message?: string
}

export const paymentsApi = {
  charge: (data: ChargeRequest) =>
    apiClient.post<ChargeResponse>('/payments/charge', data).then((r) => r.data),

  init3d: (data: ChargeRequest) =>
    apiClient.post<ChargeResponse>('/payments/3d/init', data).then((r) => r.data),

  cancel: (txId: string) =>
    apiClient.post<ChargeResponse>(`/payments/${txId}/cancel`).then((r) => r.data),

  refund: (txId: string, amount?: number) =>
    apiClient.post<ChargeResponse>(`/payments/${txId}/refund`, { amount }).then((r) => r.data),

  getInstallments: (bin: string, amount: number, pos_account_id?: string) =>
    apiClient.get<InstallmentQueryResponse>('/payments/installments', {
      params: { bin_number: bin, amount, pos_account_id },
    }).then((r) => r.data),

  getBin: (bin: string, pos_account_id?: string) =>
    apiClient.get<BinQueryResponse>(`/payments/bin/${bin}`, {
      params: { pos_account_id },
    }).then((r) => r.data),
}
