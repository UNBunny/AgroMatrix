import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import { plantProtectionService } from '../services/plantProtectionService'
import { cropHistoryService } from '../services/cropService'
import {
  PlantProtectionOperation, PlantProtectionRequest,
  ProtectionOperationType, InfestationLevel,
} from '../types/AgronomicTypes'
import { CropHistory } from '../types/CropTypes'

const TYPE_LABELS: Record<ProtectionOperationType, string> = {
  [ProtectionOperationType.HERBICIDE]: '🌿 Гербицид',
  [ProtectionOperationType.FUNGICIDE]: '🍄 Фунгицид',
  [ProtectionOperationType.INSECTICIDE]: '🐛 Инсектицид',
  [ProtectionOperationType.DESICCANT]: '🌵 Десикант',
}

const TYPE_COLORS: Record<ProtectionOperationType, string> = {
  [ProtectionOperationType.HERBICIDE]: '#22c55e',
  [ProtectionOperationType.FUNGICIDE]: '#a855f7',
  [ProtectionOperationType.INSECTICIDE]: '#f97316',
  [ProtectionOperationType.DESICCANT]: '#ef4444',
}

const INFESTATION_LABELS: Record<InfestationLevel, string> = {
  [InfestationLevel.LOW]: 'Низкая',
  [InfestationLevel.MEDIUM]: 'Средняя',
  [InfestationLevel.HIGH]: 'Высокая',
  [InfestationLevel.ECONOMIC_THRESHOLD]: 'Экономический порог',
}

const emptyForm = (): PlantProtectionRequest => ({
  cropHistoryId: 0,
  operationDate: new Date().toISOString().split('T')[0],
  operationType: ProtectionOperationType.HERBICIDE,
  productName: '',
})

