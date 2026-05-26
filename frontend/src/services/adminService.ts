import { api } from './api'

export interface AdminUser {
  id: number
  username: string
  email: string
  role: 'AGRONOMIST' | 'DIRECTOR' | 'ADMIN'
  firstName: string
  lastName: string
  organization?: string
  phone?: string
  activeFarmId?: number
  farmIds: number[]
  isActive: boolean
  createdAt: string
}

export interface AdminFarm {
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

export interface CreateUserRequest {
  firstName: string
  lastName: string
  email: string
  username: string
  password: string
  role: 'AGRONOMIST' | 'DIRECTOR' | 'ADMIN'
  farmIds: number[]
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  role?: 'AGRONOMIST' | 'DIRECTOR' | 'ADMIN'
  farmIds?: number[]
}

export const adminService = {
  getUsers: () => api.get<AdminUser[]>('/api/admin/users').then(r => r.data),
  createUser: (data: CreateUserRequest) => api.post<AdminUser>('/api/admin/users', data).then(r => r.data),
  updateUser: (id: number, data: UpdateUserRequest) => api.put<AdminUser>(`/api/admin/users/${id}`, data).then(r => r.data),
  deleteUser: (id: number) => api.delete(`/api/admin/users/${id}`),
  changeRole: (id: number, role: string) => api.patch<AdminUser>(`/api/admin/users/${id}/role`, { role }).then(r => r.data),
  toggleActive: (id: number) => api.patch<AdminUser>(`/api/admin/users/${id}/toggle-active`).then(r => r.data),
  assignFarms: (id: number, farmIds: number[]) => api.put<AdminUser>(`/api/admin/users/${id}/farms`, { farmIds }).then(r => r.data),
  getFarms: () => api.get<AdminFarm[]>('/api/admin/farms').then(r => r.data),
  deleteFarm: (id: number) => api.delete(`/api/admin/farms/${id}`),
}
