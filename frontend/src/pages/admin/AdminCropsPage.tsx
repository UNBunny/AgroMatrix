import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Edit2, Trash2, X, Save, Sprout, Leaf, Search, AlertCircle } from 'lucide-react'
import { cropTypeService, cropVarietyService } from '../../services/cropService'
import {
  CropType, CropTypeRequest, CropVariety, CropVarietyRequest, ToleranceLevel
} from '../../types/CropTypes'

type Tab = 'types' | 'varieties'

const TOLERANCE_LABELS: Record<ToleranceLevel, string> = {
  [ToleranceLevel.LOW]: 'Низкая',
  [ToleranceLevel.MEDIUM]: 'Средняя',
  [ToleranceLevel.HIGH]: 'Высокая',
  [ToleranceLevel.VERY_HIGH]: 'Очень высокая',
}

const emptyTypeForm = (): CropTypeRequest => ({
  name: '', category: '', growingSeasonDays: undefined,
  optimalTemperatureMin: undefined, optimalTemperatureMax: undefined,
  waterRequirementsMm: undefined, notes: '', mlCropCode: '',
})

const emptyVarietyForm = (): CropVarietyRequest => ({
  name: '', cropTypeId: 0, seedProducer: '', maturationDays: undefined,
  diseaseResistanceId: [], droughtTolerance: undefined, frostTolerance: undefined,
  recommendedSeedingRateKgPerHa: undefined, seedCostPerKg: undefined, isHybrid: false, notes: '',
})

// ── Crop Types Tab ─────────────────────────────────────────────────────────────

