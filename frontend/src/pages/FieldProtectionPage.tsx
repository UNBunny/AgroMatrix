import { useState, useEffect } from 'react'
import { ShieldAlert, FlaskConical, Bug, Thermometer, Droplets, Sun, Loader2, Info, Sprout, AlertTriangle } from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { soilService } from '../services/soilService'
import { recommendationService, DiseaseRiskResponse } from '../services/recommendationService'
import { agroService, FertilizerRequest, FertilizerResponse, PesticideRequest, PesticideResponse } from '../services/mlService'
import { Field } from '../types/Field'
import ProtectionCatalogTab from '../components/ProtectionCatalogTab'
import { getSoilTextureLabel } from '../utils/fieldUtils'

// ── helpers ──────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#e74c3c', HIGH: '#e67e22', MEDIUM: '#f1c40f', LOW: '#27ae60',
}
const RISK_LABELS: Record<string, string> = {
  CRITICAL: 'Критический', HIGH: 'Высокий', MEDIUM: 'Средний', LOW: 'Низкий',
}

const CROP_RU_TO_API: Record<string, string> = {
  'Пшеница яровая': 'пшеница яровая', 'Пшеница озимая': 'пшеница озимая',
  'Ячмень яровой': 'ячмень', 'Ячмень': 'ячмень', 'Кукуруза': 'кукуруза',
  'Подсолнечник': 'подсолнечник', 'Соя': 'соя', 'Рапс': 'рапс',
  'Горох': 'горох', 'Гречиха': 'гречиха', 'Лён масличный': 'лён',
  'Лён': 'лён', 'Рожь': 'рожь', 'Овёс': 'овёс', 'Просо': 'просо',
}
const CROP_RU_TO_ML: Record<string, string> = {
  'Пшеница яровая': 'spring_wheat', 'Пшеница озимая': 'winter_wheat',
  'Ячмень яровой': 'spring_barley', 'Ячмень': 'spring_barley',
  'Кукуруза': 'corn', 'Подсолнечник': 'sunflower', 'Соя': 'soybean',
  'Рапс': 'rapeseed', 'Горох': 'peas', 'Гречиха': 'buckwheat',
  'Лён масличный': 'flax', 'Лён': 'flax', 'Рожь': 'rye', 'Овёс': 'oat', 'Просо': 'millet',
}
const ALL_CROPS = [
  'Пшеница яровая', 'Пшеница озимая', 'Ячмень яровой', 'Кукуруза',
  'Подсолнечник', 'Соя', 'Рапс', 'Горох', 'Гречиха', 'Лён масличный', 'Рожь', 'Овёс', 'Просо',
]

function RiskBadge({ level }: { level: string }) {
  return (
    <span className="badge" style={{ background: RISK_COLORS[level] ?? '#999', color: '#fff', fontWeight: 600, fontSize: 11, padding: '3px 10px' }}>
      {RISK_LABELS[level] ?? level}
    </span>
  )
}

// ── Tab: Риски болезней ───────────────────────────────────────────────────────

