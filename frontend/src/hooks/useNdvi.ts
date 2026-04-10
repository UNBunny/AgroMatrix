import { useState, useCallback } from 'react'
import { ndviService } from '../services/ndviService'
import { NdviRecord, NdviImageResponse } from '../types/Field'

function todayStr() { return new Date().toISOString().split('T')[0] }
function monthsAgoStr(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().split('T')[0]
}

interface UseNdviResult {
  history: NdviRecord[]
  selectedRecord: NdviRecord | null
  ndviImage: NdviImageResponse | null
  availableDates: string[]
  loading: boolean
  loadingImage: boolean
  loadingSatellite: boolean
  error: string | null
  /** Загрузить историю NDVI из БД */
  loadHistory: (fieldId: number, dateFrom: string, dateTo: string, coordinates?: number[][]) => Promise<void>
  /** Загрузить карту NDVI для конкретной даты */
  loadImageForDate: (fieldId: number, date: string, coordinates?: number[][]) => Promise<void>
  /** Загрузить реальные спутниковые данные через GEE */
  loadSatelliteHistory: (fieldId: number, dateFrom: string, dateTo: string, coordinates?: number[][], fieldName?: string) => Promise<void>
  /** Установить выбранную запись */
  setSelectedRecord: (record: NdviRecord | null) => void
  /** Сбросить NDVI-изображение */
  clearImage: () => void
}

/**
 * Хук для работы с NDVI данными для конкретного поля.
 * Извлечён из NdviMonitoringPage — инкапсулирует вызовы ndviService.
 */
export function useNdvi(): UseNdviResult {
  const [history, setHistory] = useState<NdviRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<NdviRecord | null>(null)
  const [ndviImage, setNdviImage] = useState<NdviImageResponse | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingImage, setLoadingImage] = useState(false)
  const [loadingSatellite, setLoadingSatellite] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async (fieldId: number, dateFrom: string, dateTo: string, coordinates?: number[][]) => {
    setLoading(true)
    setError(null)
    try {
      const res = await ndviService.getNdviHistory(fieldId, dateFrom, dateTo)
      setHistory(res.history)
      if (res.current) setSelectedRecord(res.current)
      else if (res.history.length > 0) setSelectedRecord(res.history[res.history.length - 1])

      // Загрузка доступных дат
      const datesRes = await ndviService.fetchAvailableDates(fieldId, monthsAgoStr(6), todayStr(), coordinates)
      if (datesRes.dates?.length) {
        setAvailableDates(datesRes.dates)
      }
    } catch {
      setError('Ошибка загрузки данных NDVI')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadImageForDate = useCallback(async (fieldId: number, date: string, coordinates?: number[][]) => {
    setLoadingImage(true)
    setError(null)
    setNdviImage(null)
    try {
      const res = await ndviService.fetchNdviImage(fieldId, date, coordinates)
      if (res.error) setError(`GEE: ${res.error}`)
      else if (!res.imageUrl) setError('Нет чистых снимков за эту дату')
      else setNdviImage(res)
    } catch {
      setError('Ошибка загрузки карты NDVI')
    } finally {
      setLoadingImage(false)
    }
  }, [])

  const loadSatelliteHistory = useCallback(async (fieldId: number, dateFrom: string, dateTo: string, coordinates?: number[][], fieldName?: string) => {
    setLoadingSatellite(true)
    setError(null)
    try {
      const res = await ndviService.fetchSatelliteHistory(fieldId, dateFrom, dateTo, coordinates, fieldName)
      setHistory(res.history)
      if (res.current) setSelectedRecord(res.current)
      else if (res.history.length > 0) setSelectedRecord(res.history[res.history.length - 1])
    } catch {
      setError('Ошибка загрузки спутниковых данных. Убедитесь, что ml-service запущен.')
    } finally {
      setLoadingSatellite(false)
    }
  }, [])

  const clearImage = useCallback(() => {
    setNdviImage(null)
  }, [])

  return {
    history,
    selectedRecord,
    ndviImage,
    availableDates,
    loading,
    loadingImage,
    loadingSatellite,
    error,
    loadHistory,
    loadImageForDate,
    loadSatelliteHistory,
    setSelectedRecord,
    clearImage,
  }
}

