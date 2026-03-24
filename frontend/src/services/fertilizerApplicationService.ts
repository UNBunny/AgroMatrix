import { FertilizerApplication, FertilizerApplicationRequest } from '../types/AgronomicTypes'
import { api } from './api'

export const fertilizerApplicationService = {
  async getByCropHistory(cropHistoryId: number): Promise<FertilizerApplication[]> {
    const response = await api.get<FertilizerApplication[]>('/fertilizer-applications', {
      params: { cropHistoryId },
    })
    return response.data
  },

  async getById(id: number): Promise<FertilizerApplication> {
    const response = await api.get<FertilizerApplication>(`/fertilizer-applications/${id}`)
    return response.data
  },

  async create(data: FertilizerApplicationRequest): Promise<FertilizerApplication> {
    const response = await api.post<FertilizerApplication>('/fertilizer-applications', data)
    return response.data
  },

  async update(id: number, data: FertilizerApplicationRequest): Promise<FertilizerApplication> {
    const response = await api.put<FertilizerApplication>(`/fertilizer-applications/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/fertilizer-applications/${id}`)
  },
}