function RisksTab({ fieldId, cropRu }: { fieldId: number; cropRu: string }) {
  const [result, setResult] = useState<DiseaseRiskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [crop, setCrop] = useState(CROP_RU_TO_API[cropRu] ?? 'пшеница')

  useEffect(() => {
    setCrop(CROP_RU_TO_API[cropRu] ?? 'пшеница')
  }, [cropRu])

  const fetchRisk = async () => {
    try {
      setLoading(true); setError(null); setResult(null)
      const data = await recommendationService.getDiseaseRisk(fieldId, crop)
      setResult(data)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка оценки рисков')
    } finally { setLoading(false) }
  }

  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Культура</label>
            <select className="input" value={crop} onChange={e => setCrop(e.target.value)}>
              {ALL_CROPS.map(c => (
                <option key={c} value={CROP_RU_TO_API[c] ?? c.toLowerCase()}>{c}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={fetchRisk} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <ShieldAlert size={16} />}
            Оценить риски
          </button>
        </div>
      </div>

      {error && (
        <div className="card card-padding mb-20" style={{ borderLeft: '3px solid var(--color-danger)', color: 'var(--color-danger)' }}>{error}</div>
      )}

      {result && (
        <>
          {/* Общий уровень */}
          <div className="card card-padding mb-20" style={{ borderLeft: `4px solid ${RISK_COLORS[result.overallRiskLevel]}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ShieldAlert size={22} color={RISK_COLORS[result.overallRiskLevel]} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Общий уровень риска</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  <RiskBadge level={result.overallRiskLevel} />
                  <span style={{ marginLeft: 8 }}>({(result.overallRiskScore * 100).toFixed(0)}%)</span>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>
                {result.dataSource === 'FORECAST' ? '📡 Прогноз' : result.dataSource === 'HISTORICAL' ? '📊 Исторические' : '⚠️ Приблизительно'}
              </div>
            </div>
          </div>

          {/* Метрики погоды */}
          {(result.avgTemp !== null || result.sumPrecipitation !== null || result.gtk !== null || result.heatStressDays !== null) && (
            <div className="grid-4 mb-20">
              {result.avgTemp !== null && (
                <div className="card card-padding" style={{ textAlign: 'center' }}>
                  <Thermometer size={18} color="#e67e22" />
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{result.avgTemp.toFixed(1)}°C</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Ср. температура</div>
                </div>
              )}
              {result.sumPrecipitation !== null && (
                <div className="card card-padding" style={{ textAlign: 'center' }}>
                  <Droplets size={18} color="#3498db" />
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{result.sumPrecipitation.toFixed(1)} мм</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Осадки</div>
                </div>
              )}
              {result.gtk !== null && (
                <div className="card card-padding" style={{ textAlign: 'center' }}>
                  <Droplets size={18} color="#2ecc71" />
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{result.gtk.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>ГТК</div>
                </div>
              )}
              {result.heatStressDays !== null && (
                <div className="card card-padding" style={{ textAlign: 'center' }}>
                  <Sun size={18} color="#e74c3c" />
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{result.heatStressDays}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Дней жары</div>
                </div>
              )}
            </div>
          )}

          {/* Абиотические риски */}
          <div className="grid-3 mb-20">
            {[
              { title: 'Засуха', icon: <Droplets size={15} />, level: result.droughtRisk, score: result.droughtScore, desc: result.droughtDescription },
              { title: 'Заморозки', icon: <Thermometer size={15} />, level: result.frostRisk, score: result.frostScore, desc: result.frostDescription },
              { title: 'Тепловой стресс', icon: <Sun size={15} />, level: result.heatStressRisk, score: result.heatStressScore, desc: result.heatStressDescription },
            ].map(r => (
              <div key={r.title} className="card card-padding" style={{ borderLeft: `3px solid ${RISK_COLORS[r.level]}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {r.icon}<span style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</span>
                  <div style={{ marginLeft: 'auto' }}><RiskBadge level={r.level} /></div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>{r.desc}</div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.score * 100}%`, background: RISK_COLORS[r.level], borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Болезни */}
          {result.diseaseRisks.length > 0 && (
            <div className="card mb-20">
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bug size={16} color="#e74c3c" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Риски болезней</span>
                <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{result.diseaseRisks.length}</span>
              </div>
              {result.diseaseRisks.map(d => (
                <div key={d.ruleId} style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{d.diseaseName}</span>
                    <RiskBadge level={d.riskLevel} />
                    {d.urgencyDays && (
                      <span style={{ fontSize: 11, color: 'var(--color-danger)', marginLeft: 8 }}>⏰ {d.urgencyDays} дн.</span>
                    )}
                  </div>
                  {d.ruleDescription && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{d.ruleDescription}</div>
                  )}
                  {d.triggeredConditions.length > 0 && (
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      {d.triggeredConditions.map((c, i) => (
                        <div key={i} style={{ padding: '2px 0', color: '#e67e22' }}>• {c}</div>
                      ))}
                    </div>
                  )}
                  {(d.preventionAdvice || d.treatmentAdvice) && (
                    <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {d.preventionAdvice && (
                        <div style={{ background: '#eaf7ee', borderRadius: 6, padding: '6px 10px', color: '#1e8449' }}>
                          💊 <strong>Профилактика:</strong> {d.preventionAdvice}
                        </div>
                      )}
                      {d.treatmentAdvice && (
                        <div style={{ background: '#fdf2e9', borderRadius: 6, padding: '6px 10px', color: '#935116' }}>
                          🔬 <strong>Лечение:</strong> {d.treatmentAdvice}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.diseaseRisks.length === 0 && (
            <div className="card card-padding mb-20" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#27ae60' }}>
              <Info size={16} /> Болезней с высоким риском не обнаружено
            </div>
          )}

          {/* Рекомендации */}
          {result.recommendations.length > 0 && (
            <div className="card card-padding mb-20">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Info size={16} color="#3498db" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Рекомендации</span>
              </div>
              {result.recommendations.map((rec, i) => (
                <div key={i} style={{ fontSize: 13, padding: '5px 0', lineHeight: 1.6 }}>{rec}</div>
              ))}
            </div>
          )}
        </>
      )}

      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
          <ShieldAlert size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>Нажмите «Оценить риски» для анализа</div>
        </div>
      )}
    </>
  )
}

// ── Tab: Удобрения ────────────────────────────────────────────────────────────

function FertilizerTab({ cropRu, soilTexture }: { cropRu: string; soilTexture: string | null }) {
  const inferSoilType = (texture: string | null): FertilizerRequest['soil_type'] => {
    if (!texture) return 'chernozem'
    const t = texture.toLowerCase()
    if (t.includes('солон') || t.includes('solonetz')) return 'solonetz'
    if (t.includes('суглин') || t.includes('loam')) return 'loamy'
    return 'chernozem'
  }

  const [form, setForm] = useState<FertilizerRequest>({
    crop_type: CROP_RU_TO_ML[cropRu] ?? 'spring_wheat',
    soil_type: inferSoilType(soilTexture),
    deficiency_level: 'nitrogen',
  })
  const [result, setResult] = useState<FertilizerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(f => ({ ...f, crop_type: CROP_RU_TO_ML[cropRu] ?? 'spring_wheat', soil_type: inferSoilType(soilTexture) }))
  }, [cropRu, soilTexture])

  const submit = async () => {
    try {
      setLoading(true); setError(null)
      setResult(await agroService.recommendFertilizer(form))
    } catch (e: any) { setError(e?.message || 'Ошибка') }
    finally { setLoading(false) }
  }

  const DEFICIENCIES = [
    { v: 'nitrogen', l: 'Азот (N) — пожелтение листьев, слабый рост' },
    { v: 'phosphorus', l: 'Фосфор (P) — фиолетовый оттенок, слабые корни' },
    { v: 'potassium', l: 'Калий (K) — ожоги краёв листьев' },
  ]

  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Культура</label>
            <select className="input" value={form.crop_type} onChange={e => setForm({ ...form, crop_type: e.target.value })}>
              {ALL_CROPS.map(c => <option key={c} value={CROP_RU_TO_ML[c] ?? c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Тип почвы</label>
            <select className="input" value={form.soil_type} onChange={e => setForm({ ...form, soil_type: e.target.value as any })}>
              <option value="chernozem">Чернозём</option>
              <option value="loamy">Суглинок</option>
              <option value="solonetz">Солонцеватая</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Признак дефицита</label>
            <select className="input" value={form.deficiency_level} onChange={e => setForm({ ...form, deficiency_level: e.target.value as any })}>
              {DEFICIENCIES.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <FlaskConical size={16} />}
          Подобрать удобрение
        </button>
      </div>

      {error && <div className="card card-padding mb-20" style={{ color: 'var(--color-danger)' }}>{error}</div>}

      {result && (
        <div className="card card-padding mb-20">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40 }}>🧪</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{result.recommended_fertilizer}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Уверенность модели: {(result.confidence * 100).toFixed(0)}%
              </div>
              {result.note && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{result.note}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Tab: Пестициды ────────────────────────────────────────────────────────────

function PesticideTab({ cropRu }: { cropRu: string }) {
  const [form, setForm] = useState<PesticideRequest>({
    crop: CROP_RU_TO_ML[cropRu] ?? 'spring_wheat',
    pest_type: 'aphid',
    intensity: 'medium',
  })
  const [result, setResult] = useState<PesticideResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(f => ({ ...f, crop: CROP_RU_TO_ML[cropRu] ?? 'spring_wheat' }))
  }, [cropRu])

  const submit = async () => {
    try {
      setLoading(true); setError(null)
      setResult(await agroService.recommendPesticide(form))
    } catch (e: any) { setError(e?.message || 'Ошибка') }
    finally { setLoading(false) }
  }

  const PESTS = [
    { v: 'aphid', l: 'Тля' }, { v: 'sunn_pest', l: 'Клоп-черепашка' },
    { v: 'cutworm', l: 'Совка' }, { v: 'beetle', l: 'Жужелица / пьявица' },
    { v: 'thrips', l: 'Трипс' }, { v: 'weevil', l: 'Долгоносик' },
    { v: 'moth', l: 'Мотылёк' },
  ]

  return (
    <>
      <div className="card card-padding mb-20">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Культура</label>
            <select className="input" value={form.crop} onChange={e => setForm({ ...form, crop: e.target.value })}>
              {ALL_CROPS.map(c => <option key={c} value={CROP_RU_TO_ML[c] ?? c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Вредитель</label>
            <select className="input" value={form.pest_type} onChange={e => setForm({ ...form, pest_type: e.target.value as any })}>
              {PESTS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Степень поражения</label>
            <select className="input" value={form.intensity} onChange={e => setForm({ ...form, intensity: e.target.value as any })}>
              <option value="low">Слабая — единичные особи</option>
              <option value="medium">Средняя — видимые повреждения</option>
              <option value="high">Сильная — массовое поражение</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Bug size={16} />}
          Подобрать пестицид
        </button>
      </div>

      {error && <div className="card card-padding mb-20" style={{ color: 'var(--color-danger)' }}>{error}</div>}

      {result && (
        <div className="card card-padding mb-20">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40 }}>🧬</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{result.recommended_pesticide}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Уверенность модели: {(result.confidence * 100).toFixed(0)}%
              </div>
              {result.active_ingredient && (
                <div style={{ fontSize: 12, marginTop: 6, padding: '4px 10px', background: 'var(--color-bg-subtle)', borderRadius: 6, display: 'inline-block' }}>
                  Действующее вещество: <strong>{result.active_ingredient}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'risks' | 'fertilizer' | 'pesticide' | 'catalog'

export default function FieldProtectionPage() {
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('risks')
  const [fieldsLoading, setFieldsLoading] = useState(true)
  const [cropRu, setCropRu] = useState('Пшеница яровая')
  const [soilTexture, setSoilTexture] = useState<string | null>(null)

  useEffect(() => {
    fieldService.getAllFields()
      .then(data => { setFields(data); setFieldsLoading(false) })
      .catch(() => setFieldsLoading(false))
  }, [])

  const handleFieldChange = async (id: number | null) => {
    setSelectedFieldId(id)
    if (!id) return
    const field = fields.find(f => f.id === id)
    if (field?.crop_type && field.crop_type !== 'Не указана') {
      setCropRu(field.crop_type)
    }
    try {
      const soil = await soilService.get(id)
      setSoilTexture(soil.soilTexture)
    } catch { setSoilTexture(null) }
  }

  const selectedField = fields.find(f => f.id === selectedFieldId)

  const TABS = [
    { key: 'risks' as Tab, label: 'Риски и болезни', icon: <ShieldAlert size={15} /> },
    { key: 'fertilizer' as Tab, label: 'Удобрения', icon: <FlaskConical size={15} /> },
    { key: 'pesticide' as Tab, label: 'Пестициды', icon: <Bug size={15} /> },
    { key: 'catalog' as Tab, label: 'Каталог СЗР', icon: <Sprout size={15} /> },
  ]

  return (
    <div>
      <div className="page-header-bar">
        <h1 className="page-title">Защита поля</h1>
      </div>

      {/* Выбор поля */}
      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>Поле</label>
            <select
              className="input"
              value={selectedFieldId ?? ''}
              onChange={e => handleFieldChange(Number(e.target.value) || null)}
              disabled={fieldsLoading}
            >
              <option value="">— Выберите поле —</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>
                  {f.fieldName} {f.areaHectares ? `(${f.areaHectares} га)` : ''} {f.crop_type && f.crop_type !== 'Не указана' ? `· ${f.crop_type}` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedField && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedField.crop_type && selectedField.crop_type !== 'Не указана' && (
                <span className="badge badge-green" style={{ fontSize: 12 }}>🌾 {selectedField.crop_type}</span>
              )}
              {selectedField.regionName && (
                <span className="badge" style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', fontSize: 12 }}>
                  📍 {selectedField.regionName}
                </span>
              )}
              {soilTexture && (
                <span className="badge" style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', fontSize: 12 }}>
                  🪨 {getSoilTextureLabel(soilTexture)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {!selectedFieldId ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <AlertTriangle size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 500 }}>Выберите поле для начала анализа</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Система автоматически определит культуру и данные почвы</div>
        </div>
      ) : (
        <>
          {/* Табы */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
                style={{ gap: 6 }}
                onClick={() => setTab(t.key)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {tab === 'risks' && <RisksTab fieldId={selectedFieldId} cropRu={cropRu} />}
          {tab === 'fertilizer' && <FertilizerTab cropRu={cropRu} soilTexture={soilTexture} />}
          {tab === 'pesticide' && <PesticideTab cropRu={cropRu} />}
          {tab === 'catalog' && <ProtectionCatalogTab fieldId={selectedFieldId} cropRu={cropRu} />}
        </>
      )}
    </div>
  )
}
