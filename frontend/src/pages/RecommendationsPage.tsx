import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  TrendingUp, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronUp, Info, Wheat
} from 'lucide-react'
import { fieldService } from '../services/fieldService'
import { getSoilTextureLabel } from '../utils/fieldUtils'
import {
  recommendationService,
  CropRecommendationResponse,
  CropRecommendationItem,
  FactorScore,
  ScoreBreakdown,
  VarietyRecommendation,
  SowingWindow,
} from '../services/recommendationService'
import { Field } from '../types/Field'
import { api } from '../services/api'

// ── Market signal types ───────────────────────────────────────────────────────

interface RegionSignalItem {
  region_code: string
  crop: string
  signal: 'SURPLUS' | 'NEUTRAL' | 'DEFICIT' | 'UNKNOWN'
  delta_pct: number | null
  yield_pred: number
  yield_ma5: number | null
}

type SignalMap = Record<string, RegionSignalItem>

// ── Market signal helpers ────────────────────────────────────────────────────

const SIGNAL_COLOR_MAP: Record<string, string> = {
  SURPLUS: '#27ae60',
  NEUTRAL: '#f39c12',
  DEFICIT: '#e74c3c',
  UNKNOWN: 'var(--color-text-muted)',
}
const SIGNAL_LABEL_MAP: Record<string, string> = {
  SURPLUS: 'Избыток в регионе',
  NEUTRAL: 'Нейтральный рынок',
  DEFICIT: 'Дефицит в регионе',
  UNKNOWN: '',
}
const SIGNAL_EMOJI_MAP: Record<string, string> = {
  SURPLUS: '�',
  NEUTRAL: '🟨',
  DEFICIT: '�',
  UNKNOWN: '',
}

function MarketSignal({ cropCode, signalMap }: { cropCode: string | null; signalMap: SignalMap }) {
  if (!cropCode) return null
  const item = signalMap[cropCode]
  if (!item || item.signal === 'UNKNOWN') return null
  const color = SIGNAL_COLOR_MAP[item.signal]
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
      background: color + '1a', color, whiteSpace: 'nowrap', display: 'inline-flex',
      alignItems: 'center', gap: 3,
    }}>
      {SIGNAL_EMOJI_MAP[item.signal]}{' '}
      {SIGNAL_LABEL_MAP[item.signal]}
      {item.delta_pct !== null && (
        <span style={{ fontWeight: 400 }}>
          {' '}({item.delta_pct > 0 ? '+' : ''}{item.delta_pct.toFixed(1)}% к норме)
        </span>
      )}
    </span>
  )
}

// ── Crop code map (cropTypeName → snake_case code) ───────────────────────────

const CROP_NAME_TO_CODE: Record<string, string> = {
  'Пшеница яровая':  'spring_wheat',
  'Пшеница озимая':  'winter_wheat',
  'Ячмень яровой':   'spring_barley',
  'Ячмень озимый':   'winter_barley',
  'Кукуруза':        'corn',
  'Подсолнечник':    'sunflower',
  'Соя':             'soybean',
  'Рапс':            'rapeseed',
  'Горох':           'peas',
  'Гречиха':         'buckwheat',
  'Овёс':            'oat',
  'Рожь':            'rye',
  'Просо':           'millet',
  'Лён':             'flax',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function profitColor(profit: number | null): string {
  if (profit === null) return 'var(--color-text-muted)'
  if (profit >= 30000) return '#27ae60'
  if (profit >= 15000) return '#f39c12'
  if (profit >= 0) return '#e67e22'
  return '#e74c3c'
}

function formatProfit(val: number | null): string {
  if (val === null) return '—'
  return `${val >= 0 ? '+' : ''}${Math.round(val).toLocaleString('ru-RU')} ₽/га`
}

const STATUS_COLOR: Record<string, string> = {
  EXCELLENT: '#27ae60',
  GOOD: '#2980b9',
  WARNING: '#f39c12',
  CRITICAL: '#e74c3c',
}

const STATUS_LABEL: Record<string, string> = {
  EXCELLENT: 'Отлично',
  GOOD: 'Хорошо',
  WARNING: 'Осторожно',
  CRITICAL: 'Критично',
}

const FACTOR_LABEL: Record<string, string> = {
  rotation: 'Севооборот',
  soil: 'Почва',
  climate: 'Климат',
  economics: 'Экономика',
}

const TOLERANCE_ICON: Record<string, string> = {
  ВЫСОКАЯ: '🔥',
  СРЕДНЯЯ: '🌤',
  НИЗКАЯ: '❄️',
}

// ── sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#27ae60' : score >= 50 ? '#f39c12' : '#e74c3c'
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%',
      background: `conic-gradient(${color} ${score * 3.6}deg, var(--color-border) 0deg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color,
      }}>
        {score}
      </div>
    </div>
  )
}

function FactorBar({ label, factor }: { label: string; factor: FactorScore }) {
  const color = STATUS_COLOR[factor.status] ?? '#888'
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
          {FACTOR_LABEL[label] ?? label}
          <span style={{ fontWeight: 400 }}> ({Math.round(factor.weight * 100)}%)</span>
        </span>
        <span style={{ fontWeight: 600, color }}>
          {STATUS_LABEL[factor.status]} · {factor.score}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden', marginBottom: 3 }}>
        <div style={{ height: '100%', width: `${factor.score}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{factor.explanation}</div>
    </div>
  )
}

