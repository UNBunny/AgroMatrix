import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Edit2, Trash2, X, Save, Sprout, Leaf } from 'lucide-react'
import { cropTypeService, cropVarietyService } from '../services/cropService'
import { diseaseResistanceService } from '../services/diseaseService'
import { CropType, CropTypeRequest, CropVariety, CropVarietyRequest, ToleranceLevel } from '../types/CropTypes'
import { DiseaseResistance } from '../types/DiseaseTypes'

type Tab = 'types' | 'varieties'

const TOLERANCE_LABELS: Record<ToleranceLevel, string> = {
  [ToleranceLevel.LOW]:       'Низкая',
  [ToleranceLevel.MEDIUM]:    'Средняя',
  [ToleranceLevel.HIGH]:      'Высокая',
  [ToleranceLevel.VERY_HIGH]: 'Очень высокая',
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="tabs-bar">
      <button className={`tab-btn${tab === 'types' ? ' active' : ''}`} onClick={() => setTab('types')}>
        <Sprout size={16} /> Культуры
      </button>
      <button className={`tab-btn${tab === 'varieties' ? ' active' : ''}`} onClick={() => setTab('varieties')}>
        <Leaf size={16} /> Сорта
      </button>
    </div>
  )
}

// ── Crop Types Tab ────────────────────────────────────────────────────────────

const emptyCropTypeForm = (): CropTypeRequest => ({
  name: '', category: '', growingSeasonDays: undefined,
  optimalTemperatureMin: undefined, optimalTemperatureMax: undefined,
  waterRequirementsMm: undefined, notes: '', mlCropCode: '',
})

