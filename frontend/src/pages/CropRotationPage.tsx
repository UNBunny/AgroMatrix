import { useState, useEffect, useMemo } from 'react'
import { Plus, RefreshCw, X, Save } from 'lucide-react'
import { cropHistoryService, cropTypeService, cropVarietyService } from '../services/cropService'
import { fieldService } from '../services/fieldService'
import { CropHistory, CropHistoryRequest, CropType, CropVariety, PlantingStatus } from '../types/CropTypes'
import { Field } from '../types/Field'
import '../styles/crop-rotation.css'

const emptyForm: CropHistoryRequest = {
  fieldId: 0, cropTypeId: 0, cropVarietyId: undefined,
  plantingDate: '', actualHarvestDate: '', expectedHarvestDate: '',
  seedAmountKgPerHa: 0, seedDepthCm: undefined, plantSpacingCm: undefined,
  actualYieldKg: undefined, expectedYieldKg: undefined,
  plantingStatus: PlantingStatus.PLANNED, notes: '', weatherConditions: ''
}

const STATUS_LABELS: Record<PlantingStatus, string> = {
  [PlantingStatus.PLANNED]: 'Запланировано',
  [PlantingStatus.PLANTED]: 'Посажено',
  [PlantingStatus.GROWING]: 'Растёт',
  [PlantingStatus.HARVESTED]: 'Собрано',
}

// ─── Утилиты ────────────────────────────────────────

function getYear(dateStr: string): number {
  return new Date(dateStr).getFullYear()
}

function statusClass(status: PlantingStatus): string {
  switch (status) {
    case PlantingStatus.PLANNED: return 'crop-planned'
    case PlantingStatus.PLANTED: return 'crop-planted'
    case PlantingStatus.GROWING: return 'crop-growing'
    case PlantingStatus.HARVESTED: return 'crop-harvested'
    default: return ''
  }
}

function statusEmoji(status: PlantingStatus): string {
  switch (status) {
    case PlantingStatus.PLANNED: return '📋'
    case PlantingStatus.PLANTED: return '🌱'
    case PlantingStatus.GROWING: return '🌿'
    case PlantingStatus.HARVESTED: return '🌾'
    default: return ''
  }
}

// Цвета культур (циклический массив)
const CROP_COLORS = [
  '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
]

function getCropColor(cropTypeId: number): string {
  return CROP_COLORS[cropTypeId % CROP_COLORS.length]
}

// ─── Главный компонент ──────────────────────────────

