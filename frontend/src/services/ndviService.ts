import { NdviRecord, NdviHistoryResponse, NdviImageResponse, NdviAvailableDatesResponse } from '../types/Field'
import { api } from './api'

export const ndviService = {
  async getCurrentNdvi(fieldId: number): Promise<NdviRecord> {
    const response = await api.get<NdviRecord>(`/ndvi/fields/${fieldId}/current`)
    return response.data
  },

  async getNdviHistory(
    fieldId: number,
    from?: string,
    to?: string,
    fieldName?: string
  ): Promise<NdviHistoryResponse> {
    const params: Record<string, string> = {}
    if (from) params.from = from
    if (to) params.to = to
    if (fieldName) params.fieldName = fieldName
    const response = await api.get<NdviHistoryResponse>(
      `/ndvi/fields/${fieldId}/history`,
      { params }
    )
    return response.data
  },

  async refreshNdvi(
    fieldId: number,
    fieldName: string,
    coordinates: number[][]
  ): Promise<NdviRecord> {
    const body = {
      fieldId,
      fieldName,
      coordinates,
      dateStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      dateEnd: new Date().toISOString().slice(0, 10),
    }
    const response = await api.post<NdviRecord>('/ndvi/refresh', body)
    return response.data
  },

  async fetchSatelliteNdvi(
    fieldId: number,
    fieldName: string,
    coordinates: number[][],
    dateStart?: string,
    dateEnd?: string
  ): Promise<NdviRecord> {
    const body = {
      fieldId,
      fieldName,
      coordinates,
      dateStart: dateStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      dateEnd: dateEnd ?? new Date().toISOString().slice(0, 10),
    }
    const response = await api.post<NdviRecord>('/ndvi/satellite', body)
    return response.data
  },

  async clearCache(fieldId: number): Promise<void> {
    await api.delete(`/ndvi/fields/${fieldId}/cache`)
  },

  async fetchSatelliteHistory(
    fieldId: number,
    dateStart?: string,
    dateEnd?: string,
    coordinates?: number[][],
    fieldName?: string
  ): Promise<NdviHistoryResponse> {
    const body = {
      fieldId,
      fieldName,
      coordinates,
      dateStart: dateStart ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      dateEnd: dateEnd ?? new Date().toISOString().slice(0, 10),
    }
    const response = await api.post<NdviHistoryResponse>('/ndvi/satellite-history', body)
    return response.data
  },

  async fetchNdviImage(
    fieldId: number,
    date: string,
    coordinates?: number[][]
  ): Promise<NdviImageResponse> {
    const body = { fieldId, coordinates, date }
    const response = await api.post<NdviImageResponse>('/ndvi/image', body)
    return response.data
  },

  async fetchAvailableDates(
    fieldId: number,
    from: string,
    to: string,
    coordinates?: number[][]
  ): Promise<NdviAvailableDatesResponse> {
    const body = { fieldId, coordinates, dateStart: from, dateEnd: to }
    const response = await api.post<NdviAvailableDatesResponse>('/ndvi/available-dates', body)
    return response.data
  },
}

export function getNdviColor(ndvi: number | null | undefined): string {
  if (ndvi === null || ndvi === undefined) return '#9E9E9E'
  if (ndvi < 0.1) return '#D32F2F'
  if (ndvi < 0.2) return '#FF7043'
  if (ndvi < 0.35) return '#FFC107'
  if (ndvi < 0.5) return '#8BC34A'
  if (ndvi < 0.65) return '#4CAF50'
  return '#1B5E20'
}

export function getNdviLabel(ndvi: number | null | undefined): string {
  if (ndvi === null || ndvi === undefined) return 'Нет данных'
  if (ndvi < 0.1) return 'Голая земля'
  if (ndvi < 0.2) return 'Слабая растительность'
  if (ndvi < 0.35) return 'Умеренная растительность'
  if (ndvi < 0.5) return 'Хорошая растительность'
  if (ndvi < 0.65) return 'Очень хорошая растительность'
  return 'Максимальная растительность'
}