function CropTypesTab() {
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CropTypeRequest>(emptyCropTypeForm())

  useEffect(() => { load() }, [])

  const load = async () => {
    try { setLoading(true); setCropTypes(await cropTypeService.getAll()); setError(null) }
    catch { setError('Ошибка загрузки') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      editingId ? await cropTypeService.update(editingId, form) : await cropTypeService.create(form)
      await load(); closeModal()
    } catch { setError('Ошибка сохранения') }
    finally { setLoading(false) }
  }

  const handleEdit = (ct: CropType) => {
    setEditingId(ct.id)
    setForm({
      name: ct.name, category: ct.category,
      growingSeasonDays: ct.growingSeasonDays, optimalTemperatureMin: ct.optimalTemperatureMin,
      optimalTemperatureMax: ct.optimalTemperatureMax, waterRequirementsMm: ct.waterRequirementsMm,
      notes: ct.notes, mlCropCode: ct.mlCropCode || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить тип культуры?')) return
    try { setLoading(true); await cropTypeService.delete(id); await load() }
    catch { setError('Ошибка удаления') }
    finally { setLoading(false) }
  }

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(emptyCropTypeForm()) }
  const set = (k: keyof CropTypeRequest, v: any) => setForm(f => ({ ...f, [k]: v === '' ? undefined : v }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={16} /> Добавить культуру</button>
      </div>

      {error && <div className="alert alert-danger mb-12">{error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Загрузка...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {cropTypes.map(ct => (
          <div key={ct.id} className="card card-padding">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{ct.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{ct.category}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-icon" onClick={() => handleEdit(ct)}><Edit2 size={14} /></button>
                <button className="btn-icon danger" onClick={() => handleDelete(ct.id)}><Trash2 size={14} /></button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              {ct.growingSeasonDays && <span><strong>Вегетация:</strong> {ct.growingSeasonDays} дн.</span>}
              {ct.optimalTemperatureMin != null && ct.optimalTemperatureMax != null && (
                <span><strong>Температура:</strong> {ct.optimalTemperatureMin}°C – {ct.optimalTemperatureMax}°C</span>
              )}
              {ct.waterRequirementsMm && <span><strong>Полив:</strong> {ct.waterRequirementsMm} мм/сез.</span>}
              {ct.mlCropCode && <span><strong>ML-код:</strong> <code style={{ fontSize: 11, background: 'var(--color-bg)', padding: '1px 4px', borderRadius: 3 }}>{ct.mlCropCode}</code></span>}
              {ct.notes && <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 12 }}>{ct.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? 'Редактировать культуру' : 'Добавить культуру'}</span>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group"><label className="form-label">Название *</label>
                  <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required maxLength={100} /></div>
                <div className="form-group"><label className="form-label">Категория *</label>
                  <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)} required>
                    <option value="">Выберите категорию</option>
                    {['Зерновые', 'Бобовые', 'Масличные', 'Овощные', 'Технические'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Вегетация (дн.)</label>
                    <input className="form-control" type="number" value={form.growingSeasonDays ?? ''} onChange={e => set('growingSeasonDays', e.target.value ? Number(e.target.value) : undefined)} /></div>
                  <div className="form-group"><label className="form-label">Полив (мм/сез.)</label>
                    <input className="form-control" type="number" step="0.1" value={form.waterRequirementsMm ?? ''} onChange={e => set('waterRequirementsMm', e.target.value ? Number(e.target.value) : undefined)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Мин. темп. (°C)</label>
                    <input className="form-control" type="number" step="0.1" value={form.optimalTemperatureMin ?? ''} onChange={e => set('optimalTemperatureMin', e.target.value ? Number(e.target.value) : undefined)} /></div>
                  <div className="form-group"><label className="form-label">Макс. темп. (°C)</label>
                    <input className="form-control" type="number" step="0.1" value={form.optimalTemperatureMax ?? ''} onChange={e => set('optimalTemperatureMax', e.target.value ? Number(e.target.value) : undefined)} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">ML-код</label>
                    <input className="form-control" value={form.mlCropCode ?? ''} onChange={e => set('mlCropCode', e.target.value)} placeholder="spring_wheat" /></div>
                </div>
                <div className="form-group"><label className="form-label">Заметки</label>
                  <textarea className="form-control" rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={loading}><Save size={16} /> Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Crop Varieties Tab ────────────────────────────────────────────────────────

const emptyVarietyForm = (): CropVarietyRequest => ({
  name: '', cropTypeId: 0, seedProducer: '', maturationDays: undefined,
  diseaseResistanceId: [], droughtTolerance: undefined, frostTolerance: undefined,
  recommendedSeedingRateKgPerHa: undefined, seedCostPerKg: undefined, isHybrid: false, notes: '',
})

function CropVarietiesTab() {
  const [varieties, setVarieties] = useState<CropVariety[]>([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [diseaseResistances, setDiseaseResistances] = useState<DiseaseResistance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CropVarietyRequest>(emptyVarietyForm())
  const [filterCropType, setFilterCropType] = useState<number | ''>('')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      const [v, ct, dr] = await Promise.all([
        cropVarietyService.getAll(), cropTypeService.getAll(), diseaseResistanceService.getAll()
      ])
      setVarieties(v); setCropTypes(ct); setDiseaseResistances(dr); setError(null)
    } catch { setError('Ошибка загрузки') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      editingId ? await cropVarietyService.update(editingId, form) : await cropVarietyService.create(form)
      await load(); closeModal()
    } catch { setError('Ошибка сохранения') }
    finally { setLoading(false) }
  }

  const handleEdit = (v: CropVariety) => {
    setEditingId(v.id)
    setForm({
      name: v.name, cropTypeId: v.cropType?.id ?? 0, seedProducer: v.seedProducer || '',
      maturationDays: v.maturationDays, diseaseResistanceId: (v.diseaseResistance ?? []).map((dr: any) => dr.id),
      droughtTolerance: v.droughtTolerance, frostTolerance: v.frostTolerance,
      recommendedSeedingRateKgPerHa: v.recommendedSeedingRateKgPerHa,
      seedCostPerKg: v.seedCostPerKg, isHybrid: v.isHybrid || false, notes: v.notes || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить сорт?')) return
    try { setLoading(true); await cropVarietyService.delete(id); await load() }
    catch { setError('Ошибка удаления') }
    finally { setLoading(false) }
  }

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); setForm(emptyVarietyForm()) }

  const toggleResistance = (id: number) => setForm(prev => ({
    ...prev,
    diseaseResistanceId: prev.diseaseResistanceId.includes(id)
      ? prev.diseaseResistanceId.filter(r => r !== id)
      : [...prev.diseaseResistanceId, id],
  }))

  const filtered = filterCropType ? varieties.filter(v => v.cropType?.id === filterCropType) : varieties

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <select className="form-select" style={{ width: 220 }} value={filterCropType} onChange={e => setFilterCropType(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Все культуры</option>
          {cropTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={16} /> Добавить сорт</button>
      </div>

      {error && <div className="alert alert-danger mb-12">{error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Загрузка...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(v => (
          <div key={v.id} className="card card-padding">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{v.name}
                  {v.isHybrid && <span className="badge" style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>Гибрид</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{v.cropType?.name ?? '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-icon" onClick={() => handleEdit(v)}><Edit2 size={14} /></button>
                <button className="btn-icon danger" onClick={() => handleDelete(v.id)}><Trash2 size={14} /></button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13 }}>
              {v.seedProducer && <span><strong>Производитель:</strong> {v.seedProducer}</span>}
              {v.maturationDays && <span><strong>Созревание:</strong> {v.maturationDays} дн.</span>}
              {v.droughtTolerance && <span><strong>Засухоустойчивость:</strong> {TOLERANCE_LABELS[v.droughtTolerance]}</span>}
              {v.frostTolerance && <span><strong>Морозостойкость:</strong> {TOLERANCE_LABELS[v.frostTolerance]}</span>}
              {v.recommendedSeedingRateKgPerHa && <span><strong>Норма высева:</strong> {v.recommendedSeedingRateKgPerHa} кг/га</span>}
              {v.notes && <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 12 }}>{v.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingId ? 'Редактировать сорт' : 'Добавить сорт'}</span>
              <button className="btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group"><label className="form-label">Название *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Культура *</label>
                  <select className="form-control" value={form.cropTypeId} onChange={e => setForm(f => ({ ...f, cropTypeId: Number(e.target.value) }))} required>
                    <option value={0}>Выберите культуру</option>
                    {cropTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Производитель</label>
                    <input className="form-control" value={form.seedProducer} onChange={e => setForm(f => ({ ...f, seedProducer: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Созревание (дн.)</label>
                    <input className="form-control" type="number" value={form.maturationDays ?? ''} onChange={e => setForm(f => ({ ...f, maturationDays: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Засухоустойчивость</label>
                    <select className="form-control" value={form.droughtTolerance ?? ''} onChange={e => setForm(f => ({ ...f, droughtTolerance: e.target.value as ToleranceLevel || undefined }))}>
                      <option value="">Не указано</option>
                      {Object.values(ToleranceLevel).map(l => <option key={l} value={l}>{TOLERANCE_LABELS[l]}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Морозостойкость</label>
                    <select className="form-control" value={form.frostTolerance ?? ''} onChange={e => setForm(f => ({ ...f, frostTolerance: e.target.value as ToleranceLevel || undefined }))}>
                      <option value="">Не указано</option>
                      {Object.values(ToleranceLevel).map(l => <option key={l} value={l}>{TOLERANCE_LABELS[l]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Норма высева (кг/га)</label>
                    <input className="form-control" type="number" step="0.1" value={form.recommendedSeedingRateKgPerHa ?? ''} onChange={e => setForm(f => ({ ...f, recommendedSeedingRateKgPerHa: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                  <div className="form-group"><label className="form-label">Стоимость семян (руб/кг)</label>
                    <input className="form-control" type="number" step="0.01" value={form.seedCostPerKg ?? ''} onChange={e => setForm(f => ({ ...f, seedCostPerKg: e.target.value ? Number(e.target.value) : undefined }))} /></div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.isHybrid} onChange={e => setForm(f => ({ ...f, isHybrid: e.target.checked }))} /> Гибрид
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Устойчивость к заболеваниям</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {diseaseResistances.map(dr => (
                      <label key={dr.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', padding: '3px 8px', borderRadius: 6, background: form.diseaseResistanceId.includes(dr.id) ? 'var(--color-primary-light)' : 'var(--color-bg)', border: '1px solid', borderColor: form.diseaseResistanceId.includes(dr.id) ? 'var(--color-primary-medium)' : 'var(--color-border)' }}>
                        <input type="checkbox" checked={form.diseaseResistanceId.includes(dr.id)} onChange={() => toggleResistance(dr.id)} style={{ display: 'none' }} />
                        {dr.diseaseName}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Заметки</label>
                  <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={loading}><Save size={16} /> Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CropsReferencePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = tabParam === 'varieties' ? 'varieties' : 'types'

  const setTab = (t: Tab) => setSearchParams(t === 'types' ? {} : { tab: t })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Культуры и сорта</h1>
          <p className="page-subtitle">Справочник культур, сортов и их агрономических характеристик</p>
        </div>
      </div>
      <TabBar tab={tab} setTab={setTab} />
      <div style={{ marginTop: 20 }}>
        {tab === 'types'     && <CropTypesTab />}
        {tab === 'varieties' && <CropVarietiesTab />}
      </div>
    </div>
  )
}
