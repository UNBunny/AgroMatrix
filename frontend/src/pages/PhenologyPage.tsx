import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Leaf } from 'lucide-react'
import { phenologyService } from '../services/phenologyService'
import { cropHistoryService } from '../services/cropService'
import { PhenologicalObservation, PhenologicalObservationRequest, ObservationMethod } from '../types/AgronomicTypes'
import { CropHistory } from '../types/CropTypes'

const BBCH_PRESETS = [
  { code: 0, label: '00 — Сухое семя' },
  { code: 10, label: '10 — Всходы' },
  { code: 13, label: '13 — 3 листа' },
  { code: 21, label: '21 — 1 побег' },
  { code: 30, label: '30 — Начало стеблевания' },
  { code: 37, label: '37 — Флаговый лист' },
  { code: 49, label: '49 — Колошение' },
  { code: 61, label: '61 — Цветение' },
  { code: 71, label: '71 — Налив зерна' },
  { code: 85, label: '85 — Молочная спелость' },
  { code: 87, label: '87 — Восковая спелость' },
  { code: 89, label: '89 — Полная спелость' },
]

const METHOD_LABELS: Record<ObservationMethod, string> = {
  [ObservationMethod.VISUAL]: 'Визуальный',
  [ObservationMethod.TACTILE]: 'Тактильный',
  [ObservationMethod.LAB_ANALYSIS]: 'Лабораторный',
}

const emptyForm = (): PhenologicalObservationRequest => ({
  cropHistoryId: 0,
  observationDate: new Date().toISOString().split('T')[0],
  bbchScale: 0,
  bbchDescription: '',
  observationMethod: ObservationMethod.VISUAL,
  notes: '',
  weatherConditions: '',
})

export default function PhenologyPage() {
  const [histories, setHistories] = useState<CropHistory[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [observations, setObservations] = useState<PhenologicalObservation[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<PhenologicalObservationRequest>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cropHistoryService.getAll().then(setHistories).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedHistoryId) loadObservations(selectedHistoryId)
  }, [selectedHistoryId])

  const loadObservations = async (id: number) => {
    setLoading(true)
    try {
      setObservations(await phenologyService.getByCropHistory(id))
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setForm({ ...emptyForm(), cropHistoryId: selectedHistoryId ?? 0 })
    setEditId(null)
    setShowForm(true)
    setError(null)
  }

  const openEdit = (obs: PhenologicalObservation) => {
    setForm({
      cropHistoryId: obs.cropHistoryId,
      observationDate: obs.observationDate,
      bbchScale: obs.bbchScale,
      bbchDescription: obs.bbchDescription ?? '',
      observationMethod: obs.observationMethod,
      notes: obs.notes ?? '',
      weatherConditions: obs.weatherConditions ?? '',
    })
    setEditId(obs.id)
    setShowForm(true)
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editId) {
        await phenologyService.update(editId, form)
      } else {
        await phenologyService.create(form)
      }
      setShowForm(false)
      if (selectedHistoryId) loadObservations(selectedHistoryId)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить наблюдение?')) return
    await phenologyService.delete(id)
    if (selectedHistoryId) loadObservations(selectedHistoryId)
  }

  const set = (k: keyof PhenologicalObservationRequest, v: any) =>
    setForm(f => ({ ...f, [k]: v === '' ? undefined : v }))

  const selectedHistory = histories.find(h => h.id === selectedHistoryId)

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">Фенологические наблюдения</h1>
          <p className="page-subtitle">Фазы развития культуры по шкале BBCH</p>
        </div>
        {selectedHistoryId && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Добавить наблюдение
          </button>
        )}
      </div>

      <div className="card mb-20" style={{ padding: 16 }}>
        <label className="form-label">История посева</label>
        <select
          className="form-select"
          value={selectedHistoryId ?? ''}
          onChange={e => setSelectedHistoryId(Number(e.target.value) || null)}
        >
          <option value="">— выберите посев —</option>
          {histories.map(h => (
            <option key={h.id} value={h.id}>
              {h.fieldName} — {h.cropTypeName} ({h.plantingDate?.slice(0, 10)})
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="card mb-20" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editId ? 'Редактировать наблюдение' : 'Новое наблюдение'}</h3>
          {error && <div className="alert alert-danger mb-12">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Дата наблюдения*</label>
              <input className="form-input" type="date" value={form.observationDate} onChange={e => set('observationDate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Метод</label>
              <select className="form-select" value={form.observationMethod ?? ''} onChange={e => set('observationMethod', e.target.value)}>
                {Object.values(ObservationMethod).map(m => (
                  <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">BBCH-код* (0–99)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" type="number" min={0} max={99} value={form.bbchScale} onChange={e => set('bbchScale', Number(e.target.value))} style={{ width: 80 }} />
                <select className="form-select" value="" onChange={e => { const val = Number(e.target.value); if (val || val === 0) { const preset = BBCH_PRESETS.find(p => p.code === val); set('bbchScale', val); if (preset) set('bbchDescription', preset.label.split(' — ')[1]) } }}>
                  <option value="">— быстрый выбор —</option>
                  {BBCH_PRESETS.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Описание фазы</label>
              <input className="form-input" value={form.bbchDescription ?? ''} onChange={e => set('bbchDescription', e.target.value)} placeholder="Начало кущения..." />
            </div>
            <div>
              <label className="form-label">Погодные условия</label>
              <input className="form-input" value={form.weatherConditions ?? ''} onChange={e => set('weatherConditions', e.target.value)} placeholder="Температура 12°C, после дождя..." />
            </div>
            <div>
              <label className="form-label">Примечания</label>
              <input className="form-input" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={16} className="spin" />} Сохранить
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={32} className="spin" /></div>
      ) : !selectedHistoryId ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Leaf size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Выберите историю посева для просмотра наблюдений</p>
        </div>
      ) : observations.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Нет наблюдений. Добавьте первое BBCH-наблюдение.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {observations.map(obs => (
            <div key={obs.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: 'var(--color-primary)', color: '#fff', borderRadius: 8, width: 52, height: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{obs.bbchScale}</span>
                <span style={{ fontSize: 9, opacity: 0.8 }}>BBCH</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{obs.bbchDescription || `BBCH ${obs.bbchScale}`}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {obs.observationDate}
                  {obs.observationMethod && <span style={{ marginLeft: 8 }}>· {METHOD_LABELS[obs.observationMethod]}</span>}
                  {obs.weatherConditions && <span style={{ marginLeft: 8 }}>· {obs.weatherConditions}</span>}
                </div>
                {obs.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{obs.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(obs)}><Pencil size={14} /></button>
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(obs.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
