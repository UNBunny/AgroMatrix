import { api } from './api'

/**
 * Client-side export service — CSV and XLSX (via SheetJS if available, else raw CSV).
 * XLSX support requires: npm install xlsx
 * If xlsx is not installed, XLSX export gracefully falls back to CSV.
 */

export interface ExportColumn<T> {
  header: string
  accessor: (row: T) => string | number | null | undefined
}

function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const header = columns.map(c => escape(c.header)).join(',')
  const body = rows.map(row =>
    columns.map(c => escape(c.accessor(row))).join(',')
  ).join('\n')
  return `${header}\n${body}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export async function exportToCsv<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename = 'export.csv'
) {
  const csv = toCsv(rows, columns)
  const bom = '\uFEFF' // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

export async function exportToXlsx<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename = 'export.xlsx',
  sheetName = 'Данные'
) {
  try {
    // Dynamic import — works if xlsx is installed, else falls back to CSV
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = await (import('xlsx' as any) as Promise<any>).catch(() => null)
    if (!XLSX) {
      console.warn('xlsx package not found, falling back to CSV export')
      await exportToCsv(rows, columns, filename.replace('.xlsx', '.csv'))
      return
    }

    const header = columns.map(c => c.header)
    const data = rows.map(row => columns.map(c => c.accessor(row) ?? ''))

    const ws = XLSX.utils.aoa_to_sheet([header, ...data])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    downloadBlob(blob, filename)
  } catch (err) {
    console.error('XLSX export failed, falling back to CSV:', err)
    await exportToCsv(rows, columns, filename.replace('.xlsx', '.csv'))
  }
}

// ── Server-side XLS download ──────────────────────────────────────────────────

/**
 * Download an XLS file generated on the backend.
 * The `path` is relative to the api base, e.g. '/farms/1/sowing-history/export'.
 */
export async function downloadApiXls(path: string, filename: string) {
  const response = await api.get(path, { responseType: 'blob' })
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, filename)
}

// ── Pre-built column sets ─────────────────────────────────────────────────────

import type { FieldReportTimelinePoint } from './reportService'
import type { AuditLogEntry } from './reportService'

export const REPORT_TIMELINE_COLUMNS: ExportColumn<FieldReportTimelinePoint>[] = [
  { header: 'Дата',                   accessor: r => r.date },
  { header: 'Удобрения (кг)',         accessor: r => r.fertilizerKg },
  { header: 'Операции защиты',        accessor: r => r.protectionOps },
  { header: 'Фаза BBCH',             accessor: r => r.bbchScale },
  { header: 'NDVI (среднее)',         accessor: r => r.ndviMean },
]

export const AUDIT_LOG_COLUMNS: ExportColumn<AuditLogEntry>[] = [
  { header: 'Дата',           accessor: r => new Date(r.createdAt).toLocaleString('ru-RU') },
  { header: 'Пользователь',   accessor: r => r.username },
  { header: 'Действие',       accessor: r => r.action },
  { header: 'Тип объекта',    accessor: r => r.entityType },
  { header: 'Поле',           accessor: r => r.fieldName ?? '' },
  { header: 'Изменённое поле', accessor: r => r.changedField ?? '' },
  { header: 'Было',           accessor: r => r.oldValue ?? '' },
  { header: 'Стало',          accessor: r => r.newValue ?? '' },
]
