import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { Loader2, RefreshCw, Star, StarOff, Info } from 'lucide-react'
import { api } from '../services/api'
import 'leaflet/dist/leaflet.css'

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

type MapMode = 'yield' | 'price' | 'signal'

// ── Constants ─────────────────────────────────────────────────────────────────

const CROP_OPTIONS = [
  { code: 'spring_wheat',  label: 'Пшеница яровая' },
  { code: 'winter_wheat',  label: 'Пшеница озимая' },
  { code: 'spring_barley', label: 'Ячмень яровой' },
  { code: 'corn',          label: 'Кукуруза' },
  { code: 'sunflower',     label: 'Подсолнечник' },
  { code: 'soybean',       label: 'Соя' },
  { code: 'rapeseed',      label: 'Рапс' },
  { code: 'peas',          label: 'Горох' },
]

const SIGNAL_COLOR: Record<string, string> = {
  SURPLUS: '#27ae60',
  NEUTRAL: '#f39c12',
  DEFICIT: '#e74c3c',
  UNKNOWN: '#95a5a6',
}

const SIGNAL_LABEL: Record<string, string> = {
  SURPLUS: 'Избыток',
  NEUTRAL: 'Нейтрально',
  DEFICIT: 'Дефицит',
  UNKNOWN: 'Нет данных',
}

