import apiClient from './client'
import axios from 'axios'

export interface RegisterData {
  email: string
  password: string
  business_name: string
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
