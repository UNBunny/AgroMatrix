import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Save, CalendarDays, Wheat } from 'lucide-react'
import { cropHistoryService, cropTypeService, cropVarietyService } from '../services/cropService'
import { fieldService } from '../services/fieldService'
import { CropHistory, CropHistoryRequest, CropType, CropVariety, PlantingStatus } from '../types/CropTypes'
import { Field } from '../types/Field'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

const STATUS_CONFIG: Record<PlantingStatus, { label: string; color: string; dotClass: string; badgeClass: string }> = {
  [PlantingStatus.PLANNED]: { label: 'Запланировано', color: 'var(--color-info)', dotClass: 'planned', badgeClass: 'badge-blue' },
  [PlantingStatus.PLANTED]: { label: 'Посажено', color: 'var(--color-primary)', dotClass: 'planted', badgeClass: 'badge-green' },
  [PlantingStatus.GROWING]: { label: 'Растёт', color: 'var(--color-accent)', dotClass: 'growing', badgeClass: 'badge-green' },
  [PlantingStatus.HARVESTED]: { label: 'Собрано', color: 'var(--color-warning)', dotClass: 'harvested', badgeClass: 'badge-yellow' },
}

function fmtDate(ds: string) {
  return new Date(ds).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Группировка по годам
function groupByYear(histories: CropHistory[]) {
  const groups: Record<number, CropHistory[]> = {}
  histories.forEach(h => {
    const year = new Date(h.plantingDate).getFullYear()
    if (!groups[year]) groups[year] = []
    groups[year].push(h)
  })
  return Object.entries(groups).sort(([a], [b]) => Number(b) - Number(a))
}

const emptyForm: CropHistoryRequest = {
  fieldId: 0, cropTypeId: 0, cropVarietyId: undefined,
  plantingDate: '', actualHarvestDate: '', expectedHarvestDate: '',
  seedAmountKgPerHa: 0, seedDepthCm: undefined, plantSpacingCm: undefined,
  actualYieldKg: undefined, expectedYieldKg: undefined,
  plantingStatus: PlantingStatus.PLANNED, notes: '', weatherConditions: ''
}

export default function CropHistoryPage() {
  const [histories, setHistories] = useState<CropHistory[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [cropVarieties, setCropVarieties] = useState<CropVariety[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CropHistoryRequest>(emptyForm)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterField, setFilterField] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [hist, flds, types, vars] = await Promise.all([
        cropHistoryService.getAll(),
        fieldService.getAllFields(),
        cropTypeService.getAll(),
        cropVarietyService.getAll(),
      ])
      setHistories(hist)
      setFields(flds)
      setCropTypes(types)
      setCropVarieties(vars)
    } catch { setError('Ошибка загрузки данных') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingId) await cropHistoryService.update(editingId, formData)
      else await cropHistoryService.create(formData)
      await loadData()
      closeModal()
    } catch { setError('Ошибка сохранения') }
    finally { setLoading(false) }
  }

  const handleEdit = (h: CropHistory) => {
    setEditingId(h.id)
    setFormData({
      fieldId: h.fieldId, cropTypeId: h.cropTypeId, cropVarietyId: h.cropVarietyId,
      plantingDate: h.plantingDate.split('T')[0],
      actualHarvestDate: h.actualHarvestDate ? h.actualHarvestDate.split('T')[0] : '',
      expectedHarvestDate: h.expectedHarvestDate ? h.expectedHarvestDate.split('T')[0] : '',
      seedAmountKgPerHa: h.seedAmountKgPerHa, seedDepthCm: h.seedDepthCm, plantSpacingCm: h.plantSpacingCm,
      actualYieldKg: h.actualYieldKg, expectedYieldKg: h.expectedYieldKg,
      plantingStatus: h.plantingStatus, notes: h.notes || '', weatherConditions: h.weatherConditions || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await cropHistoryService.delete(deleteId)
      await loadData()
    } catch { setError('Ошибка удаления') }
    setDeleteId(null)
  }

  const closeModal = () => {
    setIsModalOpen(false); setEditingId(null); setFormData(emptyForm)
  }

  const filtered = histories.filter(h => {
    const q = search.toLowerCase()
    const matchSearch = !q || h.fieldName.toLowerCase().includes(q) || h.cropTypeName.toLowerCase().includes(q)
    const matchStatus = !filterStatus || h.plantingStatus === filterStatus
    const matchField = !filterField || String(h.fieldId) === filterField
    return matchSearch && matchStatus && matchField
  })

  const grouped = groupByYear(filtered)

  const set = (key: keyof CropHistoryRequest, val: any) => setFormData(d => ({ ...d, [key]: val }))

  return (
    <div>
      <div className="page-header-bar mb-20">
        <div>
          <h1 className="page-title">История посевов</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Записи о посевах и урожаях по годам
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Добавить запись
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Фильтры + переключатель вида */}
      <div className="card card-padding mb-20">
        <div className="filter-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Поиск по полю или культуре..." />
          <select className="form-control" style={{ width: 'auto' }} value={filterField} onChange={e => setFilterField(e.target.value)}>
            <option value="">Все поля</option>
            {fields.map(f => <option key={f.id} value={String(f.id)}>{f.fieldName}</option>)}
          </select>
          <select className="form-control" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Все статусы</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className={`btn${viewMode === 'timeline' ? ' btn-primary' : ' btn-secondary'} btn-sm`} onClick={() => setViewMode('timeline')}>
              <CalendarDays size={13} /> Timeline
            </button>
            <button className={`btn${viewMode === 'table' ? ' btn-primary' : ' btn-secondary'} btn-sm`} onClick={() => setViewMode('table')}>
              🗂️ Таблица
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state"><div className="spinner" style={{ marginBottom: 12 }} /><div className="empty-state-text">Загрузка...</div></div></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon="📅" title="Записей не найдено" text="Добавьте первую запись об истории посевов"
            action={<button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={14} /> Добавить запись</button>} />
        </div>
      ) : viewMode === 'timeline' ? (
        /* ── Timeline вид ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(([year, items]) => (
            <div key={year}>
              {/* Год-разделитель */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--color-primary)', color: 'white', borderRadius: 8, padding: '4px 14px', fontSize: 14, fontWeight: 700 }}>
                  {year}
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{items.length} записей</span>
              </div>

              <div className="crop-timeline">
                {items.sort((a, b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime()).map(h => {
                  const sc = STATUS_CONFIG[h.plantingStatus]
                  return (
                    <div key={h.id} className="crop-timeline-item">
                      <div className={`crop-timeline-dot ${sc.dotClass}`} />
                      <div className="card card-padding" style={{ marginLeft: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>🌾 {h.fieldName}</span>
                              <span className={`badge ${sc.badgeClass}`}>{sc.label}</span>
                              <span className="badge badge-gray"><Wheat size={11} /> {h.cropTypeName}</span>
                              {h.cropVarietyName && <span className="badge badge-blue">{h.cropVarietyName}</span>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '4px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                              <span>📅 Посев: {fmtDate(h.plantingDate)}</span>
                              {h.expectedHarvestDate && <span>📅 Ожид. сбор: {fmtDate(h.expectedHarvestDate)}</span>}
                              {h.actualHarvestDate && <span>✅ Факт. сбор: {fmtDate(h.actualHarvestDate)}</span>}
                              {h.seedAmountKgPerHa > 0 && <span>🌱 Норма: {h.seedAmountKgPerHa} кг/га</span>}
                              {h.expectedYieldKg != null && <span>📊 Ожид. урожай: {h.expectedYieldKg} кг</span>}
                              {h.actualYieldKg != null && <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>🏆 Факт. урожай: {h.actualYieldKg} кг</span>}
                            </div>

                            {h.notes && (
                              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: 6, padding: '6px 10px' }}>
                                💬 {h.notes}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button className="btn-icon" onClick={() => handleEdit(h)}><Edit2 size={14} /></button>
                            <button className="btn-icon danger" onClick={() => setDeleteId(h.id)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Таблица вид ── */
        <div className="card">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Поле</th>
                  <th>Культура / Сорт</th>
                  <th>Дата посева</th>
                  <th>Ожид. урожай</th>
                  <th>Факт. урожай</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a, b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime()).map(h => {
                  const sc = STATUS_CONFIG[h.plantingStatus]
                  return (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 500 }}>{h.fieldName}</td>
                      <td>
                        {h.cropTypeName}
                        {h.cropVarietyName && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{h.cropVarietyName}</div>}
                      </td>
                      <td>{new Date(h.plantingDate).toLocaleDateString('ru-RU')}</td>
                      <td>{h.expectedYieldKg ? `${h.expectedYieldKg} кг` : '—'}</td>
                      <td>{h.actualYieldKg ? <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{h.actualYieldKg} кг</span> : '—'}</td>
                      <td><span className={`badge ${sc.badgeClass}`}>{sc.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => handleEdit(h)}><Edit2 size={14} /></button>
                          <button className="btn-icon danger" onClick={() => setDeleteId(h.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модалка */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? 'Редактировать запись' : 'Добавить запись'}</span>
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
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                    <label className="form-label">Фактическая дата сбора</label>
                    <input type="date" className="form-control" value={formData.actualHarvestDate} onChange={e => set('actualHarvestDate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Норма высева (кг/га) *</label>
                    <input type="number" step="0.1" className="form-control" value={formData.seedAmountKgPerHa} onChange={e => set('seedAmountKgPerHa', Number(e.target.value))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ожидаемый урожай (кг)</label>
                    <input type="number" step="0.1" className="form-control" value={formData.expectedYieldKg || ''} onChange={e => set('expectedYieldKg', e.target.value ? Number(e.target.value) : undefined)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Фактический урожай (кг)</label>
                    <input type="number" step="0.1" className="form-control" value={formData.actualYieldKg || ''} onChange={e => set('actualYieldKg', e.target.value ? Number(e.target.value) : undefined)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Заметки</label>
                  <textarea className="form-control" rows={2} value={formData.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Save size={14} /> Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} title="Удалить запись?" message="Запись о посеве будет удалена безвозвратно."
        confirmLabel="Удалить" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger />
    </div>
  )
}

