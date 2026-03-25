import { useState, useEffect, useMemo } from 'react'
import { api } from '../services/api'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, BarChart3, Info } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface RegionForecastItem {
  region_code: string
  region_name: string
  yield_pred: number
  yield_ma5: number | null
  delta_pct: number | null
  price_pred: number | null
  signal: 'SURPLUS' | 'NEUTRAL' | 'DEFICIT' | 'UNKNOWN'
  sown_area_thou_ha: number | null
}

interface RegionForecastResponse {
  crop: string
  year: number
  regions: RegionForecastItem[]
  cached: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HARVEST_MONTHS: Record<string, number> = {
  spring_wheat: 9, winter_wheat: 8,
  spring_barley: 9, winter_barley: 8,
  corn: 10, sunflower: 10,
  rapeseed: 8, peas: 9,
  buckwheat: 9, oat: 9,
  rye: 9, millet: 9,
  soybean: 10, flax: 8,
}

const MONTH_NAMES = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']

function harvestLabel(cropCode: string, year: number): string {
  const m = HARVEST_MONTHS[cropCode] ?? 9
  return `${MONTH_NAMES[m - 1]}. ${year}`
}

const CROP_OPTIONS = [
  { code: 'spring_wheat',  label: 'Пшеница яровая' },
  { code: 'winter_wheat',  label: 'Пшеница озимая' },
  { code: 'spring_barley', label: 'Ячмень яровой' },
  { code: 'corn',          label: 'Кукуруза' },
  { code: 'sunflower',     label: 'Подсолнечник' },
  { code: 'soybean',       label: 'Соя' },
  { code: 'rapeseed',      label: 'Рапс' },
  { code: 'peas',          label: 'Горох' },
  { code: 'buckwheat',     label: 'Гречиха' },
  { code: 'oat',           label: 'Овёс' },
  { code: 'rye',           label: 'Рожь' },
  { code: 'millet',        label: 'Просо' },
]

const SIGNAL_CONFIG = {
  SURPLUS:  { label: 'Профицит',  color: '#27ae60', bg: 'rgba(39,174,96,0.1)',  icon: TrendingDown },
  NEUTRAL:  { label: 'Норма',     color: '#3498db', bg: 'rgba(52,152,219,0.1)', icon: Minus },
  DEFICIT:  { label: 'Дефицит',   color: '#e74c3c', bg: 'rgba(231,76,60,0.1)',  icon: TrendingUp },
  UNKNOWN:  { label: 'Нет данных',color: '#95a5a6', bg: 'rgba(149,165,166,0.1)',icon: Minus },
}

type SortKey = 'yield_pred' | 'delta_pct' | 'price_pred' | 'sown_area_thou_ha'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: number | null, unit: string, decimals = 1): string {
  if (v == null) return '—'
  return `${v.toFixed(decimals)} ${unit}`
}

function fmtPrice(v: number | null): string {
  if (v == null) return '—'
  return `${Math.round(v).toLocaleString('ru-RU')} ₽/т`
}

function deltaColor(d: number | null): string {
  if (d == null) return 'var(--color-text-muted)'
  if (d > 5) return '#27ae60'
  if (d < -5) return '#e74c3c'
  return '#f39c12'
}

