import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, BarChart3, Info, Star, StarOff, Map as MapIcon, Table2 } from 'lucide-react'
import { api } from '../services/api'
import 'leaflet/dist/leaflet.css'

// ── Types ─────────────────────────────────────────────────────────────────────

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
  is_forecast_year: boolean
  cached: boolean
}

type MapMode = 'yield' | 'price' | 'signal'
type SortKey = 'yield_pred' | 'delta_pct' | 'price_pred' | 'sown_area_thou_ha'
type ViewTab = 'map' | 'table'

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
  SURPLUS:  { label: 'Профицит',   color: '#27ae60', bg: 'rgba(39,174,96,0.1)',   icon: TrendingDown },
  NEUTRAL:  { label: 'Норма',      color: '#3498db', bg: 'rgba(52,152,219,0.1)',  icon: Minus },
  DEFICIT:  { label: 'Дефицит',    color: '#e74c3c', bg: 'rgba(231,76,60,0.1)',   icon: TrendingUp },
  UNKNOWN:  { label: 'Нет данных', color: '#95a5a6', bg: 'rgba(149,165,166,0.1)', icon: Minus },
}

const SIGNAL_COLOR: Record<string, string> = {
  SURPLUS: '#27ae60',
  NEUTRAL: '#f39c12',
  DEFICIT: '#e74c3c',
  UNKNOWN: '#95a5a6',
}

const SIGNAL_LABEL: Record<string, string> = {
  SURPLUS: 'Профицит',
  NEUTRAL: 'Нейтрально',
  DEFICIT: 'Дефицит',
  UNKNOWN: 'Нет данных',
}

