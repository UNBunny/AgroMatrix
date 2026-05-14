import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, FlaskConical } from 'lucide-react'
import { soilHorizonService } from '../services/soilHorizonService'
import { fieldService } from '../services/fieldService'
import { Field } from '../types/Field'
import { SoilHorizon, SoilHorizonRequest } from '../types/AgronomicTypes'

const emptyForm = (): SoilHorizonRequest => ({
  fieldId: 0,
  depthFromCm: 0,
  depthToCm: 20,
  nitrogenN: undefined,
  phosphorusP: undefined,
  potassiumK: undefined,
  phLevel: undefined,
  bulkDensity: undefined,
  organicMatter: undefined,
  samplingDate: undefined,
  labProtocol: '',
  notes: '',
})

export default function SoilHorizonsPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)
  const [horizons, setHorizons] = useState<SoilHorizon[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<SoilHorizonRequest>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fieldService.getAllFields().then(data => setFields(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedFieldId) loadHorizons(selectedFieldId)
  }, [selectedFieldId])

  const loadHorizons = async (fieldId: number) => {
    setLoading(true)
    try {
      const data = await soilHorizonService.getByField(fieldId)
      setHorizons(data)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setForm({ ...emptyForm(), fieldId: selectedFieldId ?? 0 })
    setEditId(null)
    setShowForm(true)
    setError(null)
  }

  const openEdit = (h: SoilHorizon) => {
    setForm({
      fieldId: h.fieldId,
      depthFromCm: h.depthFromCm,
      depthToCm: h.depthToCm,
      nitrogenN: h.nitrogenN,
      phosphorusP: h.phosphorusP,
      potassiumK: h.potassiumK,
      phLevel: h.phLevel,
      bulkDensity: h.bulkDensity,
      organicMatter: h.organicMatter,
      samplingDate: h.samplingDate,
      labProtocol: h.labProtocol,
      notes: h.notes,
    })
    setEditId(h.id)
    setShowForm(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.fieldId || form.depthFromCm === undefined || !form.depthToCm) {
      setError('Заполните обязательные поля')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editId) {
        await soilHorizonService.update(editId, form)
      } else {
        await soilHorizonService.create(form)
      }
      setShowForm(false)
      if (selectedFieldId) loadHorizons(selectedFieldId)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить горизонт?')) return
    await soilHorizonService.delete(id)
    if (selectedFieldId) loadHorizons(selectedFieldId)
  }

  const set = (k: keyof SoilHorizonRequest, v: any) => setForm(f => ({ ...f, [k]: v === '' ? undefined : v }))

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">Горизонты почвы</h1>
          <p className="page-subtitle">Лабораторный анализ по глубинам (0–20 см и 20–40 см)</p>
        </div>
        {selectedFieldId && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Добавить горизонт
          </button>
        )}
      </div>

      <div className="card mb-20" style={{ padding: 16 }}>
        <label className="form-label">Поле</label>
        <select
          className="form-select"
          value={selectedFieldId ?? ''}
          onChange={e => setSelectedFieldId(Number(e.target.value) || null)}
        >
          <option value="">— выберите поле —</option>
          {fields.map(f => (
            <option key={f.id} value={f.id}>{f.fieldName}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="card mb-20" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editId ? 'Редактировать горизонт' : 'Новый горизонт'}</h3>
          {error && <div className="alert alert-danger mb-12">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Глубина от (см)*</label>
              <input className="form-input" type="number" value={form.depthFromCm ?? ''} onChange={e => set('depthFromCm', Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Глубина до (см)*</label>
              <input className="form-input" type="number" value={form.depthToCm ?? ''} onChange={e => set('depthToCm', Number(e.target.value))} />
            </div>
            <div>
              <label className="form-label">Азот N (мг/кг)</label>
              <input className="form-input" type="number" step="0.01" value={form.nitrogenN ?? ''} onChange={e => set('nitrogenN', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Фосфор P (мг/кг)</label>
              <input className="form-input" type="number" step="0.01" value={form.phosphorusP ?? ''} onChange={e => set('phosphorusP', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Калий K (мг/кг)</label>
              <input className="form-input" type="number" step="0.01" value={form.potassiumK ?? ''} onChange={e => set('potassiumK', e.target.value)} />
            </div>
            <div>
              <label className="form-label">pH</label>
              <input className="form-input" type="number" step="0.1" min="0" max="14" value={form.phLevel ?? ''} onChange={e => set('phLevel', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Плотность (г/см³)</label>
              <input className="form-input" type="number" step="0.001" value={form.bulkDensity ?? ''} onChange={e => set('bulkDensity', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Орг. вещество (%)</label>
              <input className="form-input" type="number" step="0.01" value={form.organicMatter ?? ''} onChange={e => set('organicMatter', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Дата отбора</label>
              <input className="form-input" type="date" value={form.samplingDate ?? ''} onChange={e => set('samplingDate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Метод анализа</label>
              <input className="form-input" placeholder="Кирсанов, Мачигин..." value={form.labProtocol ?? ''} onChange={e => set('labProtocol', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Примечания</label>
              <textarea className="form-input" rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="spin" /> : null} Сохранить
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={32} className="spin" /></div>
      ) : !selectedFieldId ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <FlaskConical size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Выберите поле для просмотра горизонтов</p>
        </div>
      ) : horizons.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Нет данных. Добавьте лабораторный анализ почвы.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {horizons.map(h => (
            <div key={h.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="badge badge-info" style={{ marginRight: 8 }}>
                    {h.depthFromCm}–{h.depthToCm} см
                  </span>
                  {h.samplingDate && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Отбор: {h.samplingDate}</span>}
                  {h.labProtocol && <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>({h.labProtocol})</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(h)}><Pencil size={14} /></button>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(h.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginTop: 12 }}>
                {h.nitrogenN !== undefined && <Metric label="N (мг/кг)" value={h.nitrogenN} />}
                {h.phosphorusP !== undefined && <Metric label="P (мг/кг)" value={h.phosphorusP} />}
                {h.potassiumK !== undefined && <Metric label="K (мг/кг)" value={h.potassiumK} />}
                {h.phLevel !== undefined && <Metric label="pH" value={h.phLevel} />}
                {h.bulkDensity !== undefined && <Metric label="Плотность (г/см³)" value={h.bulkDensity} />}
                {h.organicMatter !== undefined && <Metric label="Орг. вещество (%)" value={h.organicMatter} />}
              </div>
              {h.notes && <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>{h.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '6px 10px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{value}</div>
    </div>
  )
}
