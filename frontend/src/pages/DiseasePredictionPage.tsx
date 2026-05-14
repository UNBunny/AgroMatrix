import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bug, Loader2, AlertTriangle, ShieldCheck, Activity, Thermometer, Droplets, CloudRain, Sprout, RefreshCw, MapPin, Calendar, ClipboardList } from 'lucide-react'
import { diseaseMLService, DiseasePredictResponse } from '../services/mlService'
import { weatherService, WeatherDay, weatherIcon } from '../services/weatherService'
import { ndviService, getNdviColor, getNdviLabel } from '../services/ndviService'
import { useFields } from '../hooks/useFields'
import { diseaseProductService, DiseaseProductRecommendationDto, DiseaseProductItemDto } from '../services/diseaseProductService'

const DEFAULT_LAT = 54.9924
const DEFAULT_LON = 73.3686

function fieldCentroid(coords: number[][]): [number, number] {
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
  const lon = coords.reduce((s, c) => s + c[0], 0) / coords.length
  return [lat, lon]
}

const CROPS = [
  { value: 'spring_wheat',  label: 'Пшеница яровая' },
  { value: 'winter_wheat',  label: 'Пшеница озимая' },
  { value: 'spring_barley', label: 'Ячмень яровой' },
  { value: 'corn',          label: 'Кукуруза' },
  { value: 'sunflower',     label: 'Подсолнечник' },
  { value: 'soybean',       label: 'Соя' },
  { value: 'rapeseed',      label: 'Рапс' },
  { value: 'peas',          label: 'Горох' },
  { value: 'buckwheat',     label: 'Гречиха' },
  { value: 'flax',          label: 'Лён' },
]

const STAGES = [
  { value: 'seedling',   label: 'Всходы' },
  { value: 'vegetative', label: 'Вегетация' },
  { value: 'flowering',  label: 'Цветение' },
  { value: 'ripening',   label: 'Созревание' },
]

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'Высокий',  color: '#e74c3c', bg: '#fdecea' },
  medium: { label: 'Средний',  color: '#f39c12', bg: '#fef9e7' },
  low:    { label: 'Низкий',   color: '#27ae60', bg: '#eafaf1' },
}

// ── Product recommendation block ──────────────────────────────────────────────

function ProductRecommendationBlock({
  rec, loading, cropLabel, onSchedule,
}: {
  rec: DiseaseProductRecommendationDto | null
  loading: boolean
  cropLabel: string
  onSchedule: (p: DiseaseProductItemDto, rec: DiseaseProductRecommendationDto) => void
}) {
  if (loading) return (
    <div className="card mb-20 card-padding" style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
      <Loader2 size={16} style={{ marginRight: 6, display: 'inline' }} />
      Загрузка рекомендации...
    </div>
  )
  if (!rec) return null
  return (
    <div className="card mb-20" style={{ borderLeft: `4px solid ${rec.opColor}` }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20 }}>{rec.opEmoji}</span>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Рекомендуемая защита</span>
        <span style={{
          background: rec.opColor, color: '#fff', borderRadius: 20,
          padding: '2px 12px', fontSize: 12, fontWeight: 600,
        }}>
          {rec.opLabel}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{cropLabel}</span>
      </div>
      <div style={{ padding: '10px 20px', fontSize: 13, color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        {rec.reason}
      </div>
      {rec.products.map((p, i) => (
        <div key={i} style={{ padding: '14px 20px', borderBottom: i < rec.products.length - 1 ? '1px solid var(--color-border)' : undefined, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: '#fff', background: rec.opColor, borderRadius: 4, padding: '1px 7px', opacity: 0.85 }}>{p.mechanism}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 5 }}>{p.activeIngredient}</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ color: rec.opColor, fontWeight: 700 }}>{p.dose}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>📅 {p.timing}</span>
              {p.phiDays > 0 && <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>⏳ ОЖЗ {p.phiDays} дн.</span>}
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            onClick={() => onSchedule(p, rec)}
          >
            <ClipboardList size={14} /> Запланировать
          </button>
        </div>
      ))}
    </div>
  )
}

