import axios from 'axios'
import { GATEWAY_URL } from './api'

export type UserRole = 'AGRONOMIST' | 'DIRECTOR' | 'ADMIN'

export interface AuthUser {
  userId: number
  username: string
  email: string
  role: UserRole
  farmId?: number | null
  farmIds?: number[]
  firstName?: string
  lastName?: string
  organization?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  organization?: string
  phone?: string
  role?: UserRole
  farmId?: number
}

const authApi = axios.create({
  baseURL: `${GATEWAY_URL}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
})

const USER_KEY = 'auth_user'

export const authService = {
  async login(data: LoginRequest): Promise<AuthUser> {
    const res = await authApi.post<AuthUser>('/login', data)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.data))
    return res.data
  },

  async register(data: RegisterRequest): Promise<AuthUser> {
    const res = await authApi.post<AuthUser>('/register', data)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.data))
    return res.data
  },

  async logout(): Promise<void> {
    try {
      await authApi.post('/logout')
    } finally {
      sessionStorage.removeItem(USER_KEY)
    }
  },

  getUser(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  },

  isAuthenticated(): boolean {
    return !!this.getUser()
  },
}
