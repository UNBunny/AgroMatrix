import { api } from './api'

export interface SoilData {
  id: number | null
  fieldId: number
  nitrogenN: number | null
  phosphorusP: number | null
  potassiumK: number | null
  phLevel: number | null
  organicMatter: number | null
  soilTexture: string | null
  cec: number | null
  bulkDensity: number | null
  source: 'AUTO' | 'MANUAL' | 'MIXED' | null
  confidence: number | null
  soilgridsVersion: string | null
  lastSyncedAt: string | null
  updatedAt: string | null
  notes: string | null
}

export interface SoilDataRequest {
  nitrogenN?: number | null
  phosphorusP?: number | null
  potassiumK?: number | null
  phLevel?: number | null
  organicMatter?: number | null
  soilTexture?: string | null
  cec?: number | null
  bulkDensity?: number | null
  notes?: string | null
}

export const soilService = {
  async get(fieldId: number): Promise<SoilData> {
    const res = await api.get<SoilData>(`/fields/${fieldId}/soil`)
    return res.data
  },

  async fetchFromSoilGrids(fieldId: number): Promise<SoilData> {
    const res = await api.post<SoilData>(`/fields/${fieldId}/soil/fetch`)
    return res.data
  },

  async update(fieldId: number, data: SoilDataRequest): Promise<SoilData> {
    const res = await api.put<SoilData>(`/fields/${fieldId}/soil`, data)
    return res.data
  },

  async create(fieldId: number, data: SoilDataRequest): Promise<SoilData> {
    const res = await api.post<SoilData>(`/fields/${fieldId}/soil`, data)
    return res.data
  },
}