export default function CropRotationPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [histories, setHistories] = useState<CropHistory[]>([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [cropVarieties, setCropVarieties] = useState<CropVariety[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<CropHistoryRequest>(emptyForm)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true); setError(null)
      const [flds, hist, types, vars] = await Promise.all([
        fieldService.getAllFields(),
        cropHistoryService.getAll(),
        cropTypeService.getAll(),
        cropVarietyService.getAll(),
      ])
      setFields(flds)
      setHistories(hist)
      setCropTypes(types)
      setCropVarieties(vars)
    } catch {
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  // ── Вычисляемые данные ──

  // Все уникальные сезоны (годы), отсортированные
  const seasons = useMemo(() => {
    const years = new Set<number>()
    histories.forEach(h => years.add(getYear(h.plantingDate)))
    // Добавляем текущий год если нет
    const currentYear = new Date().getFullYear()
    years.add(currentYear)
    return Array.from(years).sort((a, b) => a - b)
  }, [histories])

  // Матрица: fieldId → year → CropHistory[]
  const rotationMap = useMemo(() => {
    const map: Record<number, Record<number, CropHistory[]>> = {}
    histories.forEach(h => {
      const year = getYear(h.plantingDate)
      if (!map[h.fieldId]) map[h.fieldId] = {}
      if (!map[h.fieldId][year]) map[h.fieldId][year] = []
      map[h.fieldId][year].push(h)
    })
    return map
  }, [histories])

  // Статистика по сезонам
  const seasonStats = useMemo(() => {
    const stats: Record<number, { totalArea: number; fieldsUsed: number }> = {}
    seasons.forEach(year => {
      let totalArea = 0
      let fieldsUsed = 0
      fields.forEach(f => {
        if (rotationMap[f.id]?.[year]?.length) {
          totalArea += f.areaHectares
          fieldsUsed++
        }
      })
      stats[year] = { totalArea: Math.round(totalArea * 10) / 10, fieldsUsed }
    })
    return stats
  }, [seasons, fields, rotationMap])

  const totalArea = useMemo(() =>
    Math.round(fields.reduce((s, f) => s + f.areaHectares, 0) * 10) / 10
  , [fields])

  const set = (key: keyof CropHistoryRequest, val: unknown) =>
    setFormData(d => ({ ...d, [key]: val }))

  const openModal = () => { setFormData(emptyForm); setIsModalOpen(true) }
  const closeModal = () => setIsModalOpen(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await cropHistoryService.create(formData)
      await loadData()
      closeModal()
    } catch { setError('Ошибка сохранения') }
    finally { setSaving(false) }
  }

  return (
    <div className="rotation-page">
      {/* ── Заголовок ── */}
      <div className="page-header-bar mb-20">
        <div>
          <h1 className="page-title">Севооборот</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Распределение культур по полям и сезонам
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Обновить
          </button>
          <button className="btn btn-primary" onClick={openModal}>
            <Plus size={16} /> Добавить запись
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Сводка по сезонам ── */}
      {!loading && seasons.length > 0 && (
        <div className="rotation-summary">
          {seasons.map(year => {
            const stat = seasonStats[year]
            const pct = totalArea > 0 ? (stat.totalArea / totalArea) * 100 : 0
            return (
              <div key={year} className="rotation-summary-chip">
                <strong>Сезон {year}</strong>
                <span>{stat.totalArea} из {totalArea} га</span>
                <div className="chip-bar" style={{ width: `${Math.max(10, pct)}px` }} />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Таблица севооборота ── */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Загрузка данных...
        </div>
      ) : fields.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🌾</div>
            <div className="empty-state-title">Нет полей</div>
            <div className="empty-state-text">Создайте поля на странице «Поля», чтобы увидеть севооборот</div>
          </div>
        </div>
      ) : (
        <div className="rotation-table-wrap">
          <table className="rotation-table">
            <thead>
              <tr>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Название</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>Площадь</span>
                  </div>
                </th>
                {seasons.map(year => {
                  const stat = seasonStats[year]
                  const pct = totalArea > 0 ? (stat.totalArea / totalArea) * 100 : 0
                  return (
                    <th key={year}>
                      <div className="rotation-season-header">
                        <div className="rotation-season-title">Сезон {year}</div>
                        <div className="rotation-season-dates">
                          1 янв – 31 дек {year}
                        </div>
                        <div className="rotation-season-bar">
                          <div className="rotation-season-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="rotation-season-dates">
                          {stat.totalArea} га из {totalArea} га
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {fields.map(field => (
                <tr key={field.id}>
                  {/* Поле */}
                  <td>
                    <div className="rotation-field-cell">
                      <div
                        className="rotation-field-thumb"
                        style={{ background: `linear-gradient(135deg, #e8f5e9, #c8e6c9)` }}
                      >
                        🗺️
                      </div>
                      <div className="rotation-field-info">
                        <div className="rotation-field-name">{field.fieldName}</div>
                        <div className="rotation-field-area">{field.areaHectares} га</div>
                      </div>
                    </div>
                  </td>

                  {/* Сезоны */}
                  {seasons.map(year => {
                    const entries = rotationMap[field.id]?.[year] || []
                    return (
                      <td key={year} className="rotation-crop-cell">
                        {entries.length > 0 ? (
                          entries.map((entry, idx) => (
                            <div
                              key={idx}
                              className={`rotation-crop-badge ${statusClass(entry.plantingStatus)}`}
                              style={{ marginBottom: idx < entries.length - 1 ? 4 : 0 }}
                              title={`${entry.cropTypeName}${entry.cropVarietyName ? ` (${entry.cropVarietyName})` : ''} — ${statusLabel(entry.plantingStatus)}`}
                            >
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: getCropColor(entry.cropTypeId),
                                flexShrink: 0,
                              }} />
                              <span className="rotation-crop-name">
                                {entry.cropTypeName}
                              </span>
                              <span style={{ fontSize: 11, opacity: 0.7 }}>
                                {statusEmoji(entry.plantingStatus)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div
                            className="rotation-empty-cell"
                            onClick={() => { setFormData({ ...emptyForm, fieldId: field.id }); setIsModalOpen(true) }}
                            title="Добавить культуру"
                          >
                            +
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Итого: {fields.length} полей · {totalArea} га</td>
                {seasons.map(year => {
                  const stat = seasonStats[year]
                  return (
                    <td key={year}>
                      {stat.fieldsUsed} из {fields.length} полей · {stat.totalArea} га
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Легенда статусов ── */}
      {!loading && histories.length > 0 && (
        <div className="card card-padding" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>📋 Статусы</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
            <span>📋 Запланировано</span>
            <span>🌱 Посажено</span>
            <span>🌿 Растёт</span>
            <span>🌾 Собрано</span>
          </div>
        </div>
      )}

      {/* ── Модалка добавления записи ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Добавить запись севооборота</span>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Поле *</label>
                    <select className="form-control" value={formData.fieldId} onChange={e => set('fieldId', Number(e.target.value))} required>
                      <option value={0}>Выберите поле</option>
                      {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Культура *</label>
                    <select className="form-control" value={formData.cropTypeId} onChange={e => set('cropTypeId', Number(e.target.value))} required>
                      <option value={0}>Выберите культуру</option>
                      {cropTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Сорт</label>
                    <select className="form-control" value={formData.cropVarietyId || ''} onChange={e => set('cropVarietyId', e.target.value ? Number(e.target.value) : undefined)}>
                      <option value="">— Не выбрано —</option>
                      {cropVarieties.filter(v => v.cropType?.id === formData.cropTypeId).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Статус *</label>
                    <select className="form-control" value={formData.plantingStatus} onChange={e => set('plantingStatus', e.target.value as PlantingStatus)} required>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Дата посадки *</label>
                    <input type="date" className="form-control" value={formData.plantingDate} onChange={e => set('plantingDate', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ожидаемая дата сбора</label>
                    <input type="date" className="form-control" value={formData.expectedHarvestDate} onChange={e => set('expectedHarvestDate', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Норма высева (кг/га) *</label>
                    <input type="number" step="0.1" min="0" className="form-control" value={formData.seedAmountKgPerHa} onChange={e => set('seedAmountKgPerHa', Number(e.target.value))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ожидаемый урожай (кг)</label>
                    <input type="number" step="0.1" className="form-control" value={formData.expectedYieldKg || ''} onChange={e => set('expectedYieldKg', e.target.value ? Number(e.target.value) : undefined)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Заметки</label>
                  <textarea className="form-control" rows={2} value={formData.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={14} /> Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function statusLabel(status: PlantingStatus): string {
  switch (status) {
    case PlantingStatus.PLANNED: return 'Запланировано'
    case PlantingStatus.PLANTED: return 'Посажено'
    case PlantingStatus.GROWING: return 'Растёт'
    case PlantingStatus.HARVESTED: return 'Собрано'
    default: return status
  }
}

