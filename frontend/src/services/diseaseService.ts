import { Disease, DiseaseRequest, DiseaseResistance, DiseaseResistanceRequest } from '../types/DiseaseTypes'
import { api } from './api'

export const diseaseService = {
  async getAll(): Promise<Disease[]> {
    const response = await api.get<Disease[]>('/diseases')
    return response.data
  },

  async getById(id: number): Promise<Disease> {
    const response = await api.get<Disease>(`/diseases/${id}`)
    return response.data
  },

  async create(data: DiseaseRequest): Promise<Disease> {
    const response = await api.post<Disease>('/diseases', data)
    return response.data
  },

  async update(id: number, data: DiseaseRequest): Promise<Disease> {
    const response = await api.put<Disease>(`/diseases/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/diseases/${id}`)
  },
}

export const diseaseResistanceService = {
  async getAll(): Promise<DiseaseResistance[]> {
    const response = await api.get<DiseaseResistance[]>('/disease-resistances')
    return response.data
  },

  async getById(id: number): Promise<DiseaseResistance> {
    const response = await api.get<DiseaseResistance>(`/disease-resistances/${id}`)
    return response.data
  },

  async create(data: DiseaseResistanceRequest): Promise<DiseaseResistance> {
    const response = await api.post<DiseaseResistance>('/disease-resistances', data)
    return response.data
  },

  async update(id: number, data: DiseaseResistanceRequest): Promise<DiseaseResistance> {
    const response = await api.put<DiseaseResistance>(`/disease-resistances/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/disease-resistances/${id}`)
  },
}