function SignalBadge({ signal }: { signal: RegionForecastItem['signal'] }) {
  const cfg = SIGNAL_CONFIG[signal] ?? SIGNAL_CONFIG.UNKNOWN
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ── YieldBar — visual scale ────────────────────────────────────────────────────

function YieldBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 52, textAlign: 'right' }}>
        {value.toFixed(1)} ц/га
      </span>
    </div>
  )
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ regions }: { regions: RegionForecastItem[] }) {
  if (regions.length === 0) return null

  const withYield = regions.filter(r => r.yield_pred > 0)
  const avgYield = withYield.length
    ? withYield.reduce((s, r) => s + r.yield_pred, 0) / withYield.length
    : null

  const withPrice = regions.filter(r => r.price_pred != null && r.price_pred! > 0)
  const avgPrice = withPrice.length
    ? withPrice.reduce((s, r) => s + r.price_pred!, 0) / withPrice.length
    : null

  const surplus  = regions.filter(r => r.signal === 'SURPLUS').length
  const deficit  = regions.filter(r => r.signal === 'DEFICIT').length
  const topRegion = [...withYield].sort((a, b) => b.yield_pred - a.yield_pred)[0]

  return (
    <div className="grid-4 mb-20">
      <div className="card card-padding" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#27ae60' }}>
          {avgYield != null ? `${avgYield.toFixed(1)} ц/га` : '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Средняя урожайность</div>
      </div>
      <div className="card card-padding" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#3498db' }}>
          {avgPrice != null ? `${Math.round(avgPrice / 1000)}к ₽/т` : '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Средняя цена</div>
      </div>
      <div className="card card-padding" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: deficit > surplus ? '#e74c3c' : '#27ae60' }}>
          {surplus} / {deficit}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Профицит / Дефицит</div>
      </div>
      <div className="card card-padding" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
          {topRegion ? topRegion.region_name.replace(' область', ' обл.') : '—'}
        </div>
        <div style={{ fontSize: 12, color: '#27ae60', marginTop: 4 }}>
          {topRegion ? `${topRegion.yield_pred.toFixed(1)} ц/га — лучший регион` : ''}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TraderAnalyticsPage() {
  const currentYear = new Date().getFullYear()
  const [crop, setCrop] = useState('spring_wheat')
  const [year, setYear] = useState(currentYear)
  const [yearStr, setYearStr] = useState(String(currentYear))
  const [data, setData] = useState<RegionForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('yield_pred')
  const [sortDesc, setSortDesc] = useState(true)
  const [signalFilter, setSignalFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await api.get<RegionForecastResponse>('/yield/regions', {
        params: { crop, year },
      })
      setData(res)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Ошибка ML-сервиса')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(true) }
  }

  const filtered = useMemo(() => {
    if (!data) return []
    let rows = [...data.regions]
    if (signalFilter !== 'ALL') rows = rows.filter(r => r.signal === signalFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(r => r.region_name.toLowerCase().includes(q) || r.region_code.toLowerCase().includes(q))
    }
    rows.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return sortDesc ? (bv as number) - (av as number) : (av as number) - (bv as number)
    })
    return rows
  }, [data, sortKey, sortDesc, signalFilter, search])

  const maxYield = useMemo(() => Math.max(...(data?.regions.map(r => r.yield_pred) ?? [1])), [data])

  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k
    return (
      <th
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        onClick={() => handleSort(k)}
      >
        {label} {active ? (sortDesc ? '↓' : '↑') : ''}
      </th>
    )
  }

  const cropLabel = CROP_OPTIONS.find(c => c.code === crop)?.label ?? crop

  return (
    <div>
      <div className="page-header-bar">
        <h1 className="page-title">Аналитика регионов</h1>
        {data?.cached && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>из кэша (1 ч)</span>
        )}
      </div>

      {/* Controls */}
      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
              Культура
            </label>
            <select className="input" value={crop} onChange={e => setCrop(e.target.value)}>
              {CROP_OPTIONS.map(o => (
                <option key={o.code} value={o.code}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>
              Год
            </label>
            <input
              type="number" className="input" value={yearStr}
              onChange={e => setYearStr(e.target.value)}
              onBlur={e => { const v = Math.min(2030, Math.max(2024, Number(e.target.value) || year)); setYear(v); setYearStr(String(v)) }}
              min={2024} max={2030}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <BarChart3 size={16} />}
            Построить прогноз
          </button>
          {data && (
            <button className="btn btn-ghost" onClick={fetchData} disabled={loading} title="Обновить">
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card card-padding mb-20" style={{ borderLeft: '3px solid var(--color-danger)' }}>
          <span style={{ color: 'var(--color-danger)' }}>{error}</span>
        </div>
      )}

      {loading && (
        <div className="card card-padding" style={{ textAlign: 'center', padding: 48 }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px', display: 'block', color: 'var(--color-primary)' }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Рассчитываем прогноз по всем регионам…</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
            LightGBM · 76 регионов · CV R²=0.93<br />Может занять 20–40 секунд
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <SummaryCards regions={data.regions} />

          {/* Filters + search */}
          <div className="card card-padding mb-20">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {cropLabel} · {data.year} · {data.regions.length} регионов
              </span>
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  className="input"
                  style={{ width: 180, fontSize: 12, padding: '5px 10px' }}
                  placeholder="Поиск региона…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {(['ALL', 'SURPLUS', 'NEUTRAL', 'DEFICIT'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSignalFilter(s)}
                    style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 10,
                      border: '1px solid var(--color-border)',
                      background: signalFilter === s ? 'var(--color-primary)' : 'transparent',
                      color: signalFilter === s ? '#fff' : 'var(--color-text-muted)',
                      cursor: 'pointer', fontWeight: signalFilter === s ? 600 : 400,
                    }}
                  >
                    {s === 'ALL' ? 'Все' : SIGNAL_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Регион</th>
                    <SortTh label="Урожайность" k="yield_pred" />
                    <SortTh label="Δ от нормы" k="delta_pct" />
                    <SortTh label={`Прогноз цены (${harvestLabel(crop, year)})`} k="price_pred" />
                    <SortTh label="Пос. площадь, тыс.га" k="sown_area_thou_ha" />
                    <th>Сигнал</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                        Нет данных
                      </td>
                    </tr>
                  )}
                  {filtered.map((r, idx) => (
                    <tr key={r.region_code}>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{r.region_name}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.region_code}</div>
                      </td>
                      <td style={{ minWidth: 160 }}>
                        <YieldBar value={r.yield_pred} max={maxYield} color="#27ae60" />
                      </td>
                      <td>
                        {r.delta_pct != null ? (
                          <span style={{ fontWeight: 600, color: deltaColor(r.delta_pct) }}>
                            {r.delta_pct > 0 ? '+' : ''}{r.delta_pct.toFixed(1)}%
                          </span>
                        ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        {r.yield_ma5 != null && (
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                            норма {r.yield_ma5.toFixed(1)} ц/га
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: r.price_pred ? 600 : 400 }}>
                        {fmtPrice(r.price_pred)}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {fmt(r.sown_area_thou_ha, 'тыс.га', 0)}
                      </td>
                      <td><SignalBadge signal={r.signal} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--color-bg-subtle)', borderRadius: 6 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <Info size={12} color="var(--color-text-muted)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>Сигналы</span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--color-text-muted)' }}>
                <span><b style={{ color: '#27ae60' }}>Профицит</b> — урожайность &gt;+15% от нормы (МА5), давление на цены вниз</span>
                <span><b style={{ color: '#e74c3c' }}>Дефицит</b> — урожайность &gt;−15% от нормы, поддержка цен</span>
                <span><b style={{ color: '#3498db' }}>Норма</b> — отклонение в пределах ±15%</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                <b>Цена</b> — прогноз на месяц уборки урожая ({harvestLabel(crop, year)}), не текущая рыночная цена.
                Модель: LightGBM · LOYO CV R²=0.93, MAPE=5.4% · 76 регионов · 13 культур
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className="card card-padding" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Выберите культуру и год</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Система построит прогноз урожайности и цен для всех регионов РФ
          </div>
        </div>
      )}
    </div>
  )
}
