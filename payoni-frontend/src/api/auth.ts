import apiClient from './client'
import axios from 'axios'

export interface RegisterData {
  email: string
  password: string
  // Şirket bilgileri
  business_name: string
  company_type: string
  tax_id: string
  tax_office: string
  trade_registry_no: string
  company_address: string
  // Yetkili kişi
  authorized_name: string
  authorized_title: string
  authorized_tc: string
  authorized_phone: string
  phone?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export const authApi = {
  register: (data: RegisterData) =>
    apiClient.post<TokenResponse>('/auth/register', data).then((r) => r.data),

  login: (data: LoginData) =>
    apiClient.post<TokenResponse>('/auth/login', data).then((r) => r.data),

  refresh: () =>
    axios.post<TokenResponse>('/api/v1/auth/refresh', {}, { withCredentials: true }).then((r) => r.data),

  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
}