const SIGNAL_EMOJI: Record<string, string> = {
  SURPLUS: '�',
  NEUTRAL: '🟨',
  DEFICIT: '�',
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

function fmt(n: number | null, decimals = 1): string {
  if (n === null) return '—'
  return n.toFixed(decimals)
}

function fmtPrice(n: number | null): string {
  if (n === null) return '—'
  return Math.round(n).toLocaleString('ru-RU') + ' ₽/т'
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

// ── Service ───────────────────────────────────────────────────────────────────

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

function RegionMap({ geojson, regionData, mode, yieldRange, priceRange, onRegionClick, selectedCode, favorites }: RegionMapProps) {
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
      mouseout: (e: any) => {
        geoRef.current?.resetStyle(e.target)
      },
    })
  }, [regionData, onRegionClick])

  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.setStyle(style)
    }
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RegionForecastPage() {
  const [crop, setCrop] = useState('spring_wheat')
  const [year, setYear] = useState(new Date().getFullYear())
  const [yearStr, setYearStr] = useState(String(new Date().getFullYear()))
  const [mode, setMode] = useState<MapMode>('yield')
  const [data, setData] = useState<RegionForecastResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geojson, setGeojson] = useState<any>(null)
  const [geojsonLoading, setGeojsonLoading] = useState(true)
  const [selected, setSelected] = useState<RegionForecastItem | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('region_favorites') ?? '[]')) }
    catch { return new Set() }
  })
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/russia_regions.geojson')
      .then(r => r.json())
      .then(d => setGeojson(d))
      .catch(() => setGeojson(null))
      .finally(() => setGeojsonLoading(false))
  }, [])

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const res = await fetchRegions(crop, year)
      setData(res)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  const toggleFav = (code: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      localStorage.setItem('region_favorites', JSON.stringify([...next]))
      return next
    })
  }

  const regionMap = new Map<string, RegionForecastItem>(
    (data?.regions ?? []).map(r => [r.region_code, r])
  )

  const yieldVals = (data?.regions ?? []).map(r => r.yield_pred).filter(Boolean) as number[]
  const priceVals = (data?.regions ?? []).map(r => r.price_pred).filter(Boolean) as number[]
  const yieldRange: [number, number] = [Math.min(...yieldVals, 0), Math.max(...yieldVals, 1)]
  const priceRange: [number, number] = [Math.min(...priceVals, 0), Math.max(...priceVals, 1)]

  const filteredRegions = (data?.regions ?? []).filter(r =>
    r.region_name.toLowerCase().includes(search.toLowerCase())
  )

  const avgYield = data ? (data.regions.reduce((s, r) => s + r.yield_pred, 0) / data.regions.length) : null
  const avgPrice = data ? (data.regions.reduce((s, r) => s + (r.price_pred ?? 0), 0) / data.regions.filter(r => r.price_pred).length) : null

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Прогноз регионов</h1>
          <p className="page-subtitle">Геопространственный анализ урожайности и цен по регионам России</p>
        </div>
      </div>

      {/* Фильтры */}
      <div className="card card-padding mb-20">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Культура</label>
            <select className="input" value={crop} onChange={e => setCrop(e.target.value)}>
              {CROP_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--color-text-muted)' }}>Год</label>
            <input type="number" className="input" value={yearStr} min={2022} max={2030}
              onChange={e => setYearStr(e.target.value)}
              onBlur={e => { const v = Math.min(2030, Math.max(2022, Number(e.target.value) || year)); setYear(v); setYearStr(String(v)) }} />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Загрузить прогноз
          </button>
          {data && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
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
          )}
        </div>
      </div>

      {error && (
        <div className="card card-padding mb-20" style={{ borderLeft: '3px solid var(--color-danger)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Карта + боковая панель */}
      <div style={{ display: 'grid', gridTemplateColumns: data ? '1fr 340px' : '1fr', gap: 16, marginBottom: 16 }}>
        {/* Карта */}
        <div className="card" style={{ overflow: 'hidden', height: 520 }}>
          {geojsonLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: 'var(--color-text-muted)' }}>
              <Loader2 size={20} className="spin" /> Загрузка карты…
            </div>
          ) : (
            <MapContainer
              center={[61.5240, 105.3188]}
              zoom={3}
              style={{ height: '100%', width: '100%' }}
              zoomControl
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OSM contributors"
              />
              {geojson && data && (
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
              {!data && geojson && (
                <GeoJSON
                  data={geojson}
                  style={{ fillColor: '#dde', fillOpacity: 0.4, color: '#999', weight: 0.8 }}
                />
              )}
            </MapContainer>
          )}
        </div>

        {/* Всплывающая панель выбранного региона */}
        {data && (
          <div className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 520, overflowY: 'auto' }}>
            {/* Сводка */}
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

            {/* Выбранный регион */}
            {selected && (
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
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Прогноз:</span>{' '}
                    <strong>{selected.yield_pred.toFixed(1)} ц/га</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Ср. за 5 лет:</span>{' '}
                    <strong>{fmt(selected.yield_ma5)} ц/га</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Цена:</span>{' '}
                    <strong>{fmtPrice(selected.price_pred)}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Δ к норме:</span>{' '}
                    {deltaBadge(selected.delta_pct)}
                  </div>
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <span>{SIGNAL_EMOJI[selected.signal]}</span>
                  <span style={{ fontWeight: 600, color: SIGNAL_COLOR[selected.signal] }}>
                    {SIGNAL_LABEL[selected.signal]}
                  </span>
                </div>
              </div>
            )}

            {!selected && (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, padding: '20px 0' }}>
                <Info size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                Кликните на регион на карте
              </div>
            )}

            {/* Легенда */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Сигнал рынка</div>
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
        )}
      </div>

      {/* Таблица регионов */}
      {data && (
        <div className="card card-padding">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              Все регионы ({data.regions.length})
              {data.cached && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>из кэша</span>}
            </div>
            <input
              className="input"
              style={{ width: 220 }}
              placeholder="Поиск региона…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Регион</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Прогноз ц/га</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Ср. за 5 лет, ц/га</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Δ к норме</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Цена ₽/т</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Сигнал</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>★</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegions.map(r => (
                  <tr
                    key={r.region_code}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      background: selected?.region_code === r.region_code ? 'var(--color-bg-subtle)' : undefined,
                    }}
                    onClick={() => setSelected(r)}
                  >
                    <td style={{ padding: '7px 8px', fontWeight: 500 }}>
                      {favorites.has(r.region_code) && <Star size={11} fill="#f39c12" color="#f39c12" style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                      {r.region_name}
                    </td>
                    <td style={{ padding: '7px 8px', fontWeight: 600 }}>{r.yield_pred.toFixed(1)}</td>
                    <td style={{ padding: '7px 8px', color: 'var(--color-text-muted)' }}>{fmt(r.yield_ma5)}</td>
                    <td style={{ padding: '7px 8px' }}>{deltaBadge(r.delta_pct)}</td>
                    <td style={{ padding: '7px 8px' }}>{r.price_pred ? Math.round(r.price_pred).toLocaleString('ru-RU') : '—'}</td>
                    <td style={{ padding: '7px 8px' }}>
                      <span style={{ color: SIGNAL_COLOR[r.signal], fontWeight: 600 }}>
                        {SIGNAL_EMOJI[r.signal]} {SIGNAL_LABEL[r.signal]}
                      </span>
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 4px' }}
                        onClick={e => { e.stopPropagation(); toggleFav(r.region_code) }}
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
        </div>
      )}

      {!data && !loading && !error && (
        <div className="card card-padding" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Выберите культуру и год</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6, maxWidth: 400, margin: '6px auto 0' }}>
            Карта окрасит регионы по прогнозной урожайности (ML-модель),
            таблица покажет цены и рыночные сигналы для каждого региона
          </div>
        </div>
      )}
    </div>
  )
}
