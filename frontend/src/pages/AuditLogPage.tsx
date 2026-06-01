import { useState, useEffect, useCallback } from 'react'
import { History, Filter, Loader2, AlertTriangle, FileText, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react'
import { reportService, AuditLogEntry, AuditLogParams } from '../services/reportService'
import { exportToCsv, exportToXlsx, AUDIT_LOG_COLUMNS } from '../services/exportService'
import { fieldService } from '../services/fieldService'
import { Field } from '../types/Field'
import { useAuth } from '../context/AuthContext'

const today = () => new Date().toISOString().split('T')[0]
const monthsAgo = (n: number) => {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().split('T')[0]
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'var(--color-success)',
  UPDATE: 'var(--color-info)',
  DELETE: 'var(--color-danger)',
  SUBMIT: 'var(--color-warning)',
  APPROVE: 'var(--color-success)',
  REJECT: 'var(--color-danger)',
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? 'var(--color-text-muted)'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, background: color + '22', color,
    }}>
      {action}
    </span>
  )
}

function DiffCell({ oldVal, newVal }: { oldVal: string | null; newVal: string | null }) {
  if (!oldVal && !newVal) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>
  return (
    <span style={{ fontSize: 12 }}>
      {oldVal && (
        <span style={{
          background: 'var(--color-danger-light)', color: 'var(--color-danger)',
          padding: '1px 5px', borderRadius: 4, textDecoration: 'line-through', marginRight: 4,
        }}>
          {oldVal}
        </span>
      )}
      {newVal && (
        <span style={{
          background: 'var(--color-success-light)', color: 'var(--color-success)',
          padding: '1px 5px', borderRadius: 4,
        }}>
          {newVal}
        </span>
      )}
    </span>
  )
}

export default function AuditLogPage() {
  const { user } = useAuth()
  const canExport = user?.role === 'DIRECTOR' || user?.role === 'ADMIN'

  const [entries, setEntries]       = useState<AuditLogEntry[]>([])
  const [fields, setFields]         = useState<Field[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const [dateFrom, setDateFrom]         = useState(monthsAgo(1))
  const [dateTo, setDateTo]             = useState(today())
  const [filterUser, setFilterUser]     = useState('')
  const [filterField, setFilterField]   = useState<number | ''>('')
  const [filterEntity, setFilterEntity] = useState('')
  const [page, setPage]                 = useState(0)
  const PAGE_SIZE = 20

  const loadAudit = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params: AuditLogParams = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        fieldId: filterField ? Number(filterField) : undefined,
        entityType: filterEntity || undefined,
        page,
        size: PAGE_SIZE,
      }
      const result = await reportService.getAuditLog(params)
      setEntries(result.content)
      setTotalPages(result.totalPages)
      setTotalElements(result.totalElements)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки аудита')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, filterField, filterEntity, page])

  useEffect(() => {
    loadAudit()
  }, [loadAudit])

  useEffect(() => {
    fieldService.getAllFields().then(setFields).catch(console.error)
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    loadAudit()
  }

  function handleExportCsv() {
    exportToCsv(entries, AUDIT_LOG_COLUMNS, `audit_log_${dateFrom}_${dateTo}.csv`)
  }

  function handleExportXlsx() {
    exportToXlsx(entries, AUDIT_LOG_COLUMNS, `audit_log_${dateFrom}_${dateTo}.xlsx`, 'Журнал изменений')
  }

  const filteredEntries = filterUser
    ? entries.filter(e => e.username.toLowerCase().includes(filterUser.toLowerCase()))
    : entries

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div className="audit-header-left">
          <History size={22} color="var(--color-primary)" />
          <div>
            <h1 className="page-title">Журнал изменений</h1>
            {totalElements > 0 && (
              <div className="page-subtitle">
                Всего записей: {totalElements}
              </div>
            )}
          </div>
        </div>
        {canExport && entries.length > 0 && (
          <div className="audit-export-btns">
            <button className="btn btn-secondary" onClick={handleExportCsv}>
              <FileText size={15} /> CSV
            </button>
            <button className="btn btn-secondary" onClick={handleExportXlsx}>
              <FileSpreadsheet size={15} /> Excel
            </button>
          </div>
        )}
      </div>

      <div className="card card-padding mb-20">
        <form onSubmit={handleSearch}>
          <div className="audit-filters">
            <div className="form-group">
              <label className="form-label">
                <Filter size={12} style={{ marginRight: 4 }} />Дата с
              </label>
              <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Дата по</label>
              <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Пользователь</label>
              <input
                className="form-control"
                placeholder="Имя пользователя"
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Поле</label>
              <select className="form-control" value={filterField} onChange={e => setFilterField(Number(e.target.value) || '')}>
                <option value="">— Все поля —</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Тип объекта</label>
              <select className="form-control" value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
                <option value="">— Все —</option>
                <option value="FIELD">Поле</option>
                <option value="PLAN">План</option>
                <option value="CROP_HISTORY">История посева</option>
                <option value="FERTILIZER">Удобрение</option>
                <option value="PROTECTION">Защита</option>
              </select>
            </div>
            <div className="form-group">
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Применить
              </button>
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert-warning mb-12">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
            <Loader2 size={28} className="spin" style={{ margin: '0 auto' }} />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '60px 20px' }}>
            <History size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div>Записей не найдено</div>
          </div>
        ) : (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  {['Дата', 'Пользователь', 'Действие', 'Тип', 'Поле', 'Атрибут', 'Было → Стало'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {new Date(entry.createdAt).toLocaleString('ru-RU', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontWeight: 500 }}>{entry.username}</td>
                    <td><ActionBadge action={entry.action} /></td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{entry.entityType}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{entry.fieldName ?? '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{entry.changedField ?? '—'}</td>
                    <td><DiffCell oldVal={entry.oldValue} newVal={entry.newValue} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="audit-pagination">
            <button
              className="btn btn-ghost"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="audit-pagination-info">
              Страница {page + 1} из {totalPages}
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
