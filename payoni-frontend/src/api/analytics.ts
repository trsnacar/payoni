import apiClient from './client'

export interface AnalyticsSummary {
  total_revenue: string
  total_transactions: number
  successful_transactions: number
  failed_transactions: number
  success_rate: number
  avg_transaction_amount: string
  refunded_amount: string
  period_days: number
}

export interface RevenueDataPoint {
  date: string
  revenue: string
  transaction_count: number
}

export interface ProviderStats {
  provider_slug: string
  total_transactions: number
  successful_transactions: number
  total_revenue: string
  success_rate: number
}

export interface SuccessRateDataPoint {
  date: string
  success_rate: number
  total: number
  successful: number
}

export interface SuccessRateResponse {
  overall_rate: number
  daily: SuccessRateDataPoint[]
}

export const analyticsApi = {
  getSummary: (period_days = 30) =>
    apiClient.get<AnalyticsSummary>('/analytics/summary', { params: { period_days } }).then((r) => r.data),

  getRevenue: (period_days = 30) =>
    apiClient.get<RevenueDataPoint[]>('/analytics/revenue', { params: { period_days } }).then((r) => r.data),

  getProviders: (period_days = 30) =>
    apiClient.get<ProviderStats[]>('/analytics/providers', { params: { period_days } }).then((r) => r.data),

  getSuccessRate: (period_days = 30) =>
    apiClient.get<SuccessRateResponse>('/analytics/success-rate', { params: { period_days } }).then((r) => r.data),
}
