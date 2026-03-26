import { api } from './api'

export interface CatalogEntry {
  id: number
  cropCode: string
  diseaseName: string
  pathogenLatin: string | null
  diseaseType: string
  productName: string
  fracGroup: string | null
  fracCode: string | null
  activeIngredients: string
  aiConcentration: string | null
  applicationType: string
  bbchFrom: number | null
  bbchTo: number | null
  bbchNote: string | null
  doseRate: string
  doseValue: number | null
  doseUnit: string | null
  tempMinC: number | null
  tempOptC: number | null
  tempMaxC: number | null
  phiDays: number
  notes: string | null
  isActive: boolean
}

export interface CatalogEntryRequest {
  cropCode: string
  diseaseName: string
  pathogenLatin?: string
  diseaseType: string
  productName: string
  fracGroup?: string
  fracCode?: string
  activeIngredients: string
  aiConcentration?: string
  applicationType: string
  bbchFrom?: number
  bbchTo?: number
  bbchNote?: string
  doseRate: string
  doseValue?: number
  doseUnit?: string
  tempMinC?: number
  tempOptC?: number
  tempMaxC?: number
  phiDays: number
  notes?: string
  isActive: boolean
}

export const catalogEntryService = {
  async getAll(): Promise<CatalogEntry[]> {
    const { data } = await api.get<CatalogEntry[]>('/protection/catalog')
    return data
  },

  async getById(id: number): Promise<CatalogEntry> {
    const { data } = await api.get<CatalogEntry>(`/protection/catalog/${id}`)
    return data
  },

  async create(req: CatalogEntryRequest): Promise<CatalogEntry> {
    const { data } = await api.post<CatalogEntry>('/protection/catalog', req)
    return data
  },

  async update(id: number, req: CatalogEntryRequest): Promise<CatalogEntry> {
    const { data } = await api.put<CatalogEntry>(`/protection/catalog/${id}`, req)
    return data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/protection/catalog/${id}`)
  },
}