function CropTypesTab() {
  const [items, setItems] = useState<CropType[]>([])
  const [filtered, setFiltered] = useState<CropType[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<CropTypeRequest>(emptyTypeForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)) : items)
  }, [search, items])

  const load = async () => {
    try { setLoading(true); setItems(await cropTypeService.getAll()); setError(null) }
    catch { setError('Ошибка загрузки культур') }
    finally { setLoading(false) }
  }

  const openCreate = () => { setEditId(null); setForm(emptyTypeForm()); setModal(true) }
  const openEdit = (item: CropType) => {
    setEditId(item.id)
    setForm({
      name: item.name, category: item.category,
      growingSeasonDays: item.growingSeasonDays, optimalTemperatureMin: item.optimalTemperatureMin,
      optimalTemperatureMax: item.optimalTemperatureMax, waterRequirementsMm: item.waterRequirementsMm,
      notes: item.notes || '', mlCropCode: item.mlCropCode || '',
    })
    setModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editId) await cropTypeService.update(editId, form)
      else await cropTypeService.create(form)
      setModal(false)
      await load()
    } catch { setError('Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить культуру «${name}»?`)) return
    try { await cropTypeService.delete(id); await load() }
    catch { setError('Ошибка удаления') }
  }

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-toolbar">
        <div className="admin-search-wrap">
          <Search size={15} className="admin-search-icon" />
          <input
            className="admin-search-input"
            placeholder="Поиск по названию или категории..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="admin-btn-primary" onClick={openCreate}>
          <Plus size={16} /> Добавить культуру
        </button>
      </div>

      {error && (
        <div className="admin-alert error">
          <AlertCircle size={15} /> {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Загрузка...</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Сезон (дн.)</th>
                <th>Темп. (°C)</th>
                <th>ML-код</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="admin-table-empty">Ничего не найдено</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id}>
                  <td className="admin-td-muted">{item.id}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td>{item.growingSeasonDays ?? '—'}</td>
                  <td>
                    {item.optimalTemperatureMin !== undefined && item.optimalTemperatureMax !== undefined
                      ? `${item.optimalTemperatureMin}–${item.optimalTemperatureMax}`
                      : '—'}
                  </td>
                  <td><code className="admin-code">{item.mlCropCode || '—'}</code></td>
                  <td className="admin-td-actions">
                    <button className="admin-icon-btn edit" onClick={() => openEdit(item)} title="Редактировать">
                      <Edit2 size={14} />
                    </button>
                    <button className="admin-icon-btn delete" onClick={() => handleDelete(item.id, item.name)} title="Удалить">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editId ? 'Редактировать культуру' : 'Новая культура'}</h3>
              <button className="admin-modal-close" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form className="admin-modal-form" onSubmit={handleSave}>
              <div className="admin-form-row">
                <label>Название *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Пшеница" />
              </div>
              <div className="admin-form-row">
                <label>Категория *</label>
                <input required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Зерновые" />
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Сезон (дней)</label>
                  <input type="number" value={form.growingSeasonDays ?? ''} onChange={e => setForm({ ...form, growingSeasonDays: e.target.value ? +e.target.value : undefined })} />
                </div>
                <div className="admin-form-row">
                  <label>ML-код</label>
                  <input value={form.mlCropCode ?? ''} onChange={e => setForm({ ...form, mlCropCode: e.target.value })} placeholder="wheat" />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Темп. мин (°C)</label>
                  <input type="number" value={form.optimalTemperatureMin ?? ''} onChange={e => setForm({ ...form, optimalTemperatureMin: e.target.value ? +e.target.value : undefined })} />
                </div>
                <div className="admin-form-row">
                  <label>Темп. макс (°C)</label>
                  <input type="number" value={form.optimalTemperatureMax ?? ''} onChange={e => setForm({ ...form, optimalTemperatureMax: e.target.value ? +e.target.value : undefined })} />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Потребность в воде (мм)</label>
                  <input type="number" value={form.waterRequirementsMm ?? ''} onChange={e => setForm({ ...form, waterRequirementsMm: e.target.value ? +e.target.value : undefined })} />
                </div>
              </div>
              <div className="admin-form-row">
                <label>Примечания</label>
                <textarea rows={3} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setModal(false)}>Отмена</button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                  <Save size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Crop Varieties Tab ─────────────────────────────────────────────────────────

function CropVarietiesTab() {
  const [items, setItems] = useState<CropVariety[]>([])
  const [filtered, setFiltered] = useState<CropVariety[]>([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<CropVarietyRequest>(emptyVarietyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? items.filter(i => i.name.toLowerCase().includes(q) || i.cropType?.name.toLowerCase().includes(q)) : items)
  }, [search, items])

  const load = async () => {
    try {
      setLoading(true)
      const [v, t] = await Promise.all([cropVarietyService.getAll(), cropTypeService.getAll()])
      setItems(v); setCropTypes(t); setError(null)
    } catch { setError('Ошибка загрузки сортов') }
    finally { setLoading(false) }
  }

  const openCreate = () => { setEditId(null); setForm(emptyVarietyForm()); setModal(true) }
  const openEdit = (item: CropVariety) => {
    setEditId(item.id)
    setForm({
      name: item.name, cropTypeId: item.cropType?.id ?? 0,
      seedProducer: item.seedProducer ?? '', maturationDays: item.maturationDays,
      diseaseResistanceId: [], droughtTolerance: item.droughtTolerance,
      frostTolerance: item.frostTolerance,
      recommendedSeedingRateKgPerHa: item.recommendedSeedingRateKgPerHa,
      seedCostPerKg: item.seedCostPerKg, isHybrid: item.isHybrid ?? false, notes: item.notes ?? '',
    })
    setModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      if (editId) await cropVarietyService.update(editId, form)
      else await cropVarietyService.create(form)
      setModal(false); await load()
    } catch { setError('Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить сорт «${name}»?`)) return
    try { await cropVarietyService.delete(id); await load() }
    catch { setError('Ошибка удаления') }
  }

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-toolbar">
        <div className="admin-search-wrap">
          <Search size={15} className="admin-search-icon" />
          <input
            className="admin-search-input"
            placeholder="Поиск по названию или культуре..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="admin-btn-primary" onClick={openCreate}>
          <Plus size={16} /> Добавить сорт
        </button>
      </div>

      {error && (
        <div className="admin-alert error">
          <AlertCircle size={15} /> {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">Загрузка...</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Культура</th>
                <th>Производитель</th>
                <th>Созревание (дн.)</th>
                <th>Гибрид</th>
                <th>Засухоустойчивость</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="admin-table-empty">Ничего не найдено</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id}>
                  <td className="admin-td-muted">{item.id}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.cropType?.name ?? '—'}</td>
                  <td>{item.seedProducer ?? '—'}</td>
                  <td>{item.maturationDays ?? '—'}</td>
                  <td>{item.isHybrid ? <span className="admin-badge green">Да</span> : <span className="admin-badge gray">Нет</span>}</td>
                  <td>{item.droughtTolerance ? TOLERANCE_LABELS[item.droughtTolerance] : '—'}</td>
                  <td className="admin-td-actions">
                    <button className="admin-icon-btn edit" onClick={() => openEdit(item)} title="Редактировать">
                      <Edit2 size={14} />
                    </button>
                    <button className="admin-icon-btn delete" onClick={() => handleDelete(item.id, item.name)} title="Удалить">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={() => setModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editId ? 'Редактировать сорт' : 'Новый сорт'}</h3>
              <button className="admin-modal-close" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form className="admin-modal-form" onSubmit={handleSave}>
              <div className="admin-form-row">
                <label>Название *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Алексеич" />
              </div>
              <div className="admin-form-row">
                <label>Культура *</label>
                <select required value={form.cropTypeId || ''} onChange={e => setForm({ ...form, cropTypeId: +e.target.value })}>
                  <option value="">— Выберите —</option>
                  {cropTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Производитель</label>
                  <input value={form.seedProducer ?? ''} onChange={e => setForm({ ...form, seedProducer: e.target.value })} />
                </div>
                <div className="admin-form-row">
                  <label>Созревание (дней)</label>
                  <input type="number" value={form.maturationDays ?? ''} onChange={e => setForm({ ...form, maturationDays: e.target.value ? +e.target.value : undefined })} />
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Засухоустойчивость</label>
                  <select value={form.droughtTolerance ?? ''} onChange={e => setForm({ ...form, droughtTolerance: e.target.value as ToleranceLevel || undefined })}>
                    <option value="">— Не указана —</option>
                    {Object.values(ToleranceLevel).map(v => <option key={v} value={v}>{TOLERANCE_LABELS[v]}</option>)}
                  </select>
                </div>
                <div className="admin-form-row">
                  <label>Морозоустойчивость</label>
                  <select value={form.frostTolerance ?? ''} onChange={e => setForm({ ...form, frostTolerance: e.target.value as ToleranceLevel || undefined })}>
                    <option value="">— Не указана —</option>
                    {Object.values(ToleranceLevel).map(v => <option key={v} value={v}>{TOLERANCE_LABELS[v]}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-form-grid-2">
                <div className="admin-form-row">
                  <label>Норма высева (кг/га)</label>
                  <input type="number" step="0.1" value={form.recommendedSeedingRateKgPerHa ?? ''} onChange={e => setForm({ ...form, recommendedSeedingRateKgPerHa: e.target.value ? +e.target.value : undefined })} />
                </div>
                <div className="admin-form-row">
                  <label>Цена семян (₽/кг)</label>
                  <input type="number" step="0.01" value={form.seedCostPerKg ?? ''} onChange={e => setForm({ ...form, seedCostPerKg: e.target.value ? +e.target.value : undefined })} />
                </div>
              </div>
              <div className="admin-form-row">
                <label>
                  <input type="checkbox" checked={form.isHybrid ?? false} onChange={e => setForm({ ...form, isHybrid: e.target.checked })} />
                  {' '}Гибрид
                </label>
              </div>
              <div className="admin-form-row">
                <label>Примечания</label>
                <textarea rows={3} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={() => setModal(false)}>Отмена</button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                  <Save size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminCropsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'types'

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title">
          <Sprout size={22} />
          <h1>Культуры и сорта</h1>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab-btn${tab === 'types' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'types' })}
        >
          <Sprout size={15} /> Культуры
        </button>
        <button
          className={`admin-tab-btn${tab === 'varieties' ? ' active' : ''}`}
          onClick={() => setSearchParams({ tab: 'varieties' })}
        >
          <Leaf size={15} /> Сорта
        </button>
      </div>

      {tab === 'types' ? <CropTypesTab /> : <CropVarietiesTab />}
    </div>
  )
}