export default function DiseasePredictionPage() {
  const { fields } = useFields({ withNdvi: false })
  const [fieldId, setFieldId] = useState<number | ''>('')
  const [crop, setCrop] = useState('spring_wheat')
  const [temperature, setTemperature] = useState(20)
  const [humidity, setHumidity] = useState(70)
  const [rainfall, setRainfall] = useState(60)
  const [stage, setStage] = useState<'seedling' | 'vegetative' | 'flowering' | 'ripening'>('vegetative')
  const [result, setResult] = useState<DiseasePredictResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherSource, setWeatherSource] = useState<string | null>(null)
  const [forecastDays, setForecastDays] = useState<WeatherDay[]>([])
  const [selectedDayIdx, setSelectedDayIdx] = useState(0)
  const [ndvi, setNdvi] = useState<number | null>(null)
  const [ndviLoading, setNdviLoading] = useState(false)

  // Автовыбор первого поля при загрузке
  useEffect(() => {
    if (fields.length > 0 && fieldId === '') setFieldId(fields[0].id)
  }, [fields.length])

  // NDVI по полю
  useEffect(() => {
    if (fieldId === '') { setNdvi(null); return }
    setNdviLoading(true)
    ndviService.getCurrentNdvi(Number(fieldId))
      .then(r => setNdvi(r.mean))
      .catch(() => setNdvi(null))
      .finally(() => setNdviLoading(false))
  }, [fieldId])

  const applyDayWeather = (days: WeatherDay[], idx: number) => {
    const day = days[idx]
    if (!day) return
    if (day.tempMean != null) setTemperature(Math.round(day.tempMean * 10) / 10)
    if (day.humidity != null) setHumidity(Math.round(day.humidity))
    // Модель обучена на сезонных осадках (10–165 мм), а не суточных.
    // Используем сумму осадков за 7 дней прогноза как приближение к периодической норме.
    const weeklyRain = days.reduce((sum, d) => sum + (d.precipitation ?? 0), 0)
    if (weeklyRain > 0) setRainfall(Math.round(weeklyRain * 10) / 10)
  }

  const fetchWeather = async (fId: number | '') => {
    let lat = DEFAULT_LAT, lon = DEFAULT_LON, source = 'Омск'
    if (fId !== '') {
      const f = fields.find(f => f.id === fId)
      if (f && f.coordinates.length > 0) {
        ;[lat, lon] = fieldCentroid(f.coordinates)
        source = f.fieldName
      }
    }
    setWeatherLoading(true)
    try {
      const r = await weatherService.getForecast(lat, lon, 7)
      setForecastDays(r.days)
      setSelectedDayIdx(0)
      applyDayWeather(r.days, 0)
      setWeatherSource(source)
    } catch {
      setWeatherSource(null)
    } finally {
      setWeatherLoading(false)
    }
  }

  useEffect(() => { fetchWeather(fieldId) }, [fieldId, fields.length])

  const handleDaySelect = (idx: number) => {
    setSelectedDayIdx(idx)
    applyDayWeather(forecastDays, idx)
    setResult(null)
  }

  const handlePredict = async () => {
    try {
      setLoading(true); setError(null); setResult(null)
      const data = await diseaseMLService.predict({
        crop, temperature, humidity, rainfall, growth_stage: stage,
      })
      setResult(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Ошибка прогноза')
    } finally {
      setLoading(false)
    }
  }

  const cropLabel = CROPS.find(c => c.value === crop)?.label ?? crop
  const stageLabel = STAGES.find(s => s.value === stage)?.label ?? stage
  const risk = result ? RISK_CONFIG[result.risk_level] : null

  const navigate = useNavigate()

  const [recData, setRecData] = useState<DiseaseProductRecommendationDto | null>(null)
  const [recLoading, setRecLoading] = useState(false)

  useEffect(() => {
    if (!result) return
    setRecLoading(true)
    diseaseProductService.getByDiseaseName(result.disease)
      .then(setRecData)
      .catch(() => setRecData(null))
      .finally(() => setRecLoading(false))
  }, [result?.disease])

  const handleSchedule = (p: DiseaseProductItemDto, rec: DiseaseProductRecommendationDto) => {
    if (!result) return
    const params = new URLSearchParams({
      tab: 'protection',
      productName: p.name,
      operationType: rec.opType,
      targetPest: result.disease,
      doseLPerHa: String(p.doseValue),
      activeIngredient: p.activeIngredient,
      mechanismOfAction: p.mechanism,
      phiDays: String(p.phiDays),
      notes: `ML-прогноз: ${result.disease}. Риск: ${result.risk_level}. Культура: ${cropLabel}. Стадия: ${stageLabel}.`,
    })
    navigate(`/operations?${params.toString()}`)
  }

  return (
    <div>
      <div className="page-header-bar">
        <h1 className="page-title">ML-прогноз болезней</h1>
      </div>

      {/* Форма ввода */}
      <div className="card card-padding mb-20">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Поле
            </label>
            <select className="input" value={fieldId} onChange={e => setFieldId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— Без поля (Омск) —</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.fieldName}</option>)}
            </select>
            <div style={{ marginTop: 5, minHeight: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
              {fieldId !== '' && (
                ndviLoading
                  ? <Loader2 size={11} className="spin" style={{ color: 'var(--color-text-muted)' }} />
                  : ndvi !== null
                    ? <><div style={{ width: 8, height: 8, borderRadius: '50%', background: getNdviColor(ndvi), flexShrink: 0 }} /><span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>NDVI {ndvi.toFixed(2)} · {getNdviLabel(ndvi)}</span></>
                    : <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>NDVI: нет данных</span>
              )}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Культура
            </label>
            <select className="input" value={crop} onChange={e => setCrop(e.target.value)}>
              {CROPS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Фаза роста
            </label>
            <select className="input" value={stage} onChange={e => setStage(e.target.value as any)}>
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Температура, °C
            </label>
            <input className="input" type="number" value={temperature}
              onChange={e => setTemperature(Number(e.target.value))} min={-10} max={45} step={0.5} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Влажность, %
            </label>
            <input className="input" type="number" value={humidity}
              onChange={e => setHumidity(Number(e.target.value))} min={0} max={100} step={1} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--color-text-muted)' }}>
              Осадки за 7 дней, мм
            </label>
            <input className="input" type="number" value={rainfall}
              onChange={e => setRainfall(Number(e.target.value))} min={0} max={300} step={5} />
          </div>
        </div>

        {/* 7-дневная полоска прогноза */}
        {forecastDays.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={12} />
              Прогноз на 7 дней — выберите дату для прогноза
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
              {forecastDays.map((day, i) => {
                const isSelected = i === selectedDayIdx
                const d = new Date(day.date)
                const label = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : d.toLocaleDateString('ru-RU', { weekday: 'short' })
                const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' })
                return (
                  <button
                    key={day.date}
                    onClick={() => handleDaySelect(i)}
                    style={{
                      flexShrink: 0, cursor: 'pointer', padding: '7px 10px', borderRadius: 10, textAlign: 'center',
                      background: isSelected ? 'var(--color-primary)' : 'var(--color-bg)',
                      color: isSelected ? '#fff' : 'var(--color-text)',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      minWidth: 68, outline: 'none',
                      boxShadow: isSelected ? '0 2px 8px rgba(45,122,69,0.25)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 1, opacity: 0.85 }}>{label}</div>
                    <div style={{ fontSize: 9, opacity: 0.65, marginBottom: 3 }}>{dateStr}</div>
                    <div style={{ fontSize: 18 }}>{weatherIcon(day)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{day.tempMean?.toFixed(0) ?? '—'}°</div>
                    <div style={{ fontSize: 9, opacity: 0.75, marginTop: 1 }}>{(day.precipitation ?? 0).toFixed(0)}мм</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handlePredict} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Bug size={16} />}
            Прогнозировать
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => fetchWeather(fieldId)}
            disabled={weatherLoading}
            title="Обновить погодные данные"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {weatherLoading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            Обновить погоду
          </button>
          {weatherSource && (
            <span style={{ fontSize: 12, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} />
              Погода загружена: {weatherSource}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
            RandomForest · 29 болезней · 10 культур
          </span>
        </div>
      </div>

      {error && (
        <div className="card card-padding mb-20" style={{ borderLeft: '3px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        </div>
      )}

      {ndvi !== null && ndvi < 0.3 && result && risk && (
        <div className="card card-padding mb-20" style={{ borderLeft: '3px solid #f39c12', background: '#fffbf0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#856404' }}>
            <AlertTriangle size={15} />
            Низкий NDVI ({ndvi.toFixed(2)}) — стресс растений повышает восприимчивость к болезням
          </div>
        </div>
      )}

      {result && risk && (
        <>
          {/* Входные параметры */}
          <div className="grid-4 mb-20">
            <div className="card card-padding" style={{ textAlign: 'center' }}>
              <Sprout size={18} color="var(--color-primary)" />
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{cropLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{stageLabel}</div>
            </div>
            <div className="card card-padding" style={{ textAlign: 'center' }}>
              <Thermometer size={18} color="#e67e22" />
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{temperature}°C</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Температура</div>
            </div>
            <div className="card card-padding" style={{ textAlign: 'center' }}>
              <Droplets size={18} color="#3498db" />
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{humidity}%</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Влажность</div>
            </div>
            <div className="card card-padding" style={{ textAlign: 'center' }}>
              <CloudRain size={18} color="#2980b9" />
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{rainfall} мм</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Осадки</div>
            </div>
          </div>

          {/* Основной результат */}
          <div className="card card-padding mb-20" style={{ borderLeft: `4px solid ${risk.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {result.disease === 'none' ? (
                <ShieldCheck size={28} color="#27ae60" />
              ) : (
                <Bug size={28} color={risk.color} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {result.disease === 'none' ? 'Болезнь не обнаружена' : result.disease}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Уверенность модели: {(result.disease_confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block', padding: '4px 14px', borderRadius: 20,
                  fontSize: 13, fontWeight: 600, color: risk.color, background: risk.bg,
                  border: `1px solid ${risk.color}30`,
                }}>
                  Риск: {risk.label}
                </span>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {(result.risk_confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Уровень риска - прогресс бар */}
          <div className="card card-padding mb-20">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Activity size={16} color={risk.color} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Уровень риска заболевания</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {['low', 'medium', 'high'].map(level => {
                const cfg = RISK_CONFIG[level]
                const isActive = result.risk_level === level
                return (
                  <div key={level} style={{
                    flex: 1, height: 8, borderRadius: 4,
                    background: isActive ? cfg.color : 'var(--color-border)',
                    transition: 'background 0.3s ease',
                    opacity: isActive ? 1 : 0.3,
                  }} />
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>Низкий</span><span>Средний</span><span>Высокий</span>
            </div>
          </div>

          {/* Топ-3 болезней */}
          <div className="card mb-20">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bug size={16} color="#8e44ad" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Наиболее вероятные болезни</span>
            </div>
            {result.top3_diseases.map((d, i) => {
              const pct = (d.probability * 100)
              const isNone = d.disease === 'none'
              return (
                <div key={i} style={{
                  padding: '14px 20px', borderBottom: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    background: i === 0 ? risk.color : i === 1 ? '#95a5a6' : '#bdc3c7',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {isNone ? 'Нет болезни (здоровое растение)' : d.disease}
                    </div>
                    <div style={{ marginTop: 4, height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 3,
                        background: isNone ? '#27ae60' : risk.color,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, minWidth: 50, textAlign: 'right' }}>
                    {pct.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>

          <ProductRecommendationBlock
            rec={recData}
            loading={recLoading}
            cropLabel={cropLabel}
            onSchedule={handleSchedule}
          />
        </>
      )}

      {!result && !loading && !error && (
        <div className="card card-padding" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔬</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>ML-прогнозирование болезней растений</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, maxWidth: 420, margin: '6px auto 0' }}>
            Укажите культуру, фазу роста и погодные условия. Модель (RandomForest) предскажет наиболее вероятную болезнь и уровень риска.
          </div>
        </div>
      )}
    </div>
  )
}
