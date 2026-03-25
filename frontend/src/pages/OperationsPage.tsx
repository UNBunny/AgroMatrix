import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Loader2, Beaker, ShieldCheck } from 'lucide-react'
import { fertilizerApplicationService } from '../services/fertilizerApplicationService'
import { plantProtectionService } from '../services/plantProtectionService'
import { cropHistoryService } from '../services/cropService'
import {
  FertilizerApplication, FertilizerApplicationRequest, ApplicationMethod,
  PlantProtectionOperation, PlantProtectionRequest,
  ProtectionOperationType, InfestationLevel,
} from '../types/AgronomicTypes'
import { CropHistory } from '../types/CropTypes'

type Tab = 'fertilizer' | 'protection'

// ── Helpers ───────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<ApplicationMethod, string> = {
  [ApplicationMethod.BROADCAST]:  'Поверхностное',
  [ApplicationMethod.FERTIGATION]: 'Фертигация',
  [ApplicationMethod.FOLIAR]:     'Листовая',
  [ApplicationMethod.LOCALIZED]:  'Локальное',
}

const TYPE_LABELS: Record<ProtectionOperationType, string> = {
  [ProtectionOperationType.HERBICIDE]:  '🌿 Гербицид',
  [ProtectionOperationType.FUNGICIDE]:  '🍄 Фунгицид',
  [ProtectionOperationType.INSECTICIDE]:'🐛 Инсектицид',
  [ProtectionOperationType.DESICCANT]:  '🌵 Десикант',
}

const TYPE_COLORS: Record<ProtectionOperationType, string> = {
  [ProtectionOperationType.HERBICIDE]:  'var(--color-success)',
  [ProtectionOperationType.FUNGICIDE]:  '#a855f7',
  [ProtectionOperationType.INSECTICIDE]:'var(--color-warning)',
  [ProtectionOperationType.DESICCANT]:  'var(--color-danger)',
}

const INFESTATION_LABELS: Record<InfestationLevel, string> = {
  [InfestationLevel.LOW]:               'Низкая',
  [InfestationLevel.MEDIUM]:            'Средняя',
  [InfestationLevel.HIGH]:              'Высокая',
  [InfestationLevel.ECONOMIC_THRESHOLD]:'Экономический порог',
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="tabs-bar">
      <button className={`tab-btn${tab === 'fertilizer' ? ' active' : ''}`} onClick={() => setTab('fertilizer')}>
        <Beaker size={16} /> Удобрения
      </button>
      <button className={`tab-btn${tab === 'protection' ? ' active' : ''}`} onClick={() => setTab('protection')}>
        <ShieldCheck size={16} /> Защита растений
      </button>
    </div>
  )
}

// ── Fertilizer Tab ────────────────────────────────────────────────────────────

const emptyFertForm = (): FertilizerApplicationRequest => ({
  cropHistoryId: 0,
  applicationDate: new Date().toISOString().split('T')[0],
  fertilizerType: '',
})

