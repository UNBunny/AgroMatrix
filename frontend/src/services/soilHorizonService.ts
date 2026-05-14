import { SoilHorizon, SoilHorizonRequest } from '../types/AgronomicTypes'
import { api } from './api'

export const soilHorizonService = {
  async getByField(fieldId: number): Promise<SoilHorizon[]> {
    const response = await api.get<SoilHorizon[]>('/soil-horizons', { params: { fieldId } })
    return response.data
  },

  async getById(id: number): Promise<SoilHorizon> {
    const response = await api.get<SoilHorizon>(`/soil-horizons/${id}`)
    return response.data
  },

  async create(data: SoilHorizonRequest): Promise<SoilHorizon> {
    const response = await api.post<SoilHorizon>('/soil-horizons', data)
    return response.data
  },

  async update(id: number, data: SoilHorizonRequest): Promise<SoilHorizon> {
    const response = await api.put<SoilHorizon>(`/soil-horizons/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/soil-horizons/${id}`)
  },
}