function BreakdownPanel({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--color-bg-subtle)', borderRadius: 6 }}>
      {(['rotation', 'soil', 'climate', 'economics'] as const).map(key => (
        <FactorBar key={key} label={key} factor={breakdown[key]} />
      ))}
    </div>
  )
}

function VarietyCard({ v }: { v: VarietyRecommendation }) {
  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 6, padding: '10px 12px',
      background: v.isTopByArea ? 'rgba(39,174,96,0.04)' : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{v.name}</span>
          {v.isTopByArea && (
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 600, padding: '1px 5px',
              background: '#27ae60', color: '#fff', borderRadius: 3,
            }}>ТОП</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          {v.origin} · {v.maturationDays} дн.
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{v.seedProducer}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 11 }}>
        <span title="Засухоустойчивость">
          {TOLERANCE_ICON[v.droughtTolerance] ?? '—'} засуха: {v.droughtTolerance.toLowerCase()}
        </span>
        <span title="Морозостойкость">
          ❄️ мороз: {v.frostTolerance.toLowerCase()}
        </span>
      </div>
      {v.recommendedRegions && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
          {v.recommendedRegions}
        </div>
      )}
      {v.whyRecommended && (
        <div style={{ fontSize: 11, color: '#2980b9', marginTop: 4 }}>{v.whyRecommended}</div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-')
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`
}

function SowingWindowBlock({ sw }: { sw: SowingWindow }) {
  return (
    <div style={{
      marginTop: 14,
      padding: '10px 12px',
      background: 'rgba(39,174,96,0.06)',
      border: '1px solid rgba(39,174,96,0.2)',
      borderRadius: 6,
    }}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        Рекомендуемые сроки посева
        {sw.forecastAdjusted && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px',
            background: '#2980b9', color: '#fff', borderRadius: 3,
          }}>По прогнозу</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Оптимальный срок: </span>
          <span style={{ fontWeight: 700, color: '#27ae60' }}>
            {formatDate(sw.optimalDateFrom)} — {formatDate(sw.optimalDateTo)}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Допустимо: </span>
          <span style={{ fontWeight: 500 }}>
            {formatDate(sw.earliestDate)} — {formatDate(sw.latestDate)}
          </span>
        </div>
      </div>
      {sw.forecastNote && (
        <div style={{ fontSize: 11, color: '#2980b9', marginTop: 6 }}>{sw.forecastNote}</div>
      )}
      {sw.climateNote && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{sw.climateNote}</div>
      )}
    </div>
  )
}

function RecommendationCard({ r, signalMap }: { r: CropRecommendationItem; signalMap: SignalMap }) {
  const [open, setOpen] = useState(false)
  const hasBreakdown = !!r.scoreBreakdown
  const hasVarieties = r.recommendedVarieties && r.recommendedVarieties.length > 0
  const cropCode = CROP_NAME_TO_CODE[r.cropTypeName] ?? null

  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 8, marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          cursor: hasBreakdown || hasVarieties ? 'pointer' : undefined,
          background: r.rotationCompliant ? undefined : 'rgba(231,76,60,0.04)',
        }}
        onClick={() => (hasBreakdown || hasVarieties) && setOpen(o => !o)}
      >
        {r.totalScore !== null && <ScoreRing score={r.totalScore} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{r.cropTypeName}</span>
            <span style={{
              fontSize: 11, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
              background: r.rotationCompliant ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)',
              color: r.rotationCompliant ? '#27ae60' : '#e74c3c',
            }}>
              {r.rotationCompliant ? '✓ Совместим' : '✗ Нарушение'}
            </span>
            <MarketSignal cropCode={cropCode} signalMap={signalMap} />
          </div>
          {r.agronomistSummary && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3, lineHeight: 1.4 }}>
              {r.agronomistSummary}
            </div>
          )}
          {!r.rotationCompliant && r.rotationViolationReason && (
            <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 2 }}>{r.rotationViolationReason}</div>
          )}
        </div>

        {/* Right stats */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right', minWidth: 60 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Прогноз (регион)</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {r.predictedYieldCentnersPerHa != null ? `${r.predictedYieldCentnersPerHa.toFixed(1)} ц/га` : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 72 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Цена (прогноз, регион)</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {r.predictedPriceRubPerTon != null ? `${Math.round(r.predictedPriceRubPerTon).toLocaleString('ru-RU')} ₽/т` : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 80 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Прибыль</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: profitColor(r.estimatedProfitRubPerHa) }}>
              {formatProfit(r.estimatedProfitRubPerHa)}
            </div>
          </div>
          {(hasBreakdown || hasVarieties) && (
            <div style={{ color: 'var(--color-text-muted)' }}>
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          )}
        </div>
      </div>

      {/* Sowing window — always visible when present */}
      {r.sowingWindow && (
        <div style={{ padding: '0 16px 12px' }}>
          <SowingWindowBlock sw={r.sowingWindow} />
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--color-border)' }}>
          {hasBreakdown && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={13} /> Разбивка по факторам
              </div>
              <BreakdownPanel breakdown={r.scoreBreakdown!} />
            </>
          )}
          {hasVarieties && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wheat size={13} /> Рекомендуемые сорта
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                {r.recommendedVarieties.map((v, i) => <VarietyCard key={i} v={v} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SoilScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? '#27ae60' : pct >= 60 ? '#f39c12' : '#e74c3c'
  return <span style={{ fontWeight: 600, color, fontSize: 12 }}>{pct}%</span>
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function RecommendationsPage() {
  const [searchParams] = useSearchParams()
  const [fields, setFields] = useState<Field[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(
    searchParams.get('fieldId') ? Number(searchParams.get('fieldId')) : null
  )
  const [year, setYear] = useState(new Date().getFullYear())
  const [yearStr, setYearStr] = useState(String(new Date().getFullYear()))
  const [result, setResult] = useState<CropRecommendationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [fieldsLoading, setFieldsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signalMap, setSignalMap] = useState<SignalMap>({})
  const signalRegionCode = useRef<string | null>(null)

  useEffect(() => {
    fieldService.getAllFields()
      .then(data => { setFields(data); setFieldsLoading(false) })
      .catch(() => setFieldsLoading(false))
  }, [])

  // Auto-fetch when arriving via ?fieldId= link
  useEffect(() => {
    const paramId = searchParams.get('fieldId')
    if (paramId && !fieldsLoading && fields.length > 0) {
      const id = Number(paramId)
      setSelectedFieldId(id)
      recommendationService.getRecommendations(id, year)
        .then(data => setResult(data))
        .catch(e => setError(e?.message || 'Ошибка загрузки рекомендаций'))
        .finally(() => setLoading(false))
      setLoading(true)
    }
  }, [fieldsLoading])

  const fetchRecommendations = async () => {
    if (!selectedFieldId) return
    try {
      setLoading(true); setError(null); setResult(null); setSignalMap({})
      const data = await recommendationService.getRecommendations(selectedFieldId, year)
      setResult(data)
      const field = fields.find(f => f.id === selectedFieldId)
      const regionCode = field?.regionCode ?? data.metadata?.regionName ? null : 'OMS'
      loadSignals(data, regionCode)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка загрузки рекомендаций')
    } finally {
      setLoading(false)
    }
  }

  const loadSignals = async (recData: CropRecommendationResponse, _regionCode: string | null) => {
    const cropCodes = recData.recommendations
      .map(r => CROP_NAME_TO_CODE[r.cropTypeName])
      .filter(Boolean) as string[]
    if (cropCodes.length === 0) return
    const uniqueCrops = [...new Set(cropCodes)]
    try {
      const results = await Promise.allSettled(
        uniqueCrops.map(crop =>
          api.get('/yield/regions', { params: { crop, year }, timeout: 30000 })
        )
      )
      const map: SignalMap = {}
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const regions: RegionSignalItem[] = res.value.data?.regions ?? []
          const best = regions.find(r => r.signal !== 'UNKNOWN') ?? regions[0]
          if (best) map[uniqueCrops[idx]] = { ...best, crop: uniqueCrops[idx] }
        }
      })
      setSignalMap(map)
    } catch {
    }
  }

  const seenNames = new Set<string>()
  const uniqueRecs = (result?.recommendations ?? []).filter(r => {
    if (seenNames.has(r.cropTypeName)) return false
    seenNames.add(r.cropTypeName)
    return true
  })
  const compliant = uniqueRecs.filter(r => r.rotationCompliant)
  const violated  = uniqueRecs.filter(r => !r.rotationCompliant)

  return (
    <div>
      <div className="page-header-bar">
        <h1 className="page-title">Рекомендации культур</h1>
      </div>

      {/* Форма выбора */}
      <div className="card card-padding mb-20">
        <div className="rec-form-row">
          <div className="rec-form-field">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
              Поле
            </label>
            <select
              className="input"
              value={selectedFieldId ?? ''}
              onChange={e => setSelectedFieldId(Number(e.target.value) || null)}
              disabled={fieldsLoading}
            >
              <option value="">— Выберите поле —</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.fieldName} ({f.areaHectares} га)</option>
              ))}
            </select>
          </div>
          <div className="rec-form-year">
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
              Год
            </label>
            <input
              type="number"
              className="input"
              value={yearStr}
              onChange={e => setYearStr(e.target.value)}
              onBlur={e => { const v = Math.min(2030, Math.max(2024, Number(e.target.value) || year)); setYear(v); setYearStr(String(v)) }}
              min={2024}
              max={2030}
            />
          </div>
          <button
            className="btn btn-primary rec-form-btn"
            onClick={fetchRecommendations}
            disabled={!selectedFieldId || loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <TrendingUp size={16} />}
            Получить рекомендацию
          </button>
        </div>
      </div>

      {error && (
        <div className="card card-padding mb-20" style={{ borderLeft: '3px solid var(--color-danger)' }}>
          <div style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{error}</div>
        </div>
      )}

      {result && (
        <>
          {/* Заголовок результата + metadata */}
          <div className="card card-padding mb-20" style={{ background: 'var(--color-bg-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {result.fieldName} — сезон {result.targetYear}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Найдено {compliant.length} допустимых культур из {uniqueRecs.length}
                </div>
              </div>
              {result.metadata && (
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right', lineHeight: 1.6 }}>
                  <div>{result.metadata.regionName}</div>
                  {result.metadata.lastCropName && <div>Прошлая культура: <b>{result.metadata.lastCropName}</b></div>}
                  {result.metadata.soilPh && <div>pH: {result.metadata.soilPh.toFixed(1)}{result.metadata.soilType ? ` · ${getSoilTextureLabel(result.metadata.soilType)}` : ''}</div>}
                  <div>{result.metadata.scoringMethodology}</div>
                </div>
              )}
            </div>
          </div>

          {/* Визуальный бар-чарт прибыли */}
          {compliant.length > 0 && (
            <div className="card card-padding mb-20">
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Ожидаемая прибыль по культурам</div>
              {compliant.slice(0, 6).map((r: CropRecommendationItem) => {
                const maxProfit = Math.max(...compliant.map(c => c.estimatedProfitRubPerHa ?? 0), 1)
                const pct = Math.max(0, ((r.estimatedProfitRubPerHa ?? 0) / maxProfit) * 100)
                return (
                  <div key={r.cropTypeId} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>
                        {r.rank}. {r.cropTypeName}
                        {r.totalScore !== null && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
                            балл {r.totalScore}/100
                          </span>
                        )}
                      </span>
                      <span style={{ fontWeight: 600, color: profitColor(r.estimatedProfitRubPerHa) }}>
                        {formatProfit(r.estimatedProfitRubPerHa)}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 4,
                        background: profitColor(r.estimatedProfitRubPerHa),
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Допустимые культуры — карточки с разбивкой */}
          {compliant.length > 0 && (
            <div className="card card-padding mb-20">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <CheckCircle size={16} color="#27ae60" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Рекомендованные культуры</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>— нажмите на карточку для деталей</span>
              </div>
              {compliant.map((r: CropRecommendationItem) => (
                <RecommendationCard key={r.cropTypeId} r={r} signalMap={signalMap} />
              ))}
            </div>
          )}

          {/* Запрещённые культуры */}
          {violated.length > 0 && (
            <div className="card card-padding mb-20">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <XCircle size={16} color="var(--color-danger)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Не рекомендованы (нарушение севооборота)</span>
              </div>
              {violated.map((r: CropRecommendationItem) => (
                <RecommendationCard key={r.cropTypeId} r={r} signalMap={signalMap} />
              ))}
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="card card-padding" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px', display: 'block', color: 'var(--color-primary)' }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Рассчитываем рекомендации…</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.6 }}>
            Запрашиваем ML-прогноз урожайности и цен для каждой культуры,<br />
            анализируем климат по ERA5, проверяем правила севооборота.<br />
            Это может занять до 30–60 секунд.
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="card card-padding" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌾</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Выберите поле и год</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Система рассчитает оптимальную культуру на основе прогноза урожайности,
            цен, правил севооборота, совместимости с почвой и климата
          </div>
        </div>
      )}
    </div>
  )
}