function FertilizerTab() {
  const [histories, setHistories] = useState<CropHistory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [items, setItems] = useState<FertilizerApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FertilizerApplicationRequest>(emptyFertForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { cropHistoryService.getAll().then(setHistories).catch(() => {}) }, [])
  useEffect(() => { if (selectedId) load(selectedId) }, [selectedId])

  const load = async (id: number) => {
    setLoading(true)
    try { setItems(await fertilizerApplicationService.getByCropHistory(id)) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setForm({ ...emptyFertForm(), cropHistoryId: selectedId ?? 0 })
    setEditId(null); setShowForm(true); setError(null)
  }

  const openEdit = (item: FertilizerApplication) => {
    setForm({
      cropHistoryId: item.cropHistoryId, applicationDate: item.applicationDate,
      fertilizerType: item.fertilizerType, formulation: item.formulation,
      doseKgPerHa: item.doseKgPerHa, totalAreaHa: item.totalAreaHa,
      totalAmountKg: item.totalAmountKg, applicationMethod: item.applicationMethod,
      bbchPhase: item.bbchPhase, costPerHa: item.costPerHa, totalCost: item.totalCost,
      weatherTempC: item.weatherTempC, weatherHumidity: item.weatherHumidity,
      windSpeed: item.windSpeed, notes: item.notes,
    })
    setEditId(item.id); setShowForm(true); setError(null)
  }

  const handleSave = async () => {
    if (!form.fertilizerType) { setError('Укажите тип удобрения'); return }
    setSaving(true); setError(null)
    try {
      editId ? await fertilizerApplicationService.update(editId, form) : await fertilizerApplicationService.create(form)
      setShowForm(false); if (selectedId) load(selectedId)
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    await fertilizerApplicationService.delete(id); if (selectedId) load(selectedId)
  }

  const set = (k: keyof FertilizerApplicationRequest, v: any) =>
    setForm(f => ({ ...f, [k]: v === '' ? undefined : v }))

  return (
    <div>
      <div className="card mb-20" style={{ padding: 16, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">История посева</label>
          <select className="form-select" value={selectedId ?? ''} onChange={e => setSelectedId(Number(e.target.value) || null)}>
            <option value="">— выберите посев —</option>
            {histories.map(h => <option key={h.id} value={h.id}>{h.fieldName} — {h.cropTypeName} ({h.plantingDate?.slice(0, 10)})</option>)}
          </select>
        </div>
        {selectedId && <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Добавить</button>}
      </div>

      {showForm && (
        <div className="card mb-20" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editId ? 'Редактировать' : 'Новое внесение'}</h3>
          {error && <div className="alert alert-danger mb-12">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Дата*</label><input className="form-input" type="date" value={form.applicationDate} onChange={e => set('applicationDate', e.target.value)} /></div>
            <div><label className="form-label">Тип удобрения*</label><input className="form-input" placeholder="Карбамид, Аммофос..." value={form.fertilizerType} onChange={e => set('fertilizerType', e.target.value)} /></div>
            <div><label className="form-label">Формула (NPK)</label><input className="form-input" placeholder="46-0-0, 16-16-16..." value={form.formulation ?? ''} onChange={e => set('formulation', e.target.value)} /></div>
            <div>
              <label className="form-label">Метод внесения</label>
              <select className="form-select" value={form.applicationMethod ?? ''} onChange={e => set('applicationMethod', e.target.value || undefined)}>
                <option value="">— не указан —</option>
                {Object.values(ApplicationMethod).map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
              </select>
            </div>
            <div><label className="form-label">Доза (кг/га)</label><input className="form-input" type="number" step="0.1" value={form.doseKgPerHa ?? ''} onChange={e => set('doseKgPerHa', e.target.value)} /></div>
            <div><label className="form-label">Площадь (га)</label><input className="form-input" type="number" step="0.1" value={form.totalAreaHa ?? ''} onChange={e => set('totalAreaHa', e.target.value)} /></div>
            <div><label className="form-label">Всего кг</label><input className="form-input" type="number" step="0.1" value={form.totalAmountKg ?? ''} onChange={e => set('totalAmountKg', e.target.value)} /></div>
            <div><label className="form-label">Фаза BBCH</label><input className="form-input" type="number" min={0} max={99} value={form.bbchPhase ?? ''} onChange={e => set('bbchPhase', e.target.value)} /></div>
            <div><label className="form-label">Стоимость (руб/га)</label><input className="form-input" type="number" step="0.01" value={form.costPerHa ?? ''} onChange={e => set('costPerHa', e.target.value)} /></div>
            <div><label className="form-label">Итого (руб)</label><input className="form-input" type="number" step="0.01" value={form.totalCost ?? ''} onChange={e => set('totalCost', e.target.value)} /></div>
            <div><label className="form-label">Темп. (°C)</label><input className="form-input" type="number" step="0.1" value={form.weatherTempC ?? ''} onChange={e => set('weatherTempC', e.target.value)} /></div>
            <div><label className="form-label">Ветер (м/с)</label><input className="form-input" type="number" step="0.1" value={form.windSpeed ?? ''} onChange={e => set('windSpeed', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Примечания</label><textarea className="form-input" rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving && <Loader2 size={16} className="spin" />} Сохранить</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={32} className="spin" /></div>
      ) : !selectedId ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Beaker size={48} style={{ marginBottom: 12, opacity: 0.3 }} /><p>Выберите историю посева</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}><p>Нет записей о внесении удобрений</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Дата</th><th>Удобрение</th><th>NPK</th><th>Доза (кг/га)</th><th>Площадь (га)</th><th>Метод</th><th>BBCH</th><th>Стоимость</th><th></th></tr></thead>
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

// ── Protection Tab ────────────────────────────────────────────────────────────

const emptyProtForm = (): PlantProtectionRequest => ({
  cropHistoryId: 0,
  operationDate: new Date().toISOString().split('T')[0],
  operationType: ProtectionOperationType.HERBICIDE,
  productName: '',
})

function ProtectionTab() {
  const [histories, setHistories] = useState<CropHistory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [items, setItems] = useState<PlantProtectionOperation[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<PlantProtectionRequest>(emptyProtForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const productName = searchParams.get('productName')
    if (!productName) return
    const opTypeRaw = searchParams.get('operationType') ?? ''
    const opType = Object.values(ProtectionOperationType).includes(opTypeRaw as ProtectionOperationType)
      ? (opTypeRaw as ProtectionOperationType)
      : ProtectionOperationType.FUNGICIDE
    const phiRaw = searchParams.get('phiDays')
    const doseRaw = searchParams.get('doseLPerHa')
    setForm({
      ...emptyProtForm(),
      productName,
      operationType: opType,
      targetPest:        searchParams.get('targetPest')        ?? undefined,
      activeIngredient:  searchParams.get('activeIngredient')  ?? undefined,
      mechanismOfAction: searchParams.get('mechanismOfAction') ?? undefined,
      doseLPerHa: doseRaw ? Number(doseRaw) : undefined,
      phiDays:    phiRaw  ? Number(phiRaw)  : undefined,
      notes:      searchParams.get('notes') ?? undefined,
    })
    setShowForm(true)
    setEditId(null)
    setError(null)
    setSearchParams({ tab: 'protection' }, { replace: true })
  }, [])

  useEffect(() => { cropHistoryService.getAll().then(setHistories).catch(() => {}) }, [])
  useEffect(() => { if (selectedId) load(selectedId) }, [selectedId])

  const load = async (id: number) => {
    setLoading(true)
    try { setItems(await plantProtectionService.getByCropHistory(id)) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setForm({ ...emptyProtForm(), cropHistoryId: selectedId ?? 0 })
    setEditId(null); setShowForm(true); setError(null)
  }

  const openEdit = (item: PlantProtectionOperation) => {
    setForm({
      cropHistoryId: item.cropHistoryId, operationDate: item.operationDate,
      operationType: item.operationType, productName: item.productName,
      activeIngredient: item.activeIngredient, mechanismOfAction: item.mechanismOfAction,
      doseLPerHa: item.doseLPerHa, concentrationPercent: item.concentrationPercent,
      targetPest: item.targetPest, infestationLevel: item.infestationLevel,
      bbchPhase: item.bbchPhase, tempC: item.tempC, humidity: item.humidity,
      windSpeed: item.windSpeed, precipitationExpected: item.precipitationExpected,
      efficacyPercent: item.efficacyPercent, followUpRequired: item.followUpRequired,
      phiDays: item.phiDays, harvestAllowedAfter: item.harvestAllowedAfter,
      costPerHa: item.costPerHa, notes: item.notes,
    })
    setEditId(item.id); setShowForm(true); setError(null)
  }

  const handleSave = async () => {
    if (!form.productName) { setError('Укажите название препарата'); return }
    setSaving(true); setError(null)
    try {
      editId ? await plantProtectionService.update(editId, form) : await plantProtectionService.create(form)
      setShowForm(false); if (selectedId) load(selectedId)
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить операцию?')) return
    await plantProtectionService.delete(id); if (selectedId) load(selectedId)
  }

  const set = (k: keyof PlantProtectionRequest, v: any) =>
    setForm(f => ({ ...f, [k]: v === '' ? undefined : v }))

  return (
    <div>
      <div className="card mb-20" style={{ padding: 16, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">История посева</label>
          <select className="form-select" value={selectedId ?? ''} onChange={e => setSelectedId(Number(e.target.value) || null)}>
            <option value="">— выберите посев —</option>
            {histories.map(h => <option key={h.id} value={h.id}>{h.fieldName} — {h.cropTypeName} ({h.plantingDate?.slice(0, 10)})</option>)}
          </select>
        </div>
        {selectedId && <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Добавить обработку</button>}
      </div>

      {showForm && (
        <div className="card mb-20" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editId ? 'Редактировать' : 'Новая обработка'}</h3>
          {error && <div className="alert alert-danger mb-12">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Дата*</label><input className="form-input" type="date" value={form.operationDate} onChange={e => set('operationDate', e.target.value)} /></div>
            <div>
              <label className="form-label">Тип*</label>
              <select className="form-select" value={form.operationType} onChange={e => set('operationType', e.target.value)}>
                {Object.values(ProtectionOperationType).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label className="form-label">Препарат*</label><input className="form-input" placeholder="Гранстар, Амистар..." value={form.productName} onChange={e => set('productName', e.target.value)} /></div>
            <div><label className="form-label">Действующее вещество</label><input className="form-input" placeholder="Трибенурон-метил..." value={form.activeIngredient ?? ''} onChange={e => set('activeIngredient', e.target.value)} /></div>
            <div><label className="form-label">МОД (механизм действия)</label><input className="form-input" placeholder="ALS-ингибитор..." value={form.mechanismOfAction ?? ''} onChange={e => set('mechanismOfAction', e.target.value)} /></div>
            <div><label className="form-label">Объект обработки</label><input className="form-input" placeholder="Марь белая, Бурая ржавчина..." value={form.targetPest ?? ''} onChange={e => set('targetPest', e.target.value)} /></div>
            <div>
              <label className="form-label">Уровень заражения</label>
              <select className="form-select" value={form.infestationLevel ?? ''} onChange={e => set('infestationLevel', e.target.value || undefined)}>
                <option value="">— не указан —</option>
                {Object.values(InfestationLevel).map(l => <option key={l} value={l}>{INFESTATION_LABELS[l]}</option>)}
              </select>
            </div>
            <div><label className="form-label">Фаза BBCH</label><input className="form-input" type="number" min={0} max={99} value={form.bbchPhase ?? ''} onChange={e => set('bbchPhase', e.target.value)} /></div>
            <div><label className="form-label">Норма расхода (л/га)</label><input className="form-input" type="number" step="0.01" value={form.doseLPerHa ?? ''} onChange={e => set('doseLPerHa', e.target.value)} /></div>
            <div><label className="form-label">Эффективность (%)</label><input className="form-input" type="number" min={0} max={100} value={form.efficacyPercent ?? ''} onChange={e => set('efficacyPercent', e.target.value)} /></div>
            <div><label className="form-label">ОЖЗ (дней)</label><input className="form-input" type="number" value={form.phiDays ?? ''} onChange={e => set('phiDays', e.target.value)} placeholder="Срок ожидания" /></div>
            <div><label className="form-label">Уборка не ранее</label><input className="form-input" type="date" value={form.harvestAllowedAfter ?? ''} onChange={e => set('harvestAllowedAfter', e.target.value)} /></div>
            <div><label className="form-label">Темп. (°C)</label><input className="form-input" type="number" step="0.1" value={form.tempC ?? ''} onChange={e => set('tempC', e.target.value)} /></div>
            <div><label className="form-label">Ветер (м/с)</label><input className="form-input" type="number" step="0.1" value={form.windSpeed ?? ''} onChange={e => set('windSpeed', e.target.value)} /></div>
            <div><label className="form-label">Стоимость (руб/га)</label><input className="form-input" type="number" step="0.01" value={form.costPerHa ?? ''} onChange={e => set('costPerHa', e.target.value)} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="precipExpected" checked={form.precipitationExpected ?? false} onChange={e => set('precipitationExpected', e.target.checked)} />
              <label htmlFor="precipExpected" className="form-label" style={{ margin: 0 }}>Ожидались осадки</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="followUp" checked={form.followUpRequired ?? false} onChange={e => set('followUpRequired', e.target.checked)} />
              <label htmlFor="followUp" className="form-label" style={{ margin: 0 }}>Нужна повторная обработка</label>
            </div>
            <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Примечания</label><textarea className="form-input" rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving && <Loader2 size={16} className="spin" />} Сохранить</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={32} className="spin" /></div>
      ) : !selectedId ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <ShieldCheck size={48} style={{ marginBottom: 12, opacity: 0.3 }} /><p>Выберите историю посева</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}><p>Нет записей об обработках</p></div>
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
                      {item.activeIngredient && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 6 }}>({item.activeIngredient})</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {item.operationDate}
                      {item.targetPest && <span style={{ marginLeft: 8 }}>· {item.targetPest}</span>}
                      {item.bbchPhase !== undefined && <span style={{ marginLeft: 8 }}>· BBCH {item.bbchPhase}</span>}
                      {item.doseLPerHa !== undefined && <span style={{ marginLeft: 8 }}>· {item.doseLPerHa} л/га</span>}
                      {item.efficacyPercent !== undefined && <span style={{ marginLeft: 8 }}>· Эфф. {item.efficacyPercent}%</span>}
                    </div>
                    {item.phiDays !== undefined && (
                      <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 2 }}>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = tabParam === 'protection' ? 'protection' : 'fertilizer'

  const setTab = (t: Tab) => setSearchParams(t === 'fertilizer' ? {} : { tab: t })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Журнал операций</h1>
          <p className="page-subtitle">Фактические внесения удобрений и обработки по посевам</p>
        </div>
      </div>
      <TabBar tab={tab} setTab={setTab} />
      <div style={{ marginTop: 20 }}>
        {tab === 'fertilizer'  && <FertilizerTab />}
        {tab === 'protection'  && <ProtectionTab />}
      </div>
    </div>
  )
}
