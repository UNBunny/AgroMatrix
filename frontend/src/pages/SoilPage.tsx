import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sprout, FlaskConical, Bug, Loader2, Plus, Pencil, Trash2, TestTube, AlertTriangle } from 'lucide-react'
import { agroService, CropRecommendRequest, CropRecommendResponse, FertilizerRequest, FertilizerResponse, PesticideRequest, PesticideResponse } from '../services/mlService'
import { soilHorizonService } from '../services/soilHorizonService'
import { soilService, SoilData } from '../services/soilService'
import { fieldService } from '../services/fieldService'
import { Field } from '../types/Field'
import { SoilHorizon, SoilHorizonRequest } from '../types/AgronomicTypes'

type Tab = 'ml' | 'lab'

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'ml',  label: 'ML-рекомендация', icon: <Sprout size={16} /> },
    { key: 'lab', label: 'Лабораторный анализ', icon: <TestTube size={16} /> },
  ]
  return (
    <div className="tabs-bar">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`tab-btn${tab === t.key ? ' active' : ''}`}
          onClick={() => setTab(t.key)}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── ML Tab ────────────────────────────────────────────────────────────────────

type MlSubTab = 'crop' | 'fertilizer' | 'pesticide'

function MlTab() {
  const [sub, setSub] = useState<MlSubTab>('crop')
  const [soilData, setSoilData] = useState<SoilData | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)

  useEffect(() => { fieldService.getAllFields().then(setFields).catch(() => {}) }, [])

  useEffect(() => {
    if (!selectedFieldId) { setSoilData(null); return }
    soilService.get(selectedFieldId).then(setSoilData).catch(() => setSoilData(null))
  }, [selectedFieldId])

  return (
    <div>
      <div className="card mb-20" style={{ display: 'flex', gap: 0, padding: 0, overflow: 'hidden' }}>
        {([
          { key: 'crop' as MlSubTab,       label: 'Культура',  icon: <Sprout size={15} /> },
          { key: 'fertilizer' as MlSubTab, label: 'Удобрение', icon: <FlaskConical size={15} /> },
          { key: 'pesticide' as MlSubTab,  label: 'Пестицид',  icon: <Bug size={15} /> },
        ]).map(t => (
          <button
            key={t.key}
            className={`btn ${sub === t.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, gap: 6, fontSize: 13 }}
            onClick={() => setSub(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Выбор поля для получения данных почвы */}
      <div className="card mb-20" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Поле (опционально):</label>
        <select
          className="input"
          style={{ flex: 1, minWidth: 180, maxWidth: 320 }}
          value={selectedFieldId ?? ''}
          onChange={e => setSelectedFieldId(Number(e.target.value) || null)}
        >
          <option value="">— не выбрано —</option>
          {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
        </select>
        {soilData && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Источник: <strong>{soilData.source ?? '—'}</strong>
            {soilData.confidence !== null && ` · достоверность ${Math.round(soilData.confidence * 100)}%`}
          </span>
        )}
      </div>

      {/* Предупреждение об автоматических данных SoilGrids */}
      {soilData?.source === 'AUTO' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
          background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.35)',
          borderRadius: 'var(--border-radius)', marginBottom: 16, fontSize: 13, color: '#b7770d',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Данные из SoilGrids (~250 м точность).</strong>{' '}
            Автоматически загруженные значения N/P/K могут отличаться от реальных показателей вашего поля.
            Для точных рекомендаций загрузите лабораторный анализ на вкладке «Лабораторный анализ».
          </span>
        </div>
      )}

      {sub === 'crop'       && <CropTab />}
      {sub === 'fertilizer' && <FertilizerTab />}
      {sub === 'pesticide'  && <PesticideTab />}
    </div>
  )
}

function CropTab() {
  const [form, setForm] = useState<CropRecommendRequest>({
    N: 80, P: 40, K: 30, temperature: 22, humidity: 65, ph: 6.5, rainfall: 100,
  })
  const [result, setResult] = useState<CropRecommendResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try { setLoading(true); setError(null); setResult(await agroService.recommendCrop(form)) }
    catch (e: any) { setError(e?.message || 'Ошибка') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Параметры почвы и климата</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {([
            { key: 'N', label: 'Азот (N) кг/га', min: 0, max: 200 },
            { key: 'P', label: 'Фосфор (P) кг/га', min: 0, max: 200 },
            { key: 'K', label: 'Калий (K) кг/га', min: 0, max: 200 },
            { key: 'temperature', label: 'Температура °C', min: -10, max: 50 },
            { key: 'humidity', label: 'Влажность %', min: 0, max: 100 },
            { key: 'ph', label: 'pH почвы', min: 3, max: 10, step: 0.1 },
            { key: 'rainfall', label: 'Осадки мм/сез', min: 0, max: 500 },
          ] as const).map(f => (
            <div key={f.key}>
              <label className="form-label">{f.label}</label>
              <input
                type="number" className="form-input"
                value={(form as any)[f.key]}
                onChange={e => setForm({ ...form, [f.key]: Number(e.target.value) })}
                min={f.min} max={f.max} step={(f as any).step ?? 1}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Sprout size={16} />} Подобрать культуру
        </button>
      </div>
      {error && <div className="card card-padding mb-20" style={{ color: 'var(--color-danger)' }}>{error}</div>}
      {result && (
        <div className="card card-padding mb-20">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🌱</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{result.recommended_crop}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Уверенность: {(result.confidence * 100).toFixed(0)}%
            </div>
          </div>
          {result.top3?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Топ-3 варианта:</div>
              {result.top3.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>{i + 1}. {item.crop}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{(item.probability * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function FertilizerTab() {
  const [form, setForm] = useState<FertilizerRequest>({ crop_type: 'spring_wheat', soil_type: 'chernozem', deficiency_level: 'nitrogen' })
  const [result, setResult] = useState<FertilizerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try { setLoading(true); setError(null); setResult(await agroService.recommendFertilizer(form)) }
    catch (e: any) { setError(e?.message || 'Ошибка') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Параметры</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label className="form-label">Культура</label>
            <select className="form-select" value={form.crop_type} onChange={e => setForm({ ...form, crop_type: e.target.value })}>
              {[
                { v: 'spring_wheat', l: 'Пшеница яровая' }, { v: 'winter_wheat', l: 'Пшеница озимая' },
                { v: 'spring_barley', l: 'Ячмень яровой' }, { v: 'corn', l: 'Кукуруза' },
                { v: 'sunflower', l: 'Подсолнечник' }, { v: 'soybean', l: 'Соя' },
                { v: 'rapeseed', l: 'Рапс' }, { v: 'peas', l: 'Горох' },
              ].map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Тип почвы</label>
            <select className="form-select" value={form.soil_type} onChange={e => setForm({ ...form, soil_type: e.target.value as any })}>
              {[{ v: 'chernozem', l: 'Чернозём' }, { v: 'loamy', l: 'Суглинок' }, { v: 'solonetz', l: 'Солонцеватая' }].map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Дефицит</label>
            <select className="form-select" value={form.deficiency_level} onChange={e => setForm({ ...form, deficiency_level: e.target.value as any })}>
              {[{ v: 'nitrogen', l: 'Азот (N)' }, { v: 'phosphorus', l: 'Фосфор (P)' }, { v: 'potassium', l: 'Калий (K)' }].map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <FlaskConical size={16} />} Подобрать удобрение
        </button>
      </div>
      {error && <div className="card card-padding mb-20" style={{ color: 'var(--color-danger)' }}>{error}</div>}
      {result && (
        <div className="card card-padding mb-20" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🧪</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{result.recommended_fertilizer}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Уверенность: {(result.confidence * 100).toFixed(0)}%</div>
        </div>
      )}
    </>
  )
}

function PesticideTab() {
  const [form, setForm] = useState<PesticideRequest>({ crop: 'spring_wheat', pest_type: 'aphid', intensity: 'medium' })
  const [result, setResult] = useState<PesticideResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try { setLoading(true); setError(null); setResult(await agroService.recommendPesticide(form)) }
    catch (e: any) { setError(e?.message || 'Ошибка') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Параметры</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label className="form-label">Культура</label>
            <select className="form-select" value={form.crop} onChange={e => setForm({ ...form, crop: e.target.value })}>
              {[
                { v: 'spring_wheat', l: 'Пшеница яровая' }, { v: 'winter_wheat', l: 'Пшеница озимая' },
                { v: 'spring_barley', l: 'Ячмень яровой' }, { v: 'corn', l: 'Кукуруза' },
                { v: 'sunflower', l: 'Подсолнечник' }, { v: 'soybean', l: 'Соя' },
                { v: 'rapeseed', l: 'Рапс' }, { v: 'peas', l: 'Горох' },
              ].map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Тип вредителя</label>
            <select className="form-select" value={form.pest_type} onChange={e => setForm({ ...form, pest_type: e.target.value as any })}>
              {[
                { v: 'aphid', l: 'Тля' }, { v: 'sunn_pest', l: 'Клоп-черепашка' },
                { v: 'cutworm', l: 'Совка' }, { v: 'beetle', l: 'Жужелица/пьявица' },
                { v: 'thrips', l: 'Трипс' }, { v: 'weevil', l: 'Долгоносик' }, { v: 'moth', l: 'Мотылёк' },
              ].map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Интенсивность</label>
            <select className="form-select" value={form.intensity} onChange={e => setForm({ ...form, intensity: e.target.value as any })}>
              {[{ v: 'low', l: 'Низкая' }, { v: 'medium', l: 'Средняя' }, { v: 'high', l: 'Высокая' }].map(i => <option key={i.v} value={i.v}>{i.l}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Bug size={16} />} Подобрать пестицид
        </button>
      </div>
      {error && <div className="card card-padding mb-20" style={{ color: 'var(--color-danger)' }}>{error}</div>}
      {result && (
        <div className="card card-padding mb-20" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🧬</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{result.recommended_pesticide}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Уверенность: {(result.confidence * 100).toFixed(0)}%</div>
          {result.active_ingredient && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Действующее вещество: {result.active_ingredient}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Lab Tab (Soil Horizons) ───────────────────────────────────────────────────

const emptyHorizonForm = (): SoilHorizonRequest => ({
  fieldId: 0, depthFromCm: 0, depthToCm: 20,
  nitrogenN: undefined, phosphorusP: undefined, potassiumK: undefined,
  phLevel: undefined, bulkDensity: undefined, organicMatter: undefined,
  samplingDate: undefined, labProtocol: '', notes: '',
})

function LabTab() {
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)
  const [horizons, setHorizons] = useState<SoilHorizon[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<SoilHorizonRequest>(emptyHorizonForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fieldService.getAllFields().then(setFields).catch(() => {}) }, [])
  useEffect(() => { if (selectedFieldId) loadHorizons(selectedFieldId) }, [selectedFieldId])

  const loadHorizons = async (fieldId: number) => {
    setLoading(true)
    try { setHorizons(await soilHorizonService.getByField(fieldId)) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setForm({ ...emptyHorizonForm(), fieldId: selectedFieldId ?? 0 })
    setEditId(null); setShowForm(true); setError(null)
  }

  const openEdit = (h: SoilHorizon) => {
    setForm({
      fieldId: h.fieldId, depthFromCm: h.depthFromCm, depthToCm: h.depthToCm,
      nitrogenN: h.nitrogenN, phosphorusP: h.phosphorusP, potassiumK: h.potassiumK,
      phLevel: h.phLevel, bulkDensity: h.bulkDensity, organicMatter: h.organicMatter,
      samplingDate: h.samplingDate, labProtocol: h.labProtocol, notes: h.notes,
    })
    setEditId(h.id); setShowForm(true); setError(null)
  }

  const handleSave = async () => {
    if (!form.fieldId || form.depthFromCm === undefined || !form.depthToCm) {
      setError('Заполните обязательные поля'); return
    }
    setSaving(true); setError(null)
    try {
      editId ? await soilHorizonService.update(editId, form) : await soilHorizonService.create(form)
      setShowForm(false)
      if (selectedFieldId) loadHorizons(selectedFieldId)
    } catch (e: any) { setError(e?.response?.data?.message ?? 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить горизонт?')) return
    await soilHorizonService.delete(id)
    if (selectedFieldId) loadHorizons(selectedFieldId)
  }

  const set = (k: keyof SoilHorizonRequest, v: any) => setForm(f => ({ ...f, [k]: v === '' ? undefined : v }))

  return (
    <div>
      <div className="alert alert-info mb-20" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '10px 14px', background: 'var(--color-info-light)', borderRadius: 'var(--border-radius)', color: 'var(--color-info)', border: '1px solid #b3d4f0' }}>
        <FlaskConical size={16} />
        Лабораторные данные по горизонтам приоритетнее автоматических данных SoilGrids при формировании рекомендаций.
      </div>

      <div className="card mb-20" style={{ padding: 16, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">Поле</label>
          <select className="form-select" value={selectedFieldId ?? ''} onChange={e => setSelectedFieldId(Number(e.target.value) || null)}>
            <option value="">— выберите поле —</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
          </select>
        </div>
        {selectedFieldId && (
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Добавить горизонт</button>
        )}
      </div>

      {showForm && (
        <div className="card mb-20" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editId ? 'Редактировать горизонт' : 'Новый горизонт'}</h3>
          {error && <div className="alert alert-danger mb-12">{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Глубина от (см)*</label><input className="form-input" type="number" value={form.depthFromCm ?? ''} onChange={e => set('depthFromCm', Number(e.target.value))} /></div>
            <div><label className="form-label">Глубина до (см)*</label><input className="form-input" type="number" value={form.depthToCm ?? ''} onChange={e => set('depthToCm', Number(e.target.value))} /></div>
            <div><label className="form-label">Азот N (мг/кг)</label><input className="form-input" type="number" step="0.01" value={form.nitrogenN ?? ''} onChange={e => set('nitrogenN', e.target.value)} /></div>
            <div><label className="form-label">Фосфор P (мг/кг)</label><input className="form-input" type="number" step="0.01" value={form.phosphorusP ?? ''} onChange={e => set('phosphorusP', e.target.value)} /></div>
            <div><label className="form-label">Калий K (мг/кг)</label><input className="form-input" type="number" step="0.01" value={form.potassiumK ?? ''} onChange={e => set('potassiumK', e.target.value)} /></div>
            <div><label className="form-label">pH</label><input className="form-input" type="number" step="0.1" min="0" max="14" value={form.phLevel ?? ''} onChange={e => set('phLevel', e.target.value)} /></div>
            <div><label className="form-label">Плотность (г/см³)</label><input className="form-input" type="number" step="0.001" value={form.bulkDensity ?? ''} onChange={e => set('bulkDensity', e.target.value)} /></div>
            <div><label className="form-label">Орг. вещество (%)</label><input className="form-input" type="number" step="0.01" value={form.organicMatter ?? ''} onChange={e => set('organicMatter', e.target.value)} /></div>
            <div><label className="form-label">Дата отбора</label><input className="form-input" type="date" value={form.samplingDate ?? ''} onChange={e => set('samplingDate', e.target.value)} /></div>
            <div><label className="form-label">Метод анализа</label><input className="form-input" placeholder="Кирсанов, Мачигин..." value={form.labProtocol ?? ''} onChange={e => set('labProtocol', e.target.value)} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Примечания</label><textarea className="form-input" rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
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
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <FlaskConical size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Выберите поле для просмотра горизонтов</p>
        </div>
      ) : horizons.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p>Нет данных. Добавьте лабораторный анализ почвы.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {horizons.map(h => (
            <div key={h.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="badge badge-info" style={{ marginRight: 8 }}>{h.depthFromCm}–{h.depthToCm} см</span>
                  {h.samplingDate && <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Отбор: {h.samplingDate}</span>}
                  {h.labProtocol && <span style={{ color: 'var(--color-text-muted)', fontSize: 13, marginLeft: 8 }}>({h.labProtocol})</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(h)}><Pencil size={14} /></button>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(h.id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginTop: 12 }}>
                {h.nitrogenN    !== undefined && <HorizonMetric label="N (мг/кг)"        value={h.nitrogenN} />}
                {h.phosphorusP  !== undefined && <HorizonMetric label="P (мг/кг)"        value={h.phosphorusP} />}
                {h.potassiumK   !== undefined && <HorizonMetric label="K (мг/кг)"        value={h.potassiumK} />}
                {h.phLevel      !== undefined && <HorizonMetric label="pH"               value={h.phLevel} />}
                {h.bulkDensity  !== undefined && <HorizonMetric label="Плотность (г/см³)" value={h.bulkDensity} />}
                {h.organicMatter !== undefined && <HorizonMetric label="Орг. вещество (%)" value={h.organicMatter} />}
              </div>
              {h.notes && <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>{h.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HorizonMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 6, padding: '6px 10px' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{value}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SoilPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = tabParam === 'lab' ? 'lab' : 'ml'

  const setTab = (t: Tab) => setSearchParams(t === 'ml' ? {} : { tab: t })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Почва</h1>
          <p className="page-subtitle">ML-рекомендации по N/P/K и лабораторный анализ по горизонтам</p>
        </div>
      </div>
      <TabBar tab={tab} setTab={setTab} />
      <div style={{ marginTop: 20 }}>
        {tab === 'ml'  && <MlTab />}
        {tab === 'lab' && <LabTab />}
      </div>
    </div>
  )
}
