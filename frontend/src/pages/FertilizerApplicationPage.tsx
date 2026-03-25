import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Beaker } from 'lucide-react'
import { fertilizerApplicationService } from '../services/fertilizerApplicationService'
import { cropHistoryService } from '../services/cropService'
import { FertilizerApplication, FertilizerApplicationRequest, ApplicationMethod } from '../types/AgronomicTypes'
import { CropHistory } from '../types/CropTypes'

const METHOD_LABELS: Record<ApplicationMethod, string> = {
  [ApplicationMethod.BROADCAST]: 'Поверхностное внесение',
  [ApplicationMethod.FERTIGATION]: 'Фертигация',
  [ApplicationMethod.FOLIAR]: 'Листовая подкормка',
  [ApplicationMethod.LOCALIZED]: 'Локальное внесение',
}

const emptyForm = (): FertilizerApplicationRequest => ({
  cropHistoryId: 0,
  applicationDate: new Date().toISOString().split('T')[0],
  fertilizerType: '',
})

export default function FertilizerApplicationPage() {
  const [histories, setHistories] = useState<CropHistory[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [items, setItems] = useState<FertilizerApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FertilizerApplicationRequest>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { cropHistoryService.getAll().then(setHistories).catch(() => {}) }, [])
  useEffect(() => { if (selectedHistoryId) load(selectedHistoryId) }, [selectedHistoryId])

  const load = async (id: number) => {
    setLoading(true)
    try { setItems(await fertilizerApplicationService.getByCropHistory(id)) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setForm({ ...emptyForm(), cropHistoryId: selectedHistoryId ?? 0 })
    setEditId(null)
    setShowForm(true)
    setError(null)
  }

  const openEdit = (item: FertilizerApplication) => {
    setForm({
      cropHistoryId: item.cropHistoryId,
      applicationDate: item.applicationDate,
      fertilizerType: item.fertilizerType,
      formulation: item.formulation,
      doseKgPerHa: item.doseKgPerHa,
      totalAreaHa: item.totalAreaHa,
      totalAmountKg: item.totalAmountKg,
      applicationMethod: item.applicationMethod,
      bbchPhase: item.bbchPhase,
      costPerHa: item.costPerHa,
      totalCost: item.totalCost,
      weatherTempC: item.weatherTempC,
      weatherHumidity: item.weatherHumidity,
      windSpeed: item.windSpeed,
      notes: item.notes,
    })
    setEditId(item.id)
    setShowForm(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.fertilizerType) { setError('Укажите тип удобрения'); return }
    setSaving(true)
    setError(null)
    try {
      editId ? await fertilizerApplicationService.update(editId, form) : await fertilizerApplicationService.create(form)
      setShowForm(false)
      if (selectedHistoryId) load(selectedHistoryId)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка сохранения')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    await fertilizerApplicationService.delete(id)
    if (selectedHistoryId) load(selectedHistoryId)
  }

  const set = (k: keyof FertilizerApplicationRequest, v: any) =>
    setForm(f => ({ ...f, [k]: v === '' ? undefined : v }))

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">Применение удобрений</h1>
          <p className="page-subtitle">Журнал внесения удобрений по посевам</p>
        </div>
        {selectedHistoryId && (
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Добавить</button>
        )}
      </div>

      <div className="card mb-20" style={{ padding: 16 }}>
        <label className="form-label">История посева</label>
        <select className="form-select" value={selectedHistoryId ?? ''} onChange={e => setSelectedHistoryId(Number(e.target.value) || null)}>
          <option value="">— выберите посев —</option>
          {histories.map(h => (
            <option key={h.id} value={h.id}>{h.fieldName} — {h.cropTypeName} ({h.plantingDate?.slice(0, 10)})</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="card mb-20" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editId ? 'Редактировать' : 'Новое внесение'}</h3>
          {error && <div className="alert alert-danger mb-12">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Дата*</label>
              <input className="form-input" type="date" value={form.applicationDate} onChange={e => set('applicationDate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Тип удобрения*</label>
              <input className="form-input" placeholder="Карбамид, Аммофос..." value={form.fertilizerType} onChange={e => set('fertilizerType', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Формула (NPK)</label>
              <input className="form-input" placeholder="46-0-0, 16-16-16..." value={form.formulation ?? ''} onChange={e => set('formulation', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Метод внесения</label>
              <select className="form-select" value={form.applicationMethod ?? ''} onChange={e => set('applicationMethod', e.target.value || undefined)}>
                <option value="">— не указан —</option>
                {Object.values(ApplicationMethod).map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Доза (кг/га)</label>
              <input className="form-input" type="number" step="0.1" value={form.doseKgPerHa ?? ''} onChange={e => set('doseKgPerHa', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Площадь (га)</label>
              <input className="form-input" type="number" step="0.1" value={form.totalAreaHa ?? ''} onChange={e => set('totalAreaHa', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Всего кг</label>
              <input className="form-input" type="number" step="0.1" value={form.totalAmountKg ?? ''} onChange={e => set('totalAmountKg', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Фаза BBCH</label>
              <input className="form-input" type="number" min={0} max={99} value={form.bbchPhase ?? ''} onChange={e => set('bbchPhase', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Стоимость (руб/га)</label>
              <input className="form-input" type="number" step="0.01" value={form.costPerHa ?? ''} onChange={e => set('costPerHa', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Итого (руб)</label>
              <input className="form-input" type="number" step="0.01" value={form.totalCost ?? ''} onChange={e => set('totalCost', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Темп. (°C)</label>
              <input className="form-input" type="number" step="0.1" value={form.weatherTempC ?? ''} onChange={e => set('weatherTempC', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Ветер (м/с)</label>
              <input className="form-input" type="number" step="0.1" value={form.windSpeed ?? ''} onChange={e => set('windSpeed', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Примечания</label>
              <textarea className="form-input" rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
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
          <Beaker size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Выберите историю посева</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Нет записей о внесении удобрений</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Удобрение</th>
                <th>NPK</th>
                <th>Доза (кг/га)</th>
                <th>Площадь (га)</th>
                <th>Метод</th>
                <th>BBCH</th>
                <th>Стоимость</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.applicationDate}</td>
                  <td>{item.fertilizerType}</td>
                  <td>{item.formulation ?? '—'}</td>
                  <td>{item.doseKgPerHa ?? '—'}</td>
                  <td>{item.totalAreaHa ?? '—'}</td>
                  <td>{item.applicationMethod ? METHOD_LABELS[item.applicationMethod] : '—'}</td>
                  <td>{item.bbchPhase ?? '—'}</td>
                  <td>{item.totalCost ? `${item.totalCost} ₽` : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}><Pencil size={14} /></button>
                      <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
