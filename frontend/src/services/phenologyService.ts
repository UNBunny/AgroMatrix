import { PhenologicalObservation, PhenologicalObservationRequest } from '../types/AgronomicTypes'
import { api } from './api'

export const phenologyService = {
  async getByCropHistory(cropHistoryId: number): Promise<PhenologicalObservation[]> {
    const response = await api.get<PhenologicalObservation[]>('/phenological-observations', {
      params: { cropHistoryId },
    })
    return response.data
  },

  async getById(id: number): Promise<PhenologicalObservation> {
    const response = await api.get<PhenologicalObservation>(`/phenological-observations/${id}`)
    return response.data
  },

  async create(data: PhenologicalObservationRequest): Promise<PhenologicalObservation> {
    const response = await api.post<PhenologicalObservation>('/phenological-observations', data)
    return response.data
  },

  async update(id: number, data: PhenologicalObservationRequest): Promise<PhenologicalObservation> {
    const response = await api.put<PhenologicalObservation>(`/phenological-observations/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/phenological-observations/${id}`)
  },
}
