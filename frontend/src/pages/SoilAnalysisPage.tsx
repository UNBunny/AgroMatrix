import { useState } from 'react'
import { Sprout, FlaskConical, Bug, Loader2 } from 'lucide-react'
import { agroService, CropRecommendRequest, CropRecommendResponse, FertilizerRequest, FertilizerResponse, PesticideRequest, PesticideResponse } from '../services/mlService'

type Tab = 'crop' | 'fertilizer' | 'pesticide'

export default function SoilAnalysisPage() {
  const [tab, setTab] = useState<Tab>('crop')

  return (
    <div>
      <div className="page-header-bar">
        <h1 className="page-title">Агрохимические рекомендации</h1>
      </div>

      {/* Табы */}
      <div className="card mb-20" style={{ display: 'flex', borderBottom: 'none' }}>
        {([
          { key: 'crop' as Tab, label: 'Культура', icon: <Sprout size={16} /> },
          { key: 'fertilizer' as Tab, label: 'Удобрение', icon: <FlaskConical size={16} /> },
          { key: 'pesticide' as Tab, label: 'Пестицид', icon: <Bug size={16} /> },
        ]).map(t => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, borderRadius: 0, gap: 6 }}
            onClick={() => setTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'crop' && <CropTab />}
      {tab === 'fertilizer' && <FertilizerTab />}
      {tab === 'pesticide' && <PesticideTab />}
    </div>
  )
}

// ── Crop recommendation ──────────────────────────────────────────────────────

