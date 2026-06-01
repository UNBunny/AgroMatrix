import { api } from './api'
import axios from 'axios'
import { GATEWAY_URL } from './api'

export interface FarmResponse {
  id: number
  name: string
  description?: string
  inviteCode: string
  ownerId: number
  inn?: string
  kpp?: string
  ogrn?: string
  region?: string
  address?: string
  createdAt: string
}

const authApi = axios.create({
  baseURL: `${GATEWAY_URL}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

export const farmService = {
  async createFarm(name: string, description?: string, inn?: string, kpp?: string, ogrn?: string, region?: string, address?: string): Promise<FarmResponse> {
    const res = await api.post<FarmResponse>('/farms', { name, description, inn, kpp, ogrn, region, address })
    return res.data
  },

  async joinFarm(inviteCode: string): Promise<FarmResponse> {
    const res = await axios.post<FarmResponse>(
      `${GATEWAY_URL}/api/farms/join?inviteCode=${inviteCode}`,
      {},
      { withCredentials: true }
    )
    return res.data
  },

  async getFarm(id: number): Promise<FarmResponse> {
    const res = await api.get<FarmResponse>(`/farms/${id}`)
    return res.data
  },

  async regenerateInvite(farmId: number): Promise<string> {
    const res = await api.post<{ inviteCode: string }>(`/farms/${farmId}/regenerate-invite`)
    return res.data.inviteCode
  },

  async switchFarm(farmId: number): Promise<void> {
    const res = await authApi.post(`/switch-farm/${farmId}`)
    const data = res.data
    const raw = sessionStorage.getItem('auth_user')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        sessionStorage.setItem('auth_user', JSON.stringify({ ...user, farmId: data.farmId, farmIds: data.farmIds }))
      } catch {}
    }
  },

  async assignFarmToUser(farmId: number): Promise<void> {
    await authApi.patch('/farm', { farmId })
    const raw = sessionStorage.getItem('auth_user')
    if (raw) {
      try {
        const user = JSON.parse(raw)
        sessionStorage.setItem('auth_user', JSON.stringify({ ...user, farmId }))
      } catch {}
    }
  },
}
