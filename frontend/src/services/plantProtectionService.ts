import { PlantProtectionOperation, PlantProtectionRequest } from '../types/AgronomicTypes'
import { api } from './api'

export const plantProtectionService = {
  async getByCropHistory(cropHistoryId: number): Promise<PlantProtectionOperation[]> {
    const response = await api.get<PlantProtectionOperation[]>('/plant-protection', {
      params: { cropHistoryId },
    })
    return response.data
  },

  async getById(id: number): Promise<PlantProtectionOperation> {
    const response = await api.get<PlantProtectionOperation>(`/plant-protection/${id}`)
    return response.data
  },

  async create(data: PlantProtectionRequest): Promise<PlantProtectionOperation> {
    const response = await api.post<PlantProtectionOperation>('/plant-protection', data)
    return response.data
  },

  async update(id: number, data: PlantProtectionRequest): Promise<PlantProtectionOperation> {
    const response = await api.put<PlantProtectionOperation>(`/plant-protection/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/plant-protection/${id}`)
  },
}