function CropTab() {
  const [form, setForm] = useState<CropRecommendRequest>({
    N: 80, P: 40, K: 30, temperature: 22, humidity: 65, ph: 6.5, rainfall: 100,
  })
  const [result, setResult] = useState<CropRecommendResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try {
      setLoading(true); setError(null)
      const data = await agroService.recommendCrop(form)
      setResult(data)
    } catch (e: any) {
      setError(e?.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
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
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
                {f.label}
              </label>
              <input
                type="number"
                className="input"
                value={(form as any)[f.key]}
                onChange={e => setForm({ ...form, [f.key]: Number(e.target.value) })}
                min={f.min}
                max={f.max}
                step={(f as any).step ?? 1}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Sprout size={16} />}
          Подобрать культуру
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
          {result.top3 && result.top3.length > 0 && (
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

// ── Fertilizer recommendation ────────────────────────────────────────────────

function FertilizerTab() {
  const [form, setForm] = useState<FertilizerRequest>({
    crop_type: 'spring_wheat', soil_type: 'chernozem', deficiency_level: 'nitrogen',
  })
  const [result, setResult] = useState<FertilizerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try {
      setLoading(true); setError(null)
      const data = await agroService.recommendFertilizer(form)
      setResult(data)
    } catch (e: any) {
      setError(e?.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Параметры</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Культура</label>
            <select className="input" value={form.crop_type} onChange={e => setForm({ ...form, crop_type: e.target.value })}>
              {[
                { v: 'spring_wheat', l: 'Пшеница яровая' }, { v: 'winter_wheat', l: 'Пшеница озимая' },
                { v: 'spring_barley', l: 'Ячмень яровой' }, { v: 'corn', l: 'Кукуруза' },
                { v: 'sunflower', l: 'Подсолнечник' }, { v: 'soybean', l: 'Соя' },
                { v: 'rapeseed', l: 'Рапс' }, { v: 'peas', l: 'Горох' },
                { v: 'flax', l: 'Лён' }, { v: 'buckwheat', l: 'Гречиха' },
                { v: 'red_lentil', l: 'Чечевица красная' }, { v: 'green_lentil', l: 'Чечевица зелёная' },
                { v: 'black_lentil', l: 'Чечевица чёрная' },
              ].map(c => (
                <option key={c.v} value={c.v}>{c.l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Тип почвы</label>
            <select className="input" value={form.soil_type} onChange={e => setForm({ ...form, soil_type: e.target.value as any })}>
              {[{ v: 'chernozem', l: 'Чернозём' }, { v: 'loamy', l: 'Суглинок' }, { v: 'solonetz', l: 'Солонцеватая' }].map(s => (
                <option key={s.v} value={s.v}>{s.l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Дефицит</label>
            <select className="input" value={form.deficiency_level} onChange={e => setForm({ ...form, deficiency_level: e.target.value as any })}>
              {['nitrogen', 'phosphorus', 'potassium'].map(d => (
                <option key={d} value={d}>{d === 'nitrogen' ? 'Азот (N)' : d === 'phosphorus' ? 'Фосфор (P)' : 'Калий (K)'}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <FlaskConical size={16} />}
          Подобрать удобрение
        </button>
      </div>

      {error && <div className="card card-padding mb-20" style={{ color: 'var(--color-danger)' }}>{error}</div>}

      {result && (
        <div className="card card-padding mb-20" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🧪</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{result.recommended_fertilizer}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Уверенность: {(result.confidence * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </>
  )
}

// ── Pesticide recommendation ─────────────────────────────────────────────────

function PesticideTab() {
  const [form, setForm] = useState<PesticideRequest>({
    crop: 'spring_wheat', pest_type: 'aphid', intensity: 'medium',
  })
  const [result, setResult] = useState<PesticideResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    try {
      setLoading(true); setError(null)
      const data = await agroService.recommendPesticide(form)
      setResult(data)
    } catch (e: any) {
      setError(e?.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Параметры</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Культура</label>
            <select className="input" value={form.crop} onChange={e => setForm({ ...form, crop: e.target.value })}>
              {[
                { v: 'spring_wheat', l: 'Пшеница яровая' }, { v: 'winter_wheat', l: 'Пшеница озимая' },
                { v: 'spring_barley', l: 'Ячмень яровой' }, { v: 'corn', l: 'Кукуруза' },
                { v: 'sunflower', l: 'Подсолнечник' }, { v: 'soybean', l: 'Соя' },
                { v: 'rapeseed', l: 'Рапс' }, { v: 'peas', l: 'Горох' },
                { v: 'flax', l: 'Лён' }, { v: 'buckwheat', l: 'Гречиха' },
                { v: 'red_lentil', l: 'Чечевица красная' }, { v: 'green_lentil', l: 'Чечевица зелёная' },
                { v: 'black_lentil', l: 'Чечевица чёрная' },
              ].map(c => (
                <option key={c.v} value={c.v}>{c.l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Тип вредителя</label>
            <select className="input" value={form.pest_type} onChange={e => setForm({ ...form, pest_type: e.target.value as any })}>
              {[
                { v: 'aphid', l: 'Тля' }, { v: 'sunn_pest', l: 'Клоп-черепашка' },
                { v: 'cutworm', l: 'Совка' }, { v: 'beetle', l: 'Жужелица/пьявица' },
                { v: 'thrips', l: 'Трипс' }, { v: 'weevil', l: 'Долгоносик' },
                { v: 'moth', l: 'Мотылёк' },
              ].map(p => (
                <option key={p.v} value={p.v}>{p.l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Интенсивность</label>
            <select className="input" value={form.intensity} onChange={e => setForm({ ...form, intensity: e.target.value as any })}>
              {[
                { v: 'low', l: 'Низкая' }, { v: 'medium', l: 'Средняя' }, { v: 'high', l: 'Высокая' },
              ].map(i => (
                <option key={i.v} value={i.v}>{i.l}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Bug size={16} />}
          Подобрать пестицид
        </button>
      </div>

      {error && <div className="card card-padding mb-20" style={{ color: 'var(--color-danger)' }}>{error}</div>}

      {result && (
        <div className="card card-padding mb-20" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🧬</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{result.recommended_pesticide}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Уверенность: {(result.confidence * 100).toFixed(0)}%
          </div>
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
