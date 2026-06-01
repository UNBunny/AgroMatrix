import axios from 'axios'

export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:8080'

export const api = axios.create({
  baseURL: `${GATEWAY_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,
})

let isRefreshing = false
let refreshQueue: Array<(ok: boolean) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((ok) => {
          if (ok) resolve(api(originalRequest))
          else reject(error)
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      await axios.post(`${GATEWAY_URL}/api/auth/refresh`, {}, { withCredentials: true })
      refreshQueue.forEach((cb) => cb(true))
      return api(originalRequest)
    } catch {
      refreshQueue.forEach((cb) => cb(false))
      sessionStorage.removeItem('auth_user')
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
      refreshQueue = []
    }
  }
)
