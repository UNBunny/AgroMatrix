import { useState, useEffect, useCallback } from 'react'
import { fieldService } from '../services/fieldService'
import { ndviService } from '../services/ndviService'
import { Field } from '../types/Field'

interface UseFieldsOptions {
  /** Загружать ли NDVI для каждого поля (по умолчанию true) */
  withNdvi?: boolean
}

interface UseFieldsResult {
  fields: Field[]
  ndviMap: Record<number, number | null>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Хук для загрузки списка полей + опционально NDVI для каждого.
 * Используется на MapPage, DashboardPage, FieldsManagementPage, NdviMonitoringPage.
 */
export function useFields(options: UseFieldsOptions = {}): UseFieldsResult {
  const { withNdvi = true } = options

  const [fields, setFields] = useState<Field[]>([])
  const [ndviMap, setNdviMap] = useState<Record<number, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFields = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fieldService.getAllFields()
      setFields(data)

      if (withNdvi && data.length > 0) {
        // Параллельная загрузка NDVI для всех полей
        const entries: Record<number, number | null> = {}
        await Promise.allSettled(
          data.map(async (f) => {
            try {
              const rec = await ndviService.getCurrentNdvi(f.id)
              entries[f.id] = rec.mean
            } catch {
              entries[f.id] = null
            }
          })
        )
        setNdviMap(entries)
      }
    } catch {
      setError('Ошибка при загрузке полей')
    } finally {
      setLoading(false)
    }
  }, [withNdvi])

  useEffect(() => {
    loadFields()
  }, [loadFields])

  return { fields, ndviMap, loading, error, refetch: loadFields }
}
