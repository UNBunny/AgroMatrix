import { CropType, CropTypeRequest, CropVariety, CropVarietyRequest, CropHistory, CropHistoryRequest } from '../types/CropTypes'
import { api } from './api'

export const cropTypeService = {
  async getAll(): Promise<CropType[]> {
    const response = await api.get<CropType[]>('/crop-type')
    return response.data
  },

  async getById(id: number): Promise<CropType> {
    const response = await api.get<CropType>(`/crop-type/${id}`)
    return response.data
  },

  async create(data: CropTypeRequest): Promise<CropType> {
    const response = await api.post<CropType>('/crop-type', data)
    return response.data
  },

  async update(id: number, data: CropTypeRequest): Promise<CropType> {
    const response = await api.put<CropType>(`/crop-type/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/crop-type/${id}`)
  },
}

export const cropVarietyService = {
  async getAll(): Promise<CropVariety[]> {
    const response = await api.get<CropVariety[]>('/crop-variety')
    return response.data
  },

  async getById(id: number): Promise<CropVariety> {
    const response = await api.get<CropVariety>(`/crop-variety/${id}`)
    return response.data
  },

  async create(data: CropVarietyRequest): Promise<CropVariety> {
    const response = await api.post<CropVariety>('/crop-variety', data)
    return response.data
  },

  async update(id: number, data: CropVarietyRequest): Promise<CropVariety> {
    const response = await api.put<CropVariety>(`/crop-variety/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/crop-variety/${id}`)
  },
}

export const cropHistoryService = {
  async getAll(): Promise<CropHistory[]> {
    const response = await api.get<CropHistory[]>('/crop-histories')
    return response.data
  },

  async getById(id: number): Promise<CropHistory> {
    const response = await api.get<CropHistory>(`/crop-histories/${id}`)
    return response.data
  },

  async create(data: CropHistoryRequest): Promise<CropHistory> {
    const response = await api.post<CropHistory>('/crop-histories', data)
    return response.data
  },

  async update(id: number, data: CropHistoryRequest): Promise<CropHistory> {
    const response = await api.put<CropHistory>(`/crop-histories/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/crop-histories/${id}`)
  },
}