const SIGNAL_EMOJI: Record<string, string> = {
  SURPLUS: '🟩',
  NEUTRAL: '🟨',
  DEFICIT: '🟥',
  UNKNOWN: '⬜',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function yieldColor(value: number, min: number, max: number): string {
  if (max === min) return '#f39c12'
  const t = (value - min) / (max - min)
  const r = Math.round(231 - t * (231 - 39))
  const g = Math.round(76  + t * (174 - 76))
  const b = Math.round(60  - t * (60  - 96))
  return `rgb(${r},${g},${b})`
}

function priceColor(value: number, min: number, max: number): string {
  if (max === min) return '#f39c12'
  const t = (value - min) / (max - min)
  const r = Math.round(39  + t * (52  - 39))
  const g = Math.round(174 - t * (174 - 152))
  const b = Math.round(96  + t * (219 - 96))
  return `rgb(${r},${g},${b})`
}

function fmt(v: number | null, unit: string, decimals = 1): string {
  if (v == null) return '—'
  return `${v.toFixed(decimals)} ${unit}`
}

function fmtN(n: number | null, decimals = 1): string {
  if (n === null) return '—'
  return n.toFixed(decimals)
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

function deltaBadge(delta: number | null) {
  if (delta === null) return null
  const color = delta > 15 ? '#27ae60' : delta < -15 ? '#e74c3c' : '#f39c12'
  const sign = delta > 0 ? '+' : ''
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
      background: color + '22', color,
    }}>
      {sign}{delta.toFixed(1)}%
    </span>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

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

// ── YieldBar ──────────────────────────────────────────────────────────────────

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
        <div style={{ fontSize: 22, fontWeight: 700, color: '#27ae60' }}>
          {surplus}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Регионов с профицитом
        </div>
      </div>
      <div className="card card-padding" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: deficit > 0 ? '#e74c3c' : 'var(--color-text-muted)' }}>
          {deficit}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Регионов с дефицитом
          {topRegion && (
            <div style={{ color: '#27ae60', marginTop: 2 }}>{topRegion.region_name.replace(' область', ' обл.')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Map component ─────────────────────────────────────────────────────────────

interface RegionMapProps {
  geojson: any
  regionData: Map<string, RegionForecastItem>
  mode: MapMode
  yieldRange: [number, number]
  priceRange: [number, number]
  onRegionClick: (item: RegionForecastItem) => void
  selectedCode: string | null
  favorites: Set<string>
}

function RegionMap({ geojson, regionData, mode, yieldRange, priceRange, onRegionClick, selectedCode }: RegionMapProps) {
  const geoRef = useRef<L.GeoJSON | null>(null)

  const getColor = useCallback((item: RegionForecastItem | undefined): string => {
    if (!item) return '#cccccc'
    if (mode === 'yield') return yieldColor(item.yield_pred, yieldRange[0], yieldRange[1])
    if (mode === 'price') return item.price_pred !== null ? priceColor(item.price_pred, priceRange[0], priceRange[1]) : '#cccccc'
    return SIGNAL_COLOR[item.signal] ?? '#cccccc'
  }, [mode, yieldRange, priceRange])

  const style = useCallback((feature: any) => {
    const iso = (feature?.properties?.iso_3166_2 ?? '') as string
    const isoSuffix = iso.includes('-') ? iso.split('-')[1] : iso
    const item = regionData.get(isoSuffix)
    const isSelected = selectedCode === isoSuffix
    const color = getColor(item)
    return {
      fillColor: color,
      fillOpacity: isSelected ? 0.85 : 0.55,
      color: isSelected ? '#ffffff' : '#666',
      weight: isSelected ? 2.5 : 0.8,
    }
  }, [regionData, getColor, selectedCode])

  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    const iso = (feature?.properties?.iso_3166_2 ?? '') as string
    const isoSuffix = iso.includes('-') ? iso.split('-')[1] : iso
    const item = regionData.get(isoSuffix)
    const name = item?.region_name ?? feature?.properties?.name_ru ?? feature?.properties?.name ?? isoSuffix

    layer.on({
      click: () => { if (item) onRegionClick(item) },
      mouseover: (e: any) => {
        e.target.setStyle({ fillOpacity: 0.85, weight: 2 })
        e.target.bindTooltip(
          `<b>${name}</b><br/>${item ? `${item.yield_pred.toFixed(1)} ц/га` : 'Нет данных'}`,
          { sticky: true }
        ).openTooltip()
      },
      mouseout: (e: any) => { geoRef.current?.resetStyle(e.target) },
    })
  }, [regionData, onRegionClick])

  useEffect(() => {
    if (geoRef.current) geoRef.current.setStyle(style)
  }, [style])

  if (!geojson) return null
  return (
    <GeoJSON
      key={`${mode}-${selectedCode}`}
      data={geojson}
      style={style}
      onEachFeature={onEachFeature}
      ref={geoRef}
    />
  )
}

// ── SortTh ───────────────────────────────────────────────────────────────────

function SortTh({ label, k, sortKey, sortDesc, onSort }: {
  label: string
  k: SortKey
  sortKey: SortKey
  sortDesc: boolean
  onSort: (k: SortKey) => void
}) {
  const active = sortKey === k
  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      onClick={() => onSort(k)}
    >
      {label} {active ? (sortDesc ? '↓' : '↑') : ''}
    </th>
  )
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchRegions(crop: string, year: number): Promise<RegionForecastResponse> {
  const today = new Date().toISOString().slice(0, 10)
  let perRegionWeather: Record<string, import('../services/mlService').RegionWeatherItem> | undefined
  if (year > 2024) {
    const { loadRegionCoords, fetchAllRegionWeather } = await import('../services/regionWeatherService')
    const coords = await loadRegionCoords()
    const regionCodes = Object.keys(coords)
    perRegionWeather = await fetchAllRegionWeather(regionCodes, year, coords)
  }
  const { data } = await api.post<RegionForecastResponse>(
    '/yield/regions',
    { crop, year, as_of_date: today, per_region_weather: perRegionWeather },
    { timeout: 60000 },
  )
  return data
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const currentYear = new Date().getFullYear()
  const [viewTab, setViewTab] = useState<ViewTab>('map')
  const [crop, setCrop] = useState('spring_wheat')
  const [year, setYear] = useState(currentYear)
  const [yearStr, setYearStr] = useState(String(currentYear))
  const [data, setData] = useState<RegionForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Map state
  const [mode, setMode] = useState<MapMode>('yield')
  const [geojson, setGeojson] = useState<any>(null)
  const [geojsonLoading, setGeojsonLoading] = useState(true)
  const [selected, setSelected] = useState<RegionForecastItem | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('region_favorites') ?? '[]')) }
    catch { return new Set() }
  })

  // Table state
  const [sortKey, setSortKey] = useState<SortKey>('yield_pred')
  const [sortDesc, setSortDesc] = useState(true)
  const [signalFilter, setSignalFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/russia_regions.geojson')
      .then(r => r.json())
      .then(d => setGeojson(d))
      .catch(() => setGeojson(null))
      .finally(() => setGeojsonLoading(false))
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchRegions(crop, year)
      setData(res)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Ошибка ML-сервиса')
    } finally {
      setLoading(false)
    }
  }

  // Не загружаем автоматически — пользователь нажимает "Построить прогноз"

  const toggleFav = (code: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      localStorage.setItem('region_favorites', JSON.stringify([...next]))
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(true) }
  }

  const regionMap: Map<string, RegionForecastItem> = new Map(
    (data?.regions ?? []).map((r): [string, RegionForecastItem] => [r.region_code, r])
  )

  const yieldVals = (data?.regions ?? []).map(r => r.yield_pred).filter(v => v > 0) as number[]
  const priceVals = (data?.regions ?? []).map(r => r.price_pred).filter((v): v is number => v != null && v > 0)
  const yieldRange: [number, number] = yieldVals.length ? [Math.min(...yieldVals), Math.max(...yieldVals)] : [0, 1]
  const priceRange: [number, number] = priceVals.length ? [Math.min(...priceVals), Math.max(...priceVals)] : [0, 1]
  const maxYield = useMemo(() => { const vals = data?.regions.map(r => r.yield_pred) ?? []; return vals.length ? Math.max(...vals) : 1 }, [data])

  const filteredTable = useMemo(() => {
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

  const avgYield = data ? (data.regions.reduce((s, r) => s + r.yield_pred, 0) / data.regions.length) : null
  const priceRegions = data ? data.regions.filter(r => r.price_pred != null && r.price_pred > 0) : []
  const avgPrice = priceRegions.length > 0 ? (priceRegions.reduce((s, r) => s + r.price_pred!, 0) / priceRegions.length) : null
  const cropLabel = CROP_OPTIONS.find(c => c.code === crop)?.label ?? crop

  return (
    <div>
      <div className="page-header-bar">
        <h1 className="page-title">Рынок регионов</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {data && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: data.is_forecast_year ? 'var(--color-primary-light)' : 'var(--color-info-light)',
              color: data.is_forecast_year ? 'var(--color-primary)' : 'var(--color-info)',
            }}>
              {data.is_forecast_year ? '🔮 Прогноз ML' : '📊 Реальные данные'}
            </span>
          )}
          {data?.cached && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>из кэша (1 ч)</span>
          )}
        </div>
      </div>

      {/* Фильтры */}
      <div className="card card-padding mb-20">
        <div className="market-filters-row">
          <div className="market-filters-top">
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Культура</label>
              <select className="input" value={crop} onChange={e => setCrop(e.target.value)}>
                {CROP_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Год</label>
              <input
                type="number" className="input" value={yearStr}
                onChange={e => setYearStr(e.target.value)}
                onBlur={e => { const v = Math.min(2027, Math.max(2024, Number(e.target.value) || year)); setYear(v); setYearStr(String(v)) }}
                min={2024} max={2027}
              />
            </div>
            <button className="btn btn-primary market-build-btn" onClick={load} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <BarChart3 size={16} />}
              Построить прогноз
            </button>
            {data && (
              <button className="btn btn-ghost" onClick={load} disabled={loading} title="Обновить">
                <RefreshCw size={15} />
              </button>
            )}
          </div>

          {/* Вкладки Карта / Таблица */}
          <div style={{ display: 'flex', gap: 4, border: '1px solid var(--color-border)', borderRadius: 8, padding: 3 }}>
            {([
              { key: 'map',   icon: <MapIcon size={14} />,    label: 'Карта' },
              { key: 'table', icon: <Table2 size={14} />, label: 'Таблица' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setViewTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: 'pointer',
                  background: viewTab === t.key ? 'var(--color-primary)' : 'transparent',
                  color: viewTab === t.key ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
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
          <SummaryCards regions={data.regions} />

          {/* ═══ ВИД: КАРТА ═══ */}
          {viewTab === 'map' && (
            <>
              <div className="card card-padding mb-16" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>Режим:</span>
                {(['yield', 'price', 'signal'] as MapMode[]).map(m => (
                  <button
                    key={m}
                    className={`btn ${mode === m ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setMode(m)}
                  >
                    {m === 'yield' ? 'Урожайность' : m === 'price' ? 'Цена' : 'Сигнал'}
                  </button>
                ))}
              </div>

              <div className="market-map-grid" style={{ marginBottom: 20 }}>
                <div className="card market-map-card" style={{ overflow: 'hidden' }}>
                  {geojsonLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--color-text-muted)' }}>
                      <Loader2 size={20} className="spin" /> Загрузка карты…
                    </div>
                  ) : (
                    <MapContainer center={[61.5240, 105.3188]} zoom={3} style={{ height: '100%', width: '100%' }} zoomControl>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM contributors" />
                      {geojson && (
                        <RegionMap
                          geojson={geojson}
                          regionData={regionMap}
                          mode={mode}
                          yieldRange={yieldRange}
                          priceRange={priceRange}
                          onRegionClick={setSelected}
                          selectedCode={selected?.region_code ?? null}
                          favorites={favorites}
                        />
                      )}
                    </MapContainer>
                  )}
                </div>

                <div className="card card-padding market-side-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                  {avgYield !== null && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ background: 'var(--color-bg-subtle)', borderRadius: 6, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>Ср. урожайность</div>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{avgYield.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400 }}>ц/га</span></div>
                      </div>
                      <div style={{ background: 'var(--color-bg-subtle)', borderRadius: 6, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>Ср. цена</div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{avgPrice ? Math.round(avgPrice).toLocaleString('ru-RU') : '—'} <span style={{ fontSize: 11, fontWeight: 400 }}>₽/т</span></div>
                      </div>
                    </div>
                  )}

                  {selected ? (
                    <div style={{ border: '2px solid var(--color-primary)', borderRadius: 8, padding: 12, background: 'var(--color-bg-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.region_name}</div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleFav(selected.region_code)}
                          title={favorites.has(selected.region_code) ? 'Убрать из избранного' : 'В избранное'}
                        >
                          {favorites.has(selected.region_code) ? <Star size={14} fill="currentColor" color="#f39c12" /> : <StarOff size={14} />}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Прогноз:</span> <strong>{selected.yield_pred.toFixed(1)} ц/га</strong></div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Ср. за 5 лет:</span> <strong>{fmtN(selected.yield_ma5)} ц/га</strong></div>
                        <div><span style={{ color: 'var(--color-text-muted)' }}>Цена:</span> <strong>{fmtPrice(selected.price_pred)}</strong></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Δ к норме:</span> {deltaBadge(selected.delta_pct)}
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <span>{SIGNAL_EMOJI[selected.signal]}</span>
                        <span style={{ fontWeight: 600, color: SIGNAL_COLOR[selected.signal] }}>{SIGNAL_LABEL[selected.signal]}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, padding: '20px 0' }}>
                      <Info size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                      Кликните на регион на карте
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Легенда сигналов</div>
                    {(['SURPLUS', 'NEUTRAL', 'DEFICIT'] as const).map(s => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 3 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: SIGNAL_COLOR[s], display: 'inline-block' }} />
                        <span style={{ color: 'var(--color-text-muted)' }}>{SIGNAL_LABEL[s]}</span>
                        {s === 'SURPLUS' && <span style={{ color: 'var(--color-text-muted)' }}>— Δ &gt; +15%</span>}
                        {s === 'NEUTRAL' && <span style={{ color: 'var(--color-text-muted)' }}>— Δ ±15%</span>}
                        {s === 'DEFICIT' && <span style={{ color: 'var(--color-text-muted)' }}>— Δ &lt; −15%</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ ВИД: ТАБЛИЦА ═══ */}
          {viewTab === 'table' && (
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

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Регион</th>
                      <SortTh label="Урожайность" k="yield_pred" sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />
                      <SortTh label="Δ от нормы" k="delta_pct" sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />
                      <SortTh label={`Цена (${harvestLabel(crop, year)})`} k="price_pred" sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />
                      <SortTh label="Пос. площадь, тыс.га" k="sown_area_thou_ha" sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />
                      <th>Сигнал</th>
                      <th>★</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTable.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>Нет данных</td>
                      </tr>
                    )}
                    {filteredTable.map((r, idx) => (
                      <tr key={r.region_code}>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>
                            {favorites.has(r.region_code) && <Star size={11} fill="#f39c12" color="#f39c12" style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                            {r.region_name}
                          </div>
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
                        <td style={{ fontWeight: r.price_pred ? 600 : 400 }}>{fmtPrice(r.price_pred)}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{fmt(r.sown_area_thou_ha, 'тыс.га', 0)}</td>
                        <td><SignalBadge signal={r.signal} /></td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 4px' }}
                            onClick={() => toggleFav(r.region_code)}
                          >
                            {favorites.has(r.region_code)
                              ? <Star size={13} fill="#f39c12" color="#f39c12" />
                              : <StarOff size={13} color="var(--color-text-muted)" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
                  <b>Цена</b> — прогноз на месяц уборки урожая ({harvestLabel(crop, year)}). LightGBM · LOYO CV R²=0.93, MAPE=5.4%
                </div>
              </div>
            </div>
          )}
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