export default function PlantProtectionOperationsPage() {
  const [histories, setHistories] = useState<CropHistory[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const [items, setItems] = useState<PlantProtectionOperation[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<PlantProtectionRequest>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { cropHistoryService.getAll().then(setHistories).catch(() => {}) }, [])
  useEffect(() => { if (selectedHistoryId) load(selectedHistoryId) }, [selectedHistoryId])

  const load = async (id: number) => {
    setLoading(true)
    try { setItems(await plantProtectionService.getByCropHistory(id)) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setForm({ ...emptyForm(), cropHistoryId: selectedHistoryId ?? 0 })
    setEditId(null)
    setShowForm(true)
    setError(null)
  }

  const openEdit = (item: PlantProtectionOperation) => {
    setForm({
      cropHistoryId: item.cropHistoryId,
      operationDate: item.operationDate,
      operationType: item.operationType,
      productName: item.productName,
      activeIngredient: item.activeIngredient,
      mechanismOfAction: item.mechanismOfAction,
      doseLPerHa: item.doseLPerHa,
      concentrationPercent: item.concentrationPercent,
      targetPest: item.targetPest,
      infestationLevel: item.infestationLevel,
      bbchPhase: item.bbchPhase,
      tempC: item.tempC,
      humidity: item.humidity,
      windSpeed: item.windSpeed,
      precipitationExpected: item.precipitationExpected,
      efficacyPercent: item.efficacyPercent,
      followUpRequired: item.followUpRequired,
      phiDays: item.phiDays,
      harvestAllowedAfter: item.harvestAllowedAfter,
      costPerHa: item.costPerHa,
      notes: item.notes,
    })
    setEditId(item.id)
    setShowForm(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.productName) { setError('Укажите название препарата'); return }
    setSaving(true)
    setError(null)
    try {
      editId ? await plantProtectionService.update(editId, form) : await plantProtectionService.create(form)
      setShowForm(false)
      if (selectedHistoryId) load(selectedHistoryId)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка сохранения')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить операцию?')) return
    await plantProtectionService.delete(id)
    if (selectedHistoryId) load(selectedHistoryId)
  }

  const set = (k: keyof PlantProtectionRequest, v: any) =>
    setForm(f => ({ ...f, [k]: v === '' ? undefined : v }))

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">Защита растений</h1>
          <p className="page-subtitle">Гербициды, фунгициды, инсектициды, десиканты</p>
        </div>
        {selectedHistoryId && (
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Добавить обработку</button>
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
          <h3 style={{ marginBottom: 16 }}>{editId ? 'Редактировать' : 'Новая обработка'}</h3>
          {error && <div className="alert alert-danger mb-12">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Дата*</label>
              <input className="form-input" type="date" value={form.operationDate} onChange={e => set('operationDate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Тип*</label>
              <select className="form-select" value={form.operationType} onChange={e => set('operationType', e.target.value)}>
                {Object.values(ProtectionOperationType).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Препарат*</label>
              <input className="form-input" placeholder="Гранстар, Амистар..." value={form.productName} onChange={e => set('productName', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Действующее вещество</label>
              <input className="form-input" placeholder="Трибенурон-метил..." value={form.activeIngredient ?? ''} onChange={e => set('activeIngredient', e.target.value)} />
            </div>
            <div>
              <label className="form-label">МОД (механизм действия)</label>
              <input className="form-input" placeholder="ALS-ингибитор..." value={form.mechanismOfAction ?? ''} onChange={e => set('mechanismOfAction', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Объект обработки</label>
              <input className="form-input" placeholder="Марь белая, Бурая ржавчина..." value={form.targetPest ?? ''} onChange={e => set('targetPest', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Уровень заражения</label>
              <select className="form-select" value={form.infestationLevel ?? ''} onChange={e => set('infestationLevel', e.target.value || undefined)}>
                <option value="">— не указан —</option>
                {Object.values(InfestationLevel).map(l => <option key={l} value={l}>{INFESTATION_LABELS[l]}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Фаза BBCH</label>
              <input className="form-input" type="number" min={0} max={99} value={form.bbchPhase ?? ''} onChange={e => set('bbchPhase', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Норма расхода (л/га)</label>
              <input className="form-input" type="number" step="0.01" value={form.doseLPerHa ?? ''} onChange={e => set('doseLPerHa', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Концентрация (%)</label>
              <input className="form-input" type="number" step="0.01" value={form.concentrationPercent ?? ''} onChange={e => set('concentrationPercent', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Темп. (°C)</label>
              <input className="form-input" type="number" step="0.1" value={form.tempC ?? ''} onChange={e => set('tempC', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Ветер (м/с)</label>
              <input className="form-input" type="number" step="0.1" value={form.windSpeed ?? ''} onChange={e => set('windSpeed', e.target.value)} />
            </div>
            <div>
              <label className="form-label">ОЖЗ (дней)</label>
              <input className="form-input" type="number" value={form.phiDays ?? ''} onChange={e => set('phiDays', e.target.value)} placeholder="Срок ожидания" />
            </div>
            <div>
              <label className="form-label">Уборка не ранее</label>
              <input className="form-input" type="date" value={form.harvestAllowedAfter ?? ''} onChange={e => set('harvestAllowedAfter', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Эффективность (%)</label>
              <input className="form-input" type="number" min={0} max={100} value={form.efficacyPercent ?? ''} onChange={e => set('efficacyPercent', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Стоимость (руб/га)</label>
              <input className="form-input" type="number" step="0.01" value={form.costPerHa ?? ''} onChange={e => set('costPerHa', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="precipExpected" checked={form.precipitationExpected ?? false} onChange={e => set('precipitationExpected', e.target.checked)} />
              <label htmlFor="precipExpected" className="form-label" style={{ margin: 0 }}>Ожидались осадки</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="followUp" checked={form.followUpRequired ?? false} onChange={e => set('followUpRequired', e.target.checked)} />
              <label htmlFor="followUp" className="form-label" style={{ margin: 0 }}>Нужна повторная обработка</label>
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
          <ShieldCheck size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Выберите историю посева</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Нет записей об обработках</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ background: TYPE_COLORS[item.operationType], color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                    {TYPE_LABELS[item.operationType]}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.productName}
                      {item.activeIngredient && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>({item.activeIngredient})</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {item.operationDate}
                      {item.targetPest && <span style={{ marginLeft: 8 }}>· {item.targetPest}</span>}
                      {item.bbchPhase !== undefined && <span style={{ marginLeft: 8 }}>· BBCH {item.bbchPhase}</span>}
                      {item.doseLPerHa !== undefined && <span style={{ marginLeft: 8 }}>· {item.doseLPerHa} л/га</span>}
                      {item.efficacyPercent !== undefined && <span style={{ marginLeft: 8 }}>· Эфф. {item.efficacyPercent}%</span>}
                    </div>
                    {item.phiDays !== undefined && (
                      <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>
                        ОЖЗ: {item.phiDays} дн.{item.harvestAllowedAfter ? ` (уборка с ${item.harvestAllowedAfter})` : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}><Pencil size={14} /></button>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
